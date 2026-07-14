# MOM and POP AI

A single-page marketing / landing site for **MOM and POP AI**, an approachable
AI-learning program aimed at everyday people.

## Deploy

This is a static site — the entire page lives in [`index.html`](index.html)
(inline CSS and JavaScript, no build step). To deploy on Netlify, point the site
at this repository with:

- **Build command:** _(none)_
- **Publish directory:** `.` (repository root)

Netlify serves `index.html` at the root automatically.

## Signup form (Netlify Forms)

The signup form uses [Netlify Forms](https://docs.netlify.com/forms/setup/).
It is wired up with `data-netlify="true"`, a hidden `form-name` field, and a
`bot-field` honeypot, so Netlify detects and captures submissions at deploy time.
Submissions appear under **Forms** in the Netlify dashboard.

## Assets

The page references two kinds of assets:

- **Intro video** — `MOM and POP AI.mp4`, expected at the repository root
  (referenced as `MOM%20and%20POP%20AI.mp4`). Add this file for the intro
  video to play; until then the video element shows its controls with no source.
- **Instructor photos** — loaded from external Pexels URLs, with a placeholder
  fallback baked into the `<img>` `onerror` handler.
