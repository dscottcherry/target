---
name: clm-meeting-prep
description: Research a given week's Christian Life and Ministry Meeting Workbook on wol.jw.org and compile one teach-from-it Word document (.docx). Use when the user says "/clm-meeting-prep", "prep the meeting", "research this week's workbook", or gives a week (e.g. "June 29 – July 5, 2026"). Runs locally in Claude Code where wol.jw.org is reachable.
---

# CLM Meeting Prep

Prepare a complete teaching document for the Christian Life and Ministry (CLM) Meeting for a specific week, for a teacher to instruct a class from. **Your entire value is ACCURACY:** everything you write must be grounded in the actual publications on wol.jw.org, never your own memory.

**Input:** a week, given as a date range (e.g. "June 29 – July 5, 2026"), a wol.jw.org workbook URL, or the week's **workbook PDF/screenshot**. If none was given, ask for it. If a PDF is provided, use it for the verified skeleton (items, citations, songs, times) and still open wol.jw.org for the deep sources in step 3. (To read a text-PDF: `pip install pdfminer.six` then `python3 -c "from pdfminer.high_level import extract_text;print(extract_text('file.pdf'))"`.)

## Process — do this in order

1. **Find the workbook.** Use WebSearch / WebFetch to locate that week's *Life and Ministry Meeting Workbook* on **wol.jw.org** (Publications → Meeting Workbooks, or search "Life and Ministry Meeting Workbook <month year>"). Open the page for the week covering those dates and **confirm the dates match**.
2. **Extract the skeleton, exactly as listed:**
   - Bible reading and assigned portion; opening / midmeeting / closing songs.
   - The full, ordered list of items in each of the three sections — **TREASURES FROM GOD'S WORD**, **APPLY YOURSELF TO THE FIELD MINISTRY**, **LIVING AS CHRISTIANS** — with each item's title, time, and assigned material/citations (`cl`, `w`-Watchtower, `it`-Insight, `lmd`, `lfb`, `lff`, `th`, etc.).
3. **Open every cited source on wol.jw.org and read the actual paragraphs:** scriptures in full **NWT (2013 Revised Edition)** text, and the specific cited paragraphs of each publication. Base every teaching point, application, and summary on what those sources actually say.
4. **Compose the document, part by part,** mirroring this structure:
   - **Header:** meeting title, week, Bible reading + assigned portion, the three songs.
   - **Section 1 — Treasures:** the 10-min talk as teaching points, each with the NWT scripture text, the publication citation in brackets, and a researched explanation; a *For Meditation* question. Then **Spiritual Gems:** several gems (verse · application · 2 discussion questions) **plus** the workbook's official Spiritual Gems question, answered with its cited source. Then **Bible Reading:** the assigned `th` study point, principle scripture, and how-to-apply tips for the assigned verses.
   - **Section 2 — Field Ministry:** each item with its `lmd` skill + principle scripture + the `lmd` lesson point, a **full realistic sample conversation scene** (named publisher / householder dialogue), and a **SKILL DEMONSTRATED** analysis.
   - **Section 3 — Living as Christians:** the local-needs / discussion item(s), then the **Congregation Bible Study** (`lfb`) — key text, story-narrative bullets, verses to read aloud, discussion questions, and closing questions grouped (ABOUT JEHOVAH / PRACTICAL LESSON / etc.).
   - **Footer:** the sources used.
5. **Write the content** to `clm-outline-<week>.md` (e.g. `clm-outline-2026-06-29.md`), then **render a .docx** (see below). Save the `.docx` next to the `.md`.

## Hard rules (this is the point of the skill)

- Quote scriptures in **full, verbatim NWT (2013)** text retrieved from wol.jw.org. Never paraphrase a verse and present it as the quotation.
- Cite real publications with the abbreviations and paragraph numbers the workbook gives; verify each against the actual source.
- If you genuinely cannot retrieve a source after trying, write the citation followed by **"⚠️ could not verify — please check"** and do NOT fabricate its content. Never write "[From training knowledge]" or invent paragraph content.
- Follow the workbook's **actual items for that week** — never assume they match a prior week.
- Produce only the document and its sources list; don't contact anyone or take any other action.

## Rendering the .docx

Prefer **pandoc** if available (clean, one command):
```bash
pandoc clm-outline-<week>.md -o clm-outline-<week>.docx
```
Otherwise use the bundled renderer (needs `pip install python-docx`):
```bash
python3 .claude/skills/clm-meeting-prep/render_docx.py clm-outline-<week>.md clm-outline-<week>.docx
```
The renderer color-codes the three section headers (blue / green / purple) like the teacher's reference layout.

## Quality check before finishing

Self-grade against this rubric and fix any miss before handing over:
1. Correct week — header's Bible reading, assigned portion, and 3 songs match the workbook.
2. All 3 sections present, every item, in the workbook's order.
3. Every scripture in full, verbatim NWT (2013) text.
4. Every citation (`cl`/`w`/`it`/`lmd`/`lfb`/`lff`/`th`) matches the workbook and the real paragraphs.
5. No invented filler — anything unretrievable is flagged "⚠️ could not verify".
6. Output is a `.docx` structured like the reference (teaching points, gems, ministry scenes, CBS narrative + questions, sources footer).

If the teacher has a past prepared document on hand, match its depth and structure as the quality benchmark.
