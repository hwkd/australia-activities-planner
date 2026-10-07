# Prototype logic (reference)

The working logic and checks behind the design canvas (https://claude.ai/artifact/3DefgcrPvBH4JCFK3qrYJX), kept here so they don't depend on the canvas or any temporary folder. This is reference material for porting (see [implementation-plan.md](../../implementation-plan.md) section 4), not production code.

## What's here

| Folder | Contents |
|---|---|
| `engines/` | The three shared engines used by the artboards: `discover-engine.js` (filters, ranking, Plan B, weekend plan), `detail-engine.js` (routes, map data, cost estimate, suggestions, all 29 activities), `calendar-engine.js` (any-day planning, month grid, times, overlaps, public holidays, calendar export). Each is a `class Component extends DCLogic`. |
| `artboards/` | Snapshots of every `.dc.html` artboard and `canvas.json`. The seven A artboards and `canvas.json` are from Version 39 (aligned to the spec on 2 Oct 2026; their logic now goes beyond `engines/`, so the parity scripts report DIFF for them); the rest are from Version 33. |
| `content/` | **Retired 1 Oct 2026.** `build-content.js` generated the first version of `content/sydney/*.json`. The JSON files are now edited directly (docs/editor-guide.md), so **don't run the generator**: it would overwrite edits. Kept for reference only. |
| `checks/` | The scripts used to verify the artboards. |

## Commands (run from the project root)

```bash
node design/prototype-logic/content/validate-content.js
```

Run the validator from inside `design/prototype-logic/content/` (it reads `content-all.json` next to it).

| Check | What it does |
|---|---|
| `checks/t5.js` | Runs every activity × weather × origin × mode through the A, B detail artboards (A ignores origin and mode since D14) |
| `checks/t6.js` | Opens every activity from each A and B discover prototype into its detail page |
| `checks/t7.js` | Taps every "Make a day of it" suggestion, hosted and standalone |
| `checks/t9.js` | The same for the v1 baseline and its detail pages |
| `checks/tcal.js` | Exercises the calendar engine: months, days, Plan B, export, add-to-a-day |
| `checks/a1-check.js <file>`, `t-addtoday.js <file>`, `check-cal-desktop.js <file>` | Hole and tag checks for the three calendar artboards |
| `checks/parity.py`, `parity-detail.py`, `parity-cal.py <files>` | Confirm an artboard's logic block matches its engine (only `themeVals` may differ). `parity-detail.py` reports a DIFF for the A detail artboards since D14; that's expected |
| `checks/dupattr.py <files>` | Finds tags with a repeated attribute |
| `checks/sheet.js` | Renders the schematic maps to SVG contact sheets |

## Notes

- **Getting there (D14, 2 Oct 2026):** the A · Activity detail artboards (canvas Version 36) show one public transport trip from the city centre (way-in strip, last stretch, Directions from where you are) and a Driving? note, with no origin or mode pickers. Their logic block now differs from `engines/detail-engine.js`, which still models three origins and three modes and is kept as the reference for B and v1. The app follows the A artboards and spec §3.2 (TRACKER.md M24). `checks/t7.js` checks the travel-mode reset on B only.
- **State switch (D16, 7 Oct 2026):** canvas Version 54 folds A1 · State switch into A · Sky Mode — Mobile and Desktop (the state switch, "If it's looking …", no forecast; picker closed and Sunny by default); A1 is marked chosen, A2 and A3 not chosen (kept for reference; A2's region chips for spec §12.5).
- The Discover and detail engines still model weekend-only planning (Sat/Sun) internally, but since Version 33 their A · Sky Mode templates show Add to a day and My plans (linking to the calendar artboards). The calendar engine and spec §3.3 describe the any-day behaviour; the app (`src/`) is the source of truth.
- The checks are CommonJS; `package.json` in this folder keeps them runnable inside the ESM app repo.
- The engines use the prototype weather keys `sun | cloud | rain | hot`; the spec and production code use `sunny | cloudy | rainy | hot`.
- All fares, prices and times in the data are estimates; every content file is `status: "draft"`.
