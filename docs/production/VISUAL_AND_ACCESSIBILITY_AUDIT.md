# Visual and accessibility audit (final acceptance)

**Sweep** (`scripts/opus-audit-sweep.mjs` → `evidence/sweep/`): 11 routes × 6 viewports (1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844), Chromium 153, on `ae22d2e`.

| Check                            | Result            |
| -------------------------------- | ----------------- |
| Horizontal page overflow         | 0 / 66            |
| Exactly one `h1`                 | 66 / 66           |
| axe violations (1366 and 390 px) | **0** in 22 scans |
| Console errors / page errors     | 0                 |
| Network origins                  | local only        |

**Screenshots opened and inspected:** 1366 mission workstation, 390 team setup, 1024 instructor. They are consistent with the design system, and Astra's two-row laptop toolbar removed the orphaned "Keyboard shortcuts" button.

## Changed in this round

- **Disabled controls now explain themselves.** Stop, Stop & Edit, Rewind, Replay, Undo/Redo code, Undo/Redo world edit, Reset code, world-variant buttons, Save world (needs a name), Reset world, Clear saved labs, Assign mission (needs a team) and the locked world-editor section all have a `title` reason, which assistive technology exposes as a description. Disabled buttons can't show hover tooltips, so the toolbar also shows a visible hint: "Step, Rewind and Replay unlock after you run the program", and after a run, "Code and world are locked to this run. Press Stop & Edit to change them." The hint uses the toolbar's spare grid cell, so "Lock prediction & run" stays fully above the fold at 1366×768 (existing tests pass). Regression: `e2e/final-acceptance.spec.ts`.

## Keyboard

The skip link is the first Tab stop on every route and moves focus to `#main-content` (crawl). Dialogs trap focus and restore it on Escape (Opus audit). The learning-cycle strip is a focusable scroll region at phone width.

## Remaining limitations (not certified)

- Blockly block placement is spatial and pointer-first; keyboard and screen-reader editing of blocks is limited. The pseudocode view is the text alternative.
- No screen-reader or assistive-technology session was performed. Dark, high-contrast and large-text modes were not captured in screenshots this round.
- At 1024 px the Instructor "Select team" dropdown truncates its long default label ("All local teams and…"). Cosmetic; left unchanged.
- No WCAG conformance is claimed from automated checks.
