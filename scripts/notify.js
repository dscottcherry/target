#!/usr/bin/env node
/* ============================================================
   Broadcast a schedule update to every subscriber.
   Usage:
     node scripts/notify.js "Subject line" "The message body..."
   or run with no args for an interactive prompt.

   Reads subscribers from data/subscribers.json and uses the same
   mailer as the server (logs to console if SMTP isn't configured).
   ============================================================ */

const fs   = require('fs');
const path = require('path');

// load .env (same tiny loader as server.js)
try {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  env.split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (_) {}

const { sendMail, mailConfigured } = require('../mailer');
const STORE = path.join(__dirname, '..', 'data', 'subscribers.json');

function readSubs() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (_) { return []; }
}

async function main() {
  const subject = process.argv[2];
  const message = process.argv[3];

  if (!subject || !message) {
    console.log('Usage: node scripts/notify.js "Subject" "Message body"');
    process.exit(1);
  }

  const subs = readSubs().filter(s => s.notify !== false);
  if (subs.length === 0) {
    console.log('No subscribers to notify yet.');
    return;
  }

  console.log(`Sending "${subject}" to ${subs.length} subscriber(s)...`);
  console.log(`Delivery mode: ${mailConfigured() ? 'SMTP' : 'console log (SMTP not configured)'}\n`);

  let sent = 0;
  for (const s of subs) {
    try {
      const info = await sendMail({
        to: s.email,
        subject,
        text: `Hi ${s.name.split(' ')[0]},\n\n${message}\n\n— Silver&Screen\nTeaching AI to seniors, one patient conversation at a time.`
      });
      if (info && info.sent) sent++;
    } catch (e) {
      console.error('  failed for', s.email, '-', e.message);
    }
  }

  console.log(`\nDone. Delivered ${sent}/${subs.length}${mailConfigured() ? '' : ' (logged only — configure SMTP to actually send)'}.`);
}

main();
