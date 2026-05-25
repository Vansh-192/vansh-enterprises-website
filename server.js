/**
 * server.js — Vansh Enterprises website backend
 * ------------------------------------------------
 * Run:  npm install          (first time only)
 *       node server.js
 *
 * Listens on:  http://localhost:3000
 * Leads saved: leads.json  (backup)
 * Leads emailed: enquiries@vanshenterprises.net
 *
 * Required environment variables (set in Railway dashboard):
 *   GMAIL_USER  — your Gmail address (e.g. yourname@gmail.com)
 *   GMAIL_PASS  — Gmail App Password (16-char, NOT your regular password)
 */

const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;
const LEADS_FILE    = path.join(__dirname, 'leads.json');
const NOTIFY_EMAIL  = 'enquiries@vanshenterprises.net';

// ─── Email Transporter (Gmail) ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,   // set in Railway env vars
    pass: process.env.GMAIL_PASS,   // Gmail App Password (not regular password)
  }
});

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));

// ─── POST /api/contact — Contact / RFQ form submissions ───────────────────────
app.post('/api/contact', async (req, res) => {
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

  // ── Build lead object ─────────────────────────────────────────────────────
  const lead = {
    timestamp:       new Date().toISOString(),
    fullName:        fullName.trim(),
    company:         company.trim(),
    email:           email.trim().toLowerCase(),
    phone:           (phone           || '').trim(),
    location:        (location        || '').trim(),
    category:        (category        || '').trim(),
    requirementType: (requirementType || '').trim(),
    orderQuantity:   (orderQuantity   || '').trim(),
    message:         (message         || '').trim(),
    consent:         Boolean(consent)
  };

  // ── Save to leads.json (backup) ───────────────────────────────────────────
  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try { leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
    catch (_) { leads = []; }
  }
  leads.push(lead);
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
  } catch (err) {
    console.error('[ERROR] Could not write leads.json:', err.message);
  }

  // ── Send email notification ───────────────────────────────────────────────
  const receivedAt = new Date(lead.timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1a1a2e; color: #ffffff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #aaaacc; }
    .body { padding: 28px 32px; }
    .badge { display: inline-block; background: #e8f0fe; color: #1a1a2e; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 4px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; vertical-align: top; }
    td:first-child { color: #888888; width: 40%; font-size: 13px; }
    td:last-child { color: #1a1a2e; font-weight: 500; }
    .message-box { background: #f8f8f8; border-left: 3px solid #1a1a2e; padding: 14px 16px; margin-top: 20px; border-radius: 0 4px 4px 0; font-size: 14px; color: #333; line-height: 1.6; }
    .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #999999; text-align: center; }
    .reply-btn { display: inline-block; margin-top: 20px; background: #1a1a2e; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-size: 14px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>VANSH ENTERPRISES</h1>
      <p>New Enquiry / RFQ Received</p>
    </div>
    <div class="body">
      <div class="badge">New Lead · ${receivedAt}</div>
      <table>
        <tr><td>Full Name</td><td>${lead.fullName}</td></tr>
        <tr><td>Company / Brand</td><td>${lead.company}</td></tr>
        <tr><td>Email</td><td><a href="mailto:${lead.email}">${lead.email}</a></td></tr>
        <tr><td>Phone</td><td>${lead.phone || '—'}</td></tr>
        <tr><td>City / Country</td><td>${lead.location || '—'}</td></tr>
        <tr><td>Category</td><td>${lead.category || '—'}</td></tr>
        <tr><td>Requirement Type</td><td>${lead.requirementType || '—'}</td></tr>
        <tr><td>Order Quantity</td><td>${lead.orderQuantity || '—'}</td></tr>
      </table>

      ${lead.message ? `
      <p style="margin: 20px 0 6px; font-size: 13px; color: #888;">Message / Brief</p>
      <div class="message-box">${lead.message.replace(/\n/g, '<br>')}</div>
      ` : ''}

      <div style="text-align:center;">
        <a href="mailto:${lead.email}?subject=Re: Your enquiry at Vansh Enterprises" class="reply-btn">
          Reply to ${lead.fullName}
        </a>
      </div>
    </div>
    <div class="footer">
      This enquiry was submitted via vanshenterprises.net &nbsp;·&nbsp; Vansh Enterprises, Noida
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    await transporter.sendMail({
      from:    `"Vansh Enterprises Website" <${process.env.GMAIL_USER}>`,
      to:      NOTIFY_EMAIL,
      replyTo: lead.email,
      subject: `New RFQ: ${lead.company} — ${lead.requirementType || 'General Enquiry'}`,
      html:    htmlBody,
    });
    console.log(`[EMAIL SENT] → ${NOTIFY_EMAIL} | from ${lead.fullName} <${lead.email}>`);
  } catch (emailErr) {
    // Don't fail the request if email fails — lead is already saved to file
    console.error('[EMAIL ERROR]', emailErr.message);
  }

  // ── Console log ───────────────────────────────────────────────────────────
  console.log(
    `[LEAD] ${lead.timestamp} | ${lead.fullName} <${lead.email}> | ` +
    `${lead.company} | ${lead.requirementType || 'General'} | ${lead.category || '—'}`
  );

  return res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✔  Vansh Enterprises site running at http://localhost:${PORT}`);
  console.log(`   Enquiries will be emailed to: ${NOTIFY_EMAIL}`);
  console.log(`   Leads backup: ${LEADS_FILE}`);
});
