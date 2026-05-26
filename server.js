'use strict';
const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const nodemailer = require('nodemailer');
const cron       = require('node-cron');
const { sendDailyReport } = require('./analytics-report');

const app  = express();
const PORT = process.env.PORT || 3000;
const LEADS_FILE   = path.join(__dirname, 'leads.json');
const NOTIFY_EMAIL = 'enquiries@vanshenterprises.net';

// ── In-memory rate limit (resets on restart) ──────────────────────────────
const rateMap = new Map();
const RATE_LIMIT  = 3;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRate(ip) {
  const now = Date.now();
  const rec = rateMap.get(ip);
  if (!rec || now > rec.resetAt) { rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (rec.count >= RATE_LIMIT)   return false;
  rec.count++;
  return true;
}
setInterval(() => { const n = Date.now(); for (const [k,v] of rateMap) if (n > v.resetAt) rateMap.delete(k); }, 7200000);

// ── Email transporter (Namecheap Private Email) ───────────────────────────
const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function buildEmail(lead) {
  const r = (l, v) => v ? `<tr><td style="padding:8px 12px;width:150px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #e5e7eb">${l}</td><td style="padding:8px 12px;color:#1c1c1e;border-bottom:1px solid #e5e7eb">${v}</td></tr>` : '';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#f3f4f6">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)">
<div style="background:#085B20;padding:24px 32px"><h1 style="margin:0;color:#fff;font-size:20px">New RFQ Enquiry</h1><p style="margin:4px 0 0;color:#41E296;font-size:13px">Vansh Enterprises — vanshenterprises.net</p></div>
<div style="padding:24px 32px">
<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">${r('Name',lead.fullName)}${r('Company',lead.company)}${r('Email',`<a href="mailto:${lead.email}">${lead.email}</a>`)}${r('Phone',lead.phone)}${r('Location',lead.location)}${r('Category',lead.category)}${r('Requirement',lead.requirementType)}${r('Quantity',lead.orderQuantity)}${r('Target Delivery',lead.targetDelivery)}</table>
${lead.message?`<div style="margin-top:16px;padding:16px;background:#f0faf4;border-radius:6px;border-left:3px solid #085B20"><p style="margin:0 0 6px;font-weight:600;color:#085B20">Message</p><p style="margin:0;color:#1c1c1e;white-space:pre-wrap">${lead.message}</p></div>`:''}
<div style="margin-top:20px"><a href="mailto:${lead.email}?subject=Re: Your enquiry at Vansh Enterprises" style="background:#085B20;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Reply to ${lead.fullName}</a></div>
</div>
<div style="padding:12px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">Submitted ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST · Lead ID: ${lead.id}</div>
</div></body></html>`;
}

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Long-lived cache for static assets
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (['.jpg','.jpeg','.png','.webp','.avif','.gif','.svg','.ico','.woff','.woff2'].includes(ext))
    res.set('Cache-Control','public,max-age=31536000,immutable');
  else if (['.css','.js'].includes(ext))
    res.set('Cache-Control','public,max-age=86400');
  next();
});

// Serve static files; clean URLs (no .html needed)
app.use(express.static(path.join(__dirname), { extensions: ['html'], index: 'index.html' }));

// ── POST /api/contact ─────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket.remoteAddress || '0.0.0.0';

  // Honeypot
  if (req.body.website) return res.json({ success: true });

  // Rate limit
  if (!checkRate(ip)) return res.status(429).json({ success: false, error: 'Too many submissions. Please try again later.' });

  const { fullName, company, email, phone, location, category, requirementType, orderQuantity, targetDelivery, message, consent } = req.body;

  // Validate
  if (!fullName?.trim() || !company?.trim() || !email?.trim() || !consent)
    return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });

  const lead = {
    id:              Date.now().toString(36) + Math.random().toString(36).slice(2,5),
    fullName:        fullName.trim(),
    company:         company.trim(),
    email:           email.trim().toLowerCase(),
    phone:           (phone||'').trim(),
    location:        (location||'').trim(),
    category:        category||'',
    requirementType: requirementType||'',
    orderQuantity:   (orderQuantity||'').trim(),
    targetDelivery:  (targetDelivery||'').trim(),
    message:         (message||'').trim(),
    ip,
    submittedAt:     new Date().toISOString()
  };

  // 1. Save lead immediately
  try {
    let leads = [];
    if (fs.existsSync(LEADS_FILE)) try { leads = JSON.parse(fs.readFileSync(LEADS_FILE,'utf8')); } catch {}
    leads.push(lead);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads,null,2));
    console.log(`[LEAD] ${lead.submittedAt} | ${lead.fullName} <${lead.email}> | ${lead.company}`);
  } catch (e) { console.error('[LEAD SAVE]', e.message); }

  // 2. Respond immediately — don't make user wait for email
  res.json({ success: true });

  // 3. Send email in background (non-blocking)
  transporter.sendMail({
    from:    `"Vansh Enterprises Website" <${process.env.EMAIL_USER||NOTIFY_EMAIL}>`,
    to:      NOTIFY_EMAIL,
    replyTo: lead.email,
    subject: `New RFQ: ${lead.company} — ${lead.category||lead.requirementType||'Enquiry'}`,
    html:    buildEmail(lead)
  }).catch(e => console.error('[EMAIL]', e.message));
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname,'404.html'), e => {
    if (e) res.status(404).send('<h1>404 — Page Not Found</h1><p><a href="/">Return home</a></p>');
  });
});

app.listen(PORT, () => {
  console.log(`Vansh Enterprises → http://localhost:${PORT}`);
  console.log(`Enquiries email  → ${NOTIFY_EMAIL}`);
  console.log(`Leads backup     → ${LEADS_FILE}`);

  // ── Daily analytics report — 11:00 AM IST every day ──────────────────────
  cron.schedule('0 11 * * *', () => {
    sendDailyReport(transporter).catch(e => console.error('[ANALYTICS CRON]', e.message));
  }, { timezone: 'Asia/Kolkata' });
  console.log('Analytics report → scheduled daily at 11:00 AM IST → ankush@vanshenterprises.net');
});
