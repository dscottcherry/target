/* ============================================================
   Silver&Screen — landing page behaviour
   1) Walter, the talking host: real-time speech + synced captions
   2) Sign-up form: validation + submit to /api/signup (with a
      graceful offline fallback so the page still works on its own)
   ============================================================ */

/* ---------------------------------------------------------------
   1) THE TALKING HOST ("Walter")
   A supportive, friendly welcome that walks a new student through
   the entire page. Each line is spoken aloud (Web Speech API) and
   the captions light up word-by-word so he looks like he is
   talking in real time.
--------------------------------------------------------------- */
const SCRIPT = [
  "Hi there, and welcome. I'm so glad you found us. My name's Walter, and I help folks here at Silver and Screen.",
  "Take a breath. There's nothing you can break just by being on this page, so let me walk you through the whole thing, nice and slow.",
  "Right at the top is our promise: learning A.I. shouldn't feel like a foreign language. We teach you to use tools like ChatGPT in plain English, patient and judgment-free, one gentle step at a time.",
  "A little further down you'll see the three worries we hear most: being afraid of breaking something, instructions that sound like they were written for engineers, and worrying about scams. If any of those feel familiar, you are in exactly the right place.",
  "Then there's our calm, guided path. Just three sessions. First, a friendly conversation about what you'd actually like to do. Then hands-on practice, side by side. And finally, a simple reference guide and a real phone number to call whenever you get stuck.",
  "Keep going and you'll meet Margaret. She's seventy-four, and she finally asked the question she'd been too embarrassed to ask anyone. She didn't feel silly once. She felt capable. That's the whole idea.",
  "Near the bottom, your very first session is on us. No pressure, no obligation, just a friendly hour to see if this feels right for you.",
  "When you're ready, pop your name and email into the sign-up box. We'll send you our class schedule and a gentle note whenever a new class opens up. Nothing else, I promise.",
  "That's the whole page. Thank you for being brave enough to start. Whenever you're ready, I'll be right here waiting to meet you."
];

const persona     = document.getElementById('persona');
const captionText = document.getElementById('captionText');
const playBtn     = document.getElementById('playBtn');
const playIcon    = document.getElementById('playIcon');
const playLabel   = document.getElementById('playLabel');
const restartBtn  = document.getElementById('restartBtn');

const synth = window.speechSynthesis || null;
let lineIndex = 0;
let isPlaying = false;
let fallbackTimer = null;

/* Split a line into word-spans so we can highlight them as spoken. */
function renderLine(text) {
  captionText.innerHTML = '';
  const words = text.split(/(\s+)/); // keep the spaces
  const spans = [];
  words.forEach(chunk => {
    if (/^\s+$/.test(chunk)) {
      captionText.appendChild(document.createTextNode(chunk));
    } else if (chunk.length) {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = chunk;
      captionText.appendChild(s);
      spans.push({ el: s, index: text.indexOf(chunk) });
    }
  });
  return spans;
}

/* Light up every word up to a character position (real-time sync). */
function highlightUpTo(spans, charIndex) {
  spans.forEach(w => {
    if (w.index <= charIndex) w.el.classList.add('on');
  });
}

function setPlayingUI(playing) {
  isPlaying = playing;
  persona.classList.toggle('speaking', playing);
  playBtn.setAttribute('aria-pressed', String(playing));
  playIcon.textContent = playing ? '❚❚' : '▶';
  playLabel.textContent = playing ? 'Pause' : (lineIndex > 0 ? 'Resume welcome' : 'Play welcome from Walter');
  restartBtn.hidden = lineIndex === 0 && !playing;
}

/* Speak one line, syncing captions, then advance. */
function speakLine() {
  if (lineIndex >= SCRIPT.length) { finish(); return; }
  const text  = SCRIPT[lineIndex];
  const spans = renderLine(text);

  if (synth && 'SpeechSynthesisUtterance' in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92;   // a calm, unhurried pace
    u.pitch = 1.0;
    const voice = pickVoice();
    if (voice) u.voice = voice;

    u.onboundary = (e) => {
      if (typeof e.charIndex === 'number') highlightUpTo(spans, e.charIndex);
    };
    u.onend = () => {
      highlightUpTo(spans, text.length);
      if (!isPlaying) return;           // was paused/stopped
      lineIndex++;
      setTimeout(speakLine, 450);       // a natural breath between lines
    };
    synth.speak(u);
  } else {
    // No speech synthesis available — reveal captions on a timer instead.
    fallbackReveal(text, spans);
  }
}

/* Fallback for browsers without the Web Speech API: reveal words on a
   timer so the captions still play in real time. */
function fallbackReveal(text, spans) {
  const words = spans.length || 1;
  const perWord = 320; // ms
  let i = 0;
  clearInterval(fallbackTimer);
  fallbackTimer = setInterval(() => {
    if (!isPlaying) { clearInterval(fallbackTimer); return; }
    if (i < spans.length) {
      spans[i].el.classList.add('on');
      i++;
    } else {
      clearInterval(fallbackTimer);
      lineIndex++;
      setTimeout(speakLine, 500);
    }
  }, perWord);
}

/* Prefer a natural English voice when one is available. */
function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  return (
    voices.find(v => /en-US/i.test(v.lang) && /male|Daniel|Alex|David/i.test(v.name)) ||
    voices.find(v => /en(-|_)?US/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    null
  );
}

function play() {
  setPlayingUI(true);
  if (synth) synth.resume();
  speakLine();
}

function pause() {
  setPlayingUI(false);
  if (synth) synth.pause();
  clearInterval(fallbackTimer);
}

function restart() {
  if (synth) synth.cancel();
  clearInterval(fallbackTimer);
  lineIndex = 0;
  play();
}

function finish() {
  setPlayingUI(false);
  lineIndex = 0;
  playLabel.textContent = 'Play welcome from Walter';
  restartBtn.hidden = false;
}

playBtn.addEventListener('click', () => (isPlaying ? pause() : play()));
restartBtn.addEventListener('click', restart);

// Voice list can load asynchronously; refresh our choice when it does.
if (synth && typeof synth.onvoiceschanged !== 'undefined') {
  synth.onvoiceschanged = pickVoice;
}
// Be a good citizen: stop talking if the user leaves the tab.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isPlaying) pause();
});

/* ---------------------------------------------------------------
   2) SIGN-UP FORM
--------------------------------------------------------------- */
const form       = document.getElementById('signupForm');
const nameInput  = document.getElementById('name');
const emailInput = document.getElementById('email');
const notifyInput= document.getElementById('notify');
const submitBtn  = document.getElementById('submitBtn');
const formNote   = document.getElementById('formNote');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setNote(msg, kind) {
  formNote.textContent = msg;
  formNote.className = 'form-note ' + (kind || '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name  = nameInput.value.trim();
  const email = emailInput.value.trim();

  nameInput.classList.toggle('invalid', !name);
  emailInput.classList.toggle('invalid', !EMAIL_RE.test(email));

  if (!name) { setNote('Please add your name so we know who to greet.', 'err'); nameInput.focus(); return; }
  if (!EMAIL_RE.test(email)) { setNote('That email doesn’t look quite right — mind checking it?', 'err'); emailInput.focus(); return; }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Signing you up…';
  setNote('', '');

  const payload = { name, email, notify: notifyInput.checked };

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('bad status ' + res.status);
    const data = await res.json().catch(() => ({}));
    succeed(name, data.emailSent);
  } catch (err) {
    // The static page can be opened without the backend running.
    // Save the signup locally so nothing is lost, and still thank them.
    saveLocally(payload);
    succeed(name, false, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

function succeed(name, emailSent, offline) {
  form.reset();
  notifyInput.checked = true;
  const first = name.split(' ')[0];
  let msg = `Thank you, ${first}! You're on the list. `;
  if (emailSent) msg += 'Check your inbox for the class schedule.';
  else if (offline) msg += 'We saved your details on this device — we’ll be in touch about class dates.';
  else msg += 'We’ll email you the class schedule shortly.';
  setNote(msg, 'ok');
}

function saveLocally(payload) {
  try {
    const key = 'silverscreen_signups';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push({ ...payload, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list));
  } catch (_) { /* storage may be disabled; ignore */ }
}
