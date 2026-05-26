'use strict';

/**
 * analytics-report.js
 * Daily GA4 analytics report — fetches data from Google Analytics Data API
 * and emails a branded HTML report to ankush@vanshenterprises.net at 11 AM IST.
 *
 * Required env vars (set in Railway Variables tab):
 *   GA4_PROPERTY_ID     — numeric property ID from GA4 Admin → Property Settings
 *   GA_SERVICE_ACCOUNT  — base64-encoded service account JSON (see README below)
 *   REPORT_EMAIL        — recipient email (default: ankush@vanshenterprises.net)
 */

const fs   = require('fs');
const path = require('path');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const REPORT_TO   = process.env.REPORT_EMAIL || 'ankush@vanshenterprises.net';
const LEADS_FILE  = path.join(__dirname, 'leads.json');

// ── GA4 client ────────────────────────────────────────────────────────────────
function getGA4Client() {
  const { BetaAnalyticsDataClient } = require('@google-analytics/data');
  if (!process.env.GA_SERVICE_ACCOUNT) throw new Error('GA_SERVICE_ACCOUNT env var not set.');
  let creds;
  try   { creds = JSON.parse(Buffer.from(process.env.GA_SERVICE_ACCOUNT, 'base64').toString('utf8')); }
  catch { creds = JSON.parse(process.env.GA_SERVICE_ACCOUNT); }
  return new BetaAnalyticsDataClient({ credentials: creds });
}

async function runReport(client, params) {
  const [res] = await client.runReport({ property: `properties/${PROPERTY_ID}`, ...params });
  return res;
}

function mv(row, i) { return parseFloat(row?.metricValues?.[i]?.value || '0'); }
function iv(row, i) { return parseInt(row?.metricValues?.[i]?.value  || '0', 10); }

// ── Fetch all GA4 metrics ─────────────────────────────────────────────────────
async function fetchGA4Data() {
  if (!PROPERTY_ID) throw new Error('GA4_PROPERTY_ID env var not set.');
  const client = getGA4Client();

  const [ydayRes, weekRes, topPagesRes, sourcesRes, countriesRes, devicesRes] = await Promise.all([

    // Yesterday — overview metrics
    runReport(client, {
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'newUsers' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
      ],
    }),

    // Last 7 days — overview metrics
    runReport(client, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'newUsers' },
      ],
    }),

    // Top pages — last 7 days
    runReport(client, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    }),

    // Traffic sources — last 7 days
    runReport(client, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 6,
    }),

    // Top countries — last 7 days
    runReport(client, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    }),

    // Device categories — last 7 days
    runReport(client, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
  ]);

  const yr = ydayRes.rows?.[0];
  const wr = weekRes.rows?.[0];

  return {
    yesterday: {
      sessions:        mv(yr, 0),
      users:           mv(yr, 1),
      pageviews:       mv(yr, 2),
      newUsers:        mv(yr, 3),
      avgDuration:     mv(yr, 4),
      engagementRate:  mv(yr, 5),
    },
    week: {
      sessions:  mv(wr, 0),
      users:     mv(wr, 1),
      pageviews: mv(wr, 2),
      newUsers:  mv(wr, 3),
    },
    topPages: (topPagesRes.rows || []).map(r => ({
      path:  r.dimensionValues[0].value,
      views: iv(r, 0),
      users: iv(r, 1),
    })),
    sources: (sourcesRes.rows || []).map(r => ({
      channel:  r.dimensionValues[0].value,
      sessions: iv(r, 0),
      users:    iv(r, 1),
    })),
    countries: (countriesRes.rows || []).map(r => ({
      country:  r.dimensionValues[0].value,
      sessions: iv(r, 0),
    })),
    devices: (devicesRes.rows || []).map(r => ({
      device:   r.dimensionValues[0].value,
      sessions: iv(r, 0),
    })),
  };
}

// ── Local RFQ leads from leads.json ───────────────────────────────────────────
function getLeadsData() {
  try {
    if (!fs.existsSync(LEADS_FILE)) return { yesterday: 0, week: 0, total: 0 };
    const leads  = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    const now    = Date.now();
    const yday   = leads.filter(l => now - new Date(l.submittedAt).getTime() < 86400000).length;
    const week   = leads.filter(l => now - new Date(l.submittedAt).getTime() < 604800000).length;
    return { yesterday: yday, week, total: leads.length };
  } catch { return { yesterday: 0, week: 0, total: 0 }; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN   = n => Math.round(n).toLocaleString('en-IN');
const fmtPct = v => `${(v * 100).toFixed(1)}%`;
function fmtDur(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

// ── Build HTML email ──────────────────────────────────────────────────────────
function buildReportHTML(data, leads, dateStr) {
  const { yesterday: yd, week, topPages, sources, countries, devices } = data;
  const totalSrc = sources.reduce((a, b) => a + b.sessions, 0) || 1;

  const statCell = (label, value, sub = '') => `
    <td style="padding:18px 0;text-align:center;border-right:1px solid #e5e7eb;width:25%">
      <div style="font-size:26px;font-weight:700;color:#085B20;font-family:Arial,sans-serif">${value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">${label}</div>
      ${sub ? `<div style="font-size:11px;color:#41E296;margin-top:3px">${sub}</div>` : ''}
    </td>`;

  const srcRow = (label, sessions) => {
    const pct = Math.min(Math.round((sessions / totalSrc) * 100), 100);
    return `<tr>
      <td style="padding:7px 16px;font-size:13px;color:#374151;width:160px;white-space:nowrap">${label}</td>
      <td style="padding:7px 8px">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="background:#e5e7eb;border-radius:4px;height:8px;padding:0">
            <table width="${pct}%" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#085B20;border-radius:4px;height:8px;font-size:0">&nbsp;</td>
            </tr></table>
          </td>
        </tr></table>
      </td>
      <td style="padding:7px 12px;font-size:13px;font-weight:700;color:#1c1c1e;text-align:right;width:55px">${fmtN(sessions)}</td>
      <td style="padding:7px 12px;font-size:12px;color:#9ca3af;text-align:right;width:40px">${pct}%</td>
    </tr>`;
  };

  const pageRow = (p, i) => `<tr style="${i === 0 ? 'background:#f0faf4' : i % 2 === 0 ? '' : 'background:#fafafa'}">
    <td style="padding:9px 16px;font-size:13px;color:#1c1c1e;border-bottom:1px solid #f3f4f6">
      ${i === 0 ? '⭐ ' : ''}<code style="background:#f3f4f6;padding:2px 7px;border-radius:4px;font-size:12px;color:#374151">${p.path === '/' ? '/ (Home)' : p.path}</code>
    </td>
    <td style="padding:9px 16px;font-size:13px;font-weight:700;color:#085B20;text-align:right;border-bottom:1px solid #f3f4f6">${fmtN(p.views)}</td>
    <td style="padding:9px 16px;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6">${fmtN(p.users)}</td>
  </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daily Analytics Report — vanshenterprises.net</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:640px">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#085B20 0%,#0d7a2b 100%);padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-size:22px;font-weight:700;color:#fff;margin:0">📊 Daily Analytics Report</div>
        <div style="font-size:13px;color:#41E296;margin-top:5px">vanshenterprises.net &nbsp;·&nbsp; ${dateStr}</div>
      </td>
      <td align="right" style="font-size:11px;color:rgba(255,255,255,.65)">Generated 11:00 AM IST</td>
    </tr></table>
  </td></tr>

  <!-- Yesterday Stats -->
  <tr><td style="padding:24px 32px 8px">
    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Yesterday's Performance</div>
  </td></tr>
  <tr><td style="padding:0 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden"><tr>
      ${statCell('Sessions',       fmtN(yd.sessions))}
      ${statCell('Users',          fmtN(yd.users))}
      ${statCell('Page Views',     fmtN(yd.pageviews))}
      <td style="padding:18px 0;text-align:center;width:25%">
        <div style="font-size:26px;font-weight:700;color:#085B20">${fmtPct(yd.engagementRate)}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">Engagement</div>
        <div style="font-size:11px;color:#41E296;margin-top:3px">Avg ${fmtDur(yd.avgDuration)}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Last 7 Days Stats -->
  <tr><td style="padding:20px 32px 8px">
    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Last 7 Days</div>
  </td></tr>
  <tr><td style="padding:0 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#f9fafb"><tr>
      ${statCell('Sessions',   fmtN(week.sessions))}
      ${statCell('Users',      fmtN(week.users), `${fmtN(week.newUsers)} new visitors`)}
      ${statCell('Page Views', fmtN(week.pageviews))}
      <td style="padding:18px 0;text-align:center;width:25%">
        <div style="font-size:26px;font-weight:700;color:#085B20">${leads.week}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.04em">RFQ Leads</div>
        <div style="font-size:11px;color:#41E296;margin-top:3px">${leads.total} total all-time</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Lead highlight -->
  <tr><td style="padding:16px 32px 0">
    ${leads.yesterday > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf4;border-radius:8px;border-left:4px solid #41E296"><tr>
          <td style="padding:14px 18px;font-size:14px;color:#085B20">
            🎉 <strong>${leads.yesterday} new RFQ enqu${leads.yesterday === 1 ? 'iry' : 'iries'} yesterday!</strong> Check your inbox for the lead details.
          </td></tr></table>`
      : `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;border-left:4px solid #e5e7eb"><tr>
          <td style="padding:14px 18px;font-size:13px;color:#9ca3af">
            No new RFQ enquiries yesterday. Keep driving organic traffic — leads will follow.
          </td></tr></table>`}
  </td></tr>

  <!-- Top Pages -->
  <tr><td style="padding:24px 32px 8px">
    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Top Pages — Last 7 Days</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <tr style="background:#f9fafb">
        <th style="padding:9px 16px;font-size:11px;text-align:left;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb">Page</th>
        <th style="padding:9px 16px;font-size:11px;text-align:right;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;width:80px">Views</th>
        <th style="padding:9px 16px;font-size:11px;text-align:right;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #e5e7eb;width:80px">Users</th>
      </tr>
      ${topPages.map((p, i) => pageRow(p, i)).join('')}
    </table>
  </td></tr>

  <!-- Traffic Sources -->
  <tr><td style="padding:20px 32px 8px">
    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Traffic Sources — Last 7 Days</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      ${sources.map(s => srcRow(s.channel, s.sessions)).join('')}
    </table>
  </td></tr>

  <!-- Countries & Devices side by side -->
  <tr><td style="padding:20px 32px 0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr valign="top">

      <!-- Countries -->
      <td width="48%" style="padding-right:16px">
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Top Countries</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          ${countries.map((c, i) => `<tr style="${i % 2 === 0 ? '' : 'background:#fafafa'}">
            <td style="padding:9px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6">${c.country}</td>
            <td style="padding:9px 14px;font-size:13px;font-weight:700;color:#085B20;text-align:right;border-bottom:1px solid #f3f4f6">${fmtN(c.sessions)}</td>
          </tr>`).join('')}
        </table>
      </td>

      <!-- Devices -->
      <td width="48%" style="padding-left:16px">
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Devices</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          ${devices.map((d, i) => `<tr style="${i % 2 === 0 ? '' : 'background:#fafafa'}">
            <td style="padding:9px 14px;font-size:13px;color:#374151;text-transform:capitalize;border-bottom:1px solid #f3f4f6">${d.device}</td>
            <td style="padding:9px 14px;font-size:13px;font-weight:700;color:#085B20;text-align:right;border-bottom:1px solid #f3f4f6">${fmtN(d.sessions)}</td>
          </tr>`).join('')}
        </table>
      </td>

    </tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:28px 32px 16px;text-align:center">
    <a href="https://analytics.google.com" style="display:inline-block;background:#085B20;color:#fff;padding:12px 28px;border-radius:7px;text-decoration:none;font-size:14px;font-weight:700">Open Google Analytics →</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 32px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6">
    Auto-generated daily at 11:00 AM IST by vanshenterprises.net server &nbsp;·&nbsp; Property G-JRHDP4VLLF
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Main export ───────────────────────────────────────────────────────────────
async function sendDailyReport(transporter) {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  console.log(`[ANALYTICS] Generating report for ${dateStr}...`);

  let html;
  try {
    const [gaData, leads] = await Promise.all([ fetchGA4Data(), Promise.resolve(getLeadsData()) ]);
    html = buildReportHTML(gaData, leads, dateStr);
    console.log('[ANALYTICS] Data fetched successfully.');
  } catch (err) {
    console.error('[ANALYTICS] Failed to fetch GA4 data:', err.message);
    html = `<div style="font-family:Arial;padding:24px">
      <h2 style="color:#c00">Daily Report Failed</h2>
      <p><strong>Error:</strong> ${err.message}</p>
      <p>Check Railway logs. Common causes: GA4_PROPERTY_ID or GA_SERVICE_ACCOUNT env vars missing, or service account not added as Viewer to the GA4 property.</p>
    </div>`;
  }

  await transporter.sendMail({
    from:    `"Vansh Enterprises Analytics" <${process.env.EMAIL_USER}>`,
    to:      REPORT_TO,
    subject: `📊 Daily Analytics — vanshenterprises.net — ${dateStr}`,
    html,
  });
  console.log(`[ANALYTICS] Report sent to ${REPORT_TO}`);
}

module.exports = { sendDailyReport };
