/**
 * server.js — Vansh Enterprises website backend
 * ------------------------------------------------
 * Run:  npm install express  (first time only)
 *       node server.js
 *
 * Listens on:  http://localhost:3000   (change PORT below)
 * Leads saved: leads.json  (in this same folder)
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;           // ← change port here if needed
const LEADS_FILE = path.join(__dirname, 'leads.json');

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));              // serves index.html, CSS, JS, logo

// ─── POST /api/contact — Contact / RFQ form submissions ───────────────────────
app.post('/api/contact', (req, res) => {
  const {
    fullName,
    company,
    email,
    phone,
    location,
    category,
    requirementType,
    orderQuantity,
    message,
    consent
  } = req.body;

  // ── Server-side validation ─────────────────────────────────────────────────
  if (!fullName || !company || !email || !consent) {
    return res.status(400).json({
      success: false,
      error: 'Required fields missing: fullName, company, email and consent are all required.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address.' });
  }

  // ── Build lead object with timestamp ──────────────────────────────────────
  const lead = {
    timestamp:       new Date().toISOString(),
    fullName:        fullName.trim(),
    company:         company.trim(),
    email:           email.trim().toLowerCase(),
    phone:           (phone        || '').trim(),
    location:        (location     || '').trim(),
    category:        (category     || '').trim(),
    requirementType: (requirementType || '').trim(),
    orderQuantity:   (orderQuantity  || '').trim(),
    message:         (message       || '').trim(),
    consent:         Boolean(consent)
  };

  // ── Read → append → write leads.json ──────────────────────────────────────
  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try {
      leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    } catch (_) {
      leads = [];   // file was corrupt — start fresh
    }
  }

  leads.push(lead);

  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
  } catch (err) {
    console.error('[ERROR] Could not write leads.json:', err.message);
    return res.status(500).json({ success: false, error: 'Server error — please try again.' });
  }

  // ── Console log for monitoring ─────────────────────────────────────────────
  console.log(
    `[LEAD] ${lead.timestamp} | ${lead.fullName} <${lead.email}> | ` +
    `${lead.company} | ${lead.requirementType || 'General'} | ${lead.category || '—'}`
  );

  return res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✔  Vansh Enterprises site running at http://localhost:${PORT}`);
  console.log(`   Leads will be saved to: ${LEADS_FILE}`);
});
