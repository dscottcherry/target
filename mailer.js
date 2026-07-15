/* ============================================================
   Silver&Screen — email sender
   ------------------------------------------------------------
   Zero-config by default: if no SMTP credentials are present the
   message is printed to the console (so you can develop without
   any setup). To send real email, install nodemailer and fill in
   the SMTP_* variables in .env:

       npm install nodemailer

   Supported env vars:
       SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
       MAIL_FROM   (e.g. "Silver&Screen <hello@silverandscreen.com>")
   ============================================================ */

const FROM = process.env.MAIL_FROM || 'Silver&Screen <hello@silverandscreen.example>';

function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Lazily create a transport only if nodemailer + SMTP are available.
let _transport = null;
function getTransport() {
  if (_transport) return _transport;
  if (!mailConfigured()) return null;
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (_) {
    console.warn('[mailer] SMTP is configured but "nodemailer" is not installed. Run: npm install nodemailer');
    return null;
  }
  _transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return _transport;
}

/**
 * Send (or log) an email.
 * @returns {Promise<{sent:boolean}>}
 */
async function sendMail({ to, subject, text, html }) {
  const transport = getTransport();

  if (!transport) {
    // Development / no-SMTP mode: log instead of send.
    console.log('\n──────── EMAIL (not sent — SMTP not configured) ────────');
    console.log('To:      ' + to);
    console.log('Subject: ' + subject);
    console.log('----------------------------------------------------------');
    console.log(text || html || '');
    console.log('──────────────────────────────────────────────────────────\n');
    return { sent: false };
  }

  await transport.sendMail({ from: FROM, to, subject, text, html });
  return { sent: true };
}

module.exports = { sendMail, mailConfigured };
