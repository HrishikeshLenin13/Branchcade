# Opus independent audit — visual and UX review (baseline)

Source `617b83d` · Chromium 153 headless · captured by `scripts/opus-audit-sweep.mjs` on clean profiles (no learner data except what each route creates). Screenshots are viewport-sized (not full page) in `evidence/baseline-617b83d/`. I opened and inspected the 1366×768 and 390×844 mission workstation, the focus-ring crop, the unknown-mission page and the onboarding page; the rest were checked only through DOM metrics.

## Viewports and routes

11 routes (`/`, `/start`, `/missions`, `/missions/m01`, `/lab`, `/team`, `/progress`, `/instructor`, `/settings`, `/how-it-works`, unknown) × 6 viewports (1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844) = 66 loads.

| Check                               | Result                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Horizontal page overflow            | 0 / 66                                                                                                            |
| Exactly one `h1`                    | 66 / 66                                                                                                           |
| Unnamed buttons/links               | 0 / 66                                                                                                            |
| Page errors / console errors        | 0 / 0                                                                                                             |
| Request origins                     | only `http://127.0.0.1:4173`; 0 failed requests                                                                   |
| axe (1366 and 390, 22 loads)        | 0 violations except `scrollable-region-focusable` (serious) on mission and lab at 390 → OPUS-003                  |
| Controls under 24 px in a dimension | nav "How it works" (81×20 text link), "Back to missions" (100×19 text link), stage Zoom/Pan (20–22×32) → OPUS-004 |

## What works well (observed)

- The 1366×768 Chromebook workstation keeps the program, stage and prediction panel visible together. "Lock prediction & run" is visible without scrolling.
- The distance ray is drawn with the actual reading ("24.0 cm") at the sensor. The stage uses a dark technical surface that contrasts clearly with the warm-neutral page.
- The keyboard focus ring is a clear 3 px ring (`focus-ring-save.png`), and "Skip to content" is the first Tab stop.
- At phone width a notice honestly says a laptop gives Blockly more room, and the controls stay reachable.

## Usability problems (with the problem each fix would solve)

1. **OPUS-003 (P2):** at 390 px the learning-cycle strip is cut off at "5 Inves…" and can't be scrolled by keyboard. Keyboard users can't read the later phases.
2. **OPUS-005 (P3):** at 1366/1440 the toolbar wraps, so "Keyboard shortcuts" sits alone on a second row. Two save labels appear ("Saved locally." in the header and "Saved on this device" in the strip), which is redundant but not wrong.
3. **OPUS-004 (P3):** the stage zoom/pan glyph buttons are narrow, making touch Chromebooks harder to use.
4. **OPUS-006 (P3):** the unknown-mission recovery link looks like body text.
5. At phone width the "Speed" label wraps onto its own line under the toolbar. Minor.

## Not reviewed

Dark mode, high contrast and large-text settings were not captured in this round. Printing was not exercised. No assistive-technology (screen reader) session was performed, so no WCAG conformance claim is made.
