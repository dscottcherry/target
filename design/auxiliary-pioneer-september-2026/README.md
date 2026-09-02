# Auxiliary Pioneer Schedule — September 2026

Print-ready reformat of the September 2026 auxiliary pioneer schedule.
Three Letter-portrait (816 × 1056 px at 96 ppi) artboards laid out on one canvas:

| File | Direction | Page | Notes |
| --- | --- | --- | --- |
| `Main.dc.html` | Notice-board poster | Schedule | The chosen deliverable. Oxblood header block, Bebas Neue + Karla, names at 22px in three columns. Carries the congregation name. |
| `DirectionA.dc.html` | Warm editorial | Alternates | Cream stock, Cormorant Garamond + Karla, gold accent. Not chosen. |
| `DirectionB.dc.html` | Modern ledger | Alternates | Cool neutrals, Archivo only, one numbered table with per-row enrollment tags. Not chosen. |

`canvas.json` positions the artboards across two pages and carries the sticky notes.

## Content

Transcribed verbatim from the source PDF: 20 publishers — 7 continuous,
13 September-only (15-hour requirement) — plus the Matthew 6:33 footer line.
Names read alphabetically down each column, as in the original.

The congregation name ("South Congregation") was supplied separately; it does
not appear in the source PDF and is only on `Main.dc.html`.

## Rebuilding

The published canvas bundle is generated and git-ignored. Regenerate it with the
`design` skill's seeder:

    node <design-skill>/seed-canvas.mjs \
      --template <design-skill>/payload.template.html \
      --out auxiliary-pioneer-schedule-september-2026.html \
      --title "Auxiliary Pioneer Schedule — September 2026" \
      --artboard Main.dc.html \
      --artboard DirectionA.dc.html \
      --artboard DirectionB.dc.html \
      --canvas canvas.json
