# Silver&Screen — Landing Page

A warm, senior-friendly landing page for **Silver&Screen**, which teaches
older adults to use AI tools like ChatGPT in plain English. Visitors can
**sign up for classes** and **receive email notifications about schedule
updates**.

## What's inside

| Feature | Where |
| --- | --- |
| **Talking host ("Walter")** — a friendly persona who welcomes new students and narrates the whole page *out loud, in real time*, with synced captions | Hero section (`index.html`, `app.js`) |
| **Sign-up form** with validation and a graceful offline fallback | `#signup` section |
| **Email notifications** — welcome email on signup + a broadcast tool for schedule updates | `server.js`, `mailer.js`, `scripts/notify.js` |

The three photos from the approved design are placed exactly as requested:

- **Picture 1** (the host) → the talking persona in the hero.
- **Picture 3** (a student raising her hand) → the *"I finally asked a question"* testimonial.
- **Last picture** (the group class) → the *"Book a free session"* section.

## The talking host

Press **“Play welcome from Walter”** in the hero. Using the browser's built-in
speech synthesis, Walter speaks a supportive welcome script that walks a new
student through **every section of the page** — the promise at the top, the
common worries, the three-session path, Margaret's story, the free first
session, and finally how to sign up. The captions light up **word-by-word in
sync with his voice**, and a *LIVE* badge and audio bars make it feel like he
is talking to you in real time. Browsers without speech synthesis fall back to
timed captions, so it always works.

You can edit the script — it's the `SCRIPT` array at the top of `app.js`.

## Run it

The page is fully static and can simply be opened in a browser
(`index.html`). To enable sign-ups and email, run the small Node server
(no dependencies required):

```bash
npm start           # serves the page + API at http://localhost:3000
```

Sign-ups are stored in `data/subscribers.json`. With no email configured,
the welcome email is **printed to the console** so you can develop without any
setup.

### Enable real email

```bash
npm install nodemailer          # the only optional dependency
cp .env.example .env            # then fill in your SMTP details
npm start
```

### Send a schedule update to everyone

```bash
# via the CLI
node scripts/notify.js "New spring classes are open!" "We've just added Tuesday morning sessions. Reply to book your spot."

# or via the API (protected by ADMIN_TOKEN from your .env)
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"New spring classes are open!","message":"We just added Tuesday mornings."}'
```

Only subscribers who opted in to notifications receive these messages, and the
send is best-effort per address so one bad email never blocks the rest.

## Project layout

```
index.html          the landing page
styles.css          styling (matches the approved design palette)
app.js              talking host + sign-up form behaviour
server.js           static server + /api/signup + /api/notify
mailer.js           email sender (console-logs until SMTP is set)
scripts/notify.js   broadcast schedule updates from the CLI
assets/             the three approved photos
.env.example        configuration template
```
