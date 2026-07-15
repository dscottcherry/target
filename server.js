/* ============================================================
   Silver&Screen — signup + email-notification backend
   ------------------------------------------------------------
   A small, dependency-light Node server that:
     • serves the static landing page
     • accepts sign-ups at POST /api/signup
     • stores subscribers in data/subscribers.json
     • emails a welcome/schedule note on signup (if SMTP is set)
     • lets you broadcast schedule updates to everyone via
       POST /api/notify  (protected by ADMIN_TOKEN)

   Email is optional: with no SMTP configured the server logs the
   message instead of sending, so it runs fine out of the box.
   Configure real delivery by copying .env.example to .env.
   ============================================================ */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { sendMail, mailConfigured } = require('./mailer');

// --- tiny .env loader (no dependencies) ------------------------
(function loadEnv() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    env.split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    });
  } catch (_) { /* no .env file — that's fine */ }
})();

const PORT        = process.env.PORT || 3000;
const DATA_DIR    = path.join(__dirname, 'data');
const STORE       = path.join(DATA_DIR, 'subscribers.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const PUBLIC_DIR  = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

// --- subscriber storage helpers --------------------------------
function readSubs() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch (_) { return []; }
}
function writeSubs(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(list, null, 2));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) { reject(new Error('payload too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// --- email templates -------------------------------------------
function welcomeEmail(name) {
  const first = (name || 'friend').split(' ')[0];
  return {
    subject: 'Welcome to Silver&Screen 🌿 — your class schedule',
    text:
`Hi ${first},

Thank you for signing up with Silver&Screen! We're so glad you're here.

Your first session is on us — no pressure, no obligation, just a friendly
hour to see if this feels right for you.

We'll email you whenever a new class opens up, and you can reply to this
message any time to book your free session or ask a question.

Warmly,
Walter & the Silver&Screen team
Teaching AI to seniors, one patient conversation at a time.`
  };
}

// --- request handling ------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // POST /api/signup ------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/api/signup') {
    try {
      const raw = await readBody(req);
      const { name, email, notify } = JSON.parse(raw || '{}');

      if (!name || !String(name).trim()) return json(res, 400, { ok: false, error: 'Name is required.' });
      if (!EMAIL_RE.test(String(email || ''))) return json(res, 400, { ok: false, error: 'A valid email is required.' });

      const subs = readSubs();
      const clean = String(email).trim().toLowerCase();
      const existing = subs.find(s => s.email === clean);

      if (existing) {
        existing.name = String(name).trim();
        existing.notify = notify !== false;
        existing.updatedAt = new Date().toISOString();
      } else {
        subs.push({
          name: String(name).trim(),
          email: clean,
          notify: notify !== false,
          createdAt: new Date().toISOString()
        });
      }
      writeSubs(subs);

      // Fire off the welcome email (best-effort; never blocks signup success).
      let emailSent = false;
      try {
        const tpl = welcomeEmail(name);
        const info = await sendMail({ to: clean, subject: tpl.subject, text: tpl.text });
        emailSent = !!(info && info.sent);
      } catch (e) {
        console.error('welcome email failed:', e.message);
      }

      return json(res, 200, { ok: true, emailSent });
    } catch (e) {
      return json(res, 400, { ok: false, error: 'Could not process signup.' });
    }
  }

  // POST /api/notify  (broadcast a schedule update) -----------------
  if (req.method === 'POST' && url.pathname === '/api/notify') {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return json(res, 401, { ok: false, error: 'Unauthorized.' });
    }
    try {
      const raw = await readBody(req);
      const { subject, message } = JSON.parse(raw || '{}');
      if (!subject || !message) return json(res, 400, { ok: false, error: 'subject and message are required.' });

      const subs = readSubs().filter(s => s.notify !== false);
      let sent = 0;
      for (const s of subs) {
        try {
          const info = await sendMail({
            to: s.email,
            subject,
            text: `Hi ${s.name.split(' ')[0]},\n\n${message}\n\n— Silver&Screen`
          });
          if (info && info.sent) sent++;
        } catch (e) { console.error('notify failed for', s.email, e.message); }
      }
      return json(res, 200, { ok: true, recipients: subs.length, sent, delivery: mailConfigured() ? 'smtp' : 'logged' });
    } catch (e) {
      return json(res, 400, { ok: false, error: 'Could not send notifications.' });
    }
  }

  // GET /api/subscribers/count  (handy public stat) -----------------
  if (req.method === 'GET' && url.pathname === '/api/subscribers/count') {
    return json(res, 200, { ok: true, count: readSubs().length });
  }

  // --- static files ------------------------------------------------
  if (req.method === 'GET') {
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    // prevent path traversal
    const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
    if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }

    fs.readFile(filePath, (err, buf) => {
      if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(buf);
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`\n  Silver&Screen is running at  http://localhost:${PORT}`);
  console.log(`  Email delivery: ${mailConfigured() ? 'SMTP configured ✅' : 'not configured (emails will be logged to the console) ℹ️'}`);
  console.log(`  Subscribers stored in: ${STORE}\n`);
});
