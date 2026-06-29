# clm-meeting-prep (local Claude Code skill)

Research a week's **Christian Life and Ministry Meeting Workbook** on wol.jw.org and
produce one teach-from-it Word document. Runs **locally** in Claude Code, where
wol.jw.org is reachable (it is blocked in the restricted web sandbox).

## One-time setup on your machine
1. Install Claude Code and clone this repo:
   ```bash
   git clone https://github.com/dscottcherry/target.git
   cd target
   ```
2. (For .docx output) install one of:
   - **pandoc** — https://pandoc.org/installing.html  (recommended, simplest), or
   - **python-docx** — `pip install python-docx` (used by the bundled renderer).

## Use it
Start Claude Code in the repo and run:
```
/clm-meeting-prep June 29 – July 5, 2026
```
Claude finds that week's workbook, researches every part from wol.jw.org, writes
`clm-outline-2026-06-29.md`, and renders `clm-outline-2026-06-29.docx`.

You can give any week as a date range or paste the wol.jw.org workbook URL.

## Files
- `SKILL.md` — the process and accuracy rules Claude follows.
- `render_docx.py` — Markdown → styled .docx (color-coded sections) if you don't use pandoc.
- Keep one of your own past prepared documents handy as the quality benchmark for depth/format.

## Want it to run unattended every week instead?
That's the managed-agent path, already designed in `my-agent/` (see `my-agent/LAUNCH.md`
and `my-agent/agent-overview.html`). It runs in your Anthropic account on a schedule —
needs an API key. This local skill needs neither, but you run it when you want a week.
