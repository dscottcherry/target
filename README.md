# WOL Study Assistant

A fast, fully client-side study helper for the **Watchtower ONLINE Library**
(wol.jw.org) and the **NWT Study Bible** on jw.org. No backend, no build step,
no API keys — it runs entirely in the browser and every result is an official
deep-link into the real library, so the content and wording always come
straight from jw.org.

## Features

- **Scripture lookup** — type a reference like `John 3:16`, `1 John 4:8-10`, or
  `Psalm 23`. A smart parser understands full names, common abbreviations, and
  numbered books, then opens the exact verse in the NWT Study Bible.
- **Book picker** — choose any of the 66 books, chapter, and verse from
  dropdowns if you prefer.
- **Topic search** — search every publication on wol.jw.org, with one-tap chips
  for popular study topics.
- **Browse books** — all 66 books grouped by section, with chapter counts and a
  filter box.
- **History & bookmarks** — recent lookups and saved passages persist locally
  (localStorage), private to your device.
- **Light / dark theme** — follows your system preference and remembers your
  choice.

## How the deep-links work

The app never scrapes or embeds jw.org content (which isn't permitted and would
break cross-origin rules). Instead it constructs official links:

- **Scriptures** use the jw.org *finder* verse-ID scheme
  `verseId = book × 1,000,000 + chapter × 1,000 + verse`, e.g. John 3:16 →
  `43003016`, opened with `pub=nwtsty` (NWT Study Bible).
- **Topics** open the WOL search endpoint `wol.jw.org/en/wol/s/r1/lp-e?q=…`.

## Running it

It's a static site. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project layout

```
index.html        # markup and layout
css/styles.css    # theme + responsive styling
js/bible-data.js  # the 66 books, abbreviations, chapter counts, topic list
js/app.js         # reference parser, link builders, UI, storage
```

## Note

This is an independent study tool. It is not affiliated with, endorsed by, or
produced by jw.org or the Watchtower ONLINE Library; it simply links to their
publicly available content.
