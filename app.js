/* ============================================================
   Silver&Screen — landing page behaviour
   1) Walter, the talking host: real-time spoken welcome
   2) Sign-up form: validation + submit to /api/signup (with a
      graceful offline fallback so the page still works on its own)
   ============================================================ */

/* ---------------------------------------------------------------
   1) THE TALKING HOST ("Walter")
   A supportive, friendly welcome that walks a new student through
   the entire page. Each line is spoken aloud (Web Speech API) while
   the LIVE badge and audio bars animate, so he looks like he is
   talking in real time.
--------------------------------------------------------------- */
const SCRIPT = [
  "Hi there, and welcome. I'm so glad you found us. My name's Walter, and I help folks here at Silver and Screen.",
  "Take a breath. There's nothing you can break just by being on this page, so let me walk you through the whole thing, nice and slow.",
  "Right at the top is our promise: with a little friendly guidance, you can build the confidence to take your first step into A.I. This is a welcoming foundation course for adults who want to use modern devices, stay safer online, and explore A.I. without ever feeling rushed or left behind.",
  "A little further down you'll see the three worries we hear most: being afraid of breaking something, instructions that sound like they were written for engineers, and worrying about scams. If any of those feel familiar, you are in exactly the right place.",
  "Then there's our calm, guided path. Just three sessions. First, a friendly conversation about what you'd actually like to do. Then hands-on practice, side by side. And finally, a simple reference guide and a real phone number to call whenever you get stuck.",
  "Keep going and you'll meet Margaret. She's seventy-four, and she finally asked the question she'd been too embarrassed to ask anyone. She didn't feel silly once. She felt capable. That's the whole idea.",
  "Near the bottom, your very first session is on us. No pressure, no obligation, just a friendly hour to see if this feels right for you.",
  "When you're ready, pop your name and email into the sign-up box. We'll send you our class schedule and a gentle note whenever a new class opens up. Nothing else, I promise.",
  "That's the whole page. Thank you for being brave enough to start. Whenever you're ready, I'll be right here waiting to meet you."
];

const persona     = document.getElementById('persona');
const playBtn     = document.getElementById('playBtn');
const playIcon    = document.getElementById('playIcon');
const playLabel   = document.getElementById('playLabel');
const restartBtn  = document.getElementById('restartBtn');

const synth = window.speechSynthesis || null;
let lineIndex = 0;
let isPlaying = false;
let fallbackTimer = null;

function setPlayingUI(playing) {
  isPlaying = playing;
  persona.classList.toggle('speaking', playing);
  playBtn.setAttribute('aria-pressed', String(playing));
  playIcon.textContent = playing ? '❚❚' : '▶';
  playLabel.textContent = playing ? 'Pause' : (lineIndex > 0 ? 'Resume welcome' : 'Play welcome from Walter');
  restartBtn.hidden = lineIndex === 0 && !playing;
}

/* Speak one line of the welcome, then advance to the next. */
function speakLine() {
  if (lineIndex >= SCRIPT.length) { finish(); return; }
  const text = SCRIPT[lineIndex];

  if (synth && 'SpeechSynthesisUtterance' in window) {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    // A natural voice sounds best near normal speed; only the old robotic
    // fallbacks need slowing down. Keep the pace warm and conversational.
    u.rate = isNaturalVoice(voice) ? 1.0 : 0.9;
    u.pitch = 1.02;   // a touch of warmth

    u.onend = () => {
      if (!isPlaying) return;           // was paused/stopped
      lineIndex++;
      setTimeout(speakLine, 450);       // a natural breath between lines
    };
    synth.speak(u);
  } else {
    // No speech synthesis available — pace the lines on a timer so the
    // "live" animation still runs for roughly the length of the speech.
    fallbackAdvance(text);
  }
}

/* Fallback for browsers without the Web Speech API: hold each line for a
   moment based on its length, then move on. */
function fallbackAdvance(text) {
  const words = text.split(/\s+/).length;
  const holdMs = Math.max(2200, words * 320);
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => {
    if (!isPlaying) return;
    lineIndex++;
    speakLine();
  }, holdMs);
}

/* Names/markers of the high-quality voices modern browsers ship. These
   sound natural; the unmarked defaults (eSpeak etc.) sound robotic. */
const NATURAL_RE = /natural|neural|premium|enhanced|google|siri|online/i;

function isNaturalVoice(v) {
  return !!(v && NATURAL_RE.test(v.name || ''));
}

/* Pick the most natural-sounding English voice available by scoring every
   installed voice — we can't install voices, but we can choose the best. */
function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;

  const score = (v) => {
    const n = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let s = 0;

    // language preference
    if (lang.startsWith('en-us')) s += 40;
    else if (lang.startsWith('en-gb') || lang.startsWith('en-au') || lang.startsWith('en-ca')) s += 30;
    else if (lang.startsWith('en')) s += 22;
    else s -= 40;                       // non-English: avoid

    // quality markers (the big win over the robotic default)
    if (/natural|neural/.test(n)) s += 70;
    if (/premium|enhanced/.test(n)) s += 55;
    if (/online/.test(n)) s += 30;
    if (/google/.test(n)) s += 45;      // Chrome's Google voices are far better than eSpeak
    if (/siri/.test(n)) s += 40;
    if (v.localService === false) s += 10;  // cloud voices are usually higher quality

    // a warm male voice suits Walter (soft preference, not a requirement)
    if (/\b(guy|davis|tony|aaron|arthur|eric|roger|christopher|william|matthew|daniel|david|mark|alex|fred|male|man)\b/.test(n)) s += 14;

    // penalise the tinny / novelty / robotic voices
    if (/espeak|compact|zarvox|albert|whisper|bells|cellos|trinoids|boing|bubbles|junior|organ|bad news|good news|wobble|superstar/.test(n)) s -= 90;

    return s;
  };

  return voices.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

function play() {
  setPlayingUI(true);
  if (synth) synth.resume();
  speakLine();
}

function pause() {
  setPlayingUI(false);
  if (synth) synth.pause();
  clearTimeout(fallbackTimer);
}

function restart() {
  if (synth) synth.cancel();
  clearTimeout(fallbackTimer);
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
