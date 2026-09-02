# Auxiliary Pioneer Schedule — September 2026

Print-ready reformat of the September 2026 auxiliary pioneer schedule.
Three Letter-portrait (816 × 1056 px at 96 ppi) artboards laid out on one canvas:

| File | Direction | Notes |
| --- | --- | --- |
| `Main.dc.html` | Warm editorial | The deliverable. Cream stock, Cormorant Garamond + Karla, gold accent. |
| `DirectionB.dc.html` | Modern ledger | Cool neutrals, Archivo only, one numbered table with per-row enrollment tags. |
| `DirectionC.dc.html` | Notice-board poster | Oxblood header block, condensed display face, oversized total. Heavier ink use. |

`canvas.json` positions the three artboards and carries the sticky notes.

## Content

Transcribed verbatim from the source PDF: 20 publishers — 7 continuous,
13 September-only (15-hour requirement) — plus the Matthew 6:33 footer line.
Numbering and column order follow the original.

## Rebuilding

The published canvas bundle is generated and git-ignored. Regenerate it with the
`design` skill's seeder:

    node <design-skill>/seed-canvas.mjs \
      --template <design-skill>/payload.template.html \
      --out auxiliary-pioneer-schedule-september-2026.html \
      --title "Auxiliary Pioneer Schedule — September 2026" \
      --artboard Main.dc.html \
      --artboard DirectionB.dc.html \
      --artboard DirectionC.dc.html \
      --canvas canvas.json
