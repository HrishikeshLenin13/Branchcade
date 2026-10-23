# Design system foundation

The initial direction follows the prompt's robotics-laboratory vocabulary, without claiming a completed Part D–L polish audit. The stage is the hero; code and trace are supporting instruments. Home is an invitation to make a prediction, not a fabricated metrics dashboard.

## Tokens

- Canvas #F6F4EF, paper #FFFFFF, ink #17212B, secondary #52616D, boundary #DDE2E4.
- Focus blue #276689, action/deep slate #253D46, robot amber #EDB651, measurement cyan #6CC4D3.
- Stage #14212A, world #192832, grid #2B404B.
- Locally bundled Geist Variable for human-facing text; IBM Plex Mono for measurements/code.
- 4/8/12/16/24/32/48 spacing; controls 8–10px and major panels 12–16px radii. At least 40px button targets.
- Custom original SVG robot, stage, grid, ray and obstacle. No proprietary branding or decorative stock assets.

## Layout and behavior

```text
Header: brand | working navigation | settings
Home:   focused invitation | actual centimeter world
Lab:    world + readings + code | locked-prediction instrument
        trace → diagnostic evidence → experiment → transfer
```

The desktop layout uses two unequal columns, not repeated dashboard cards. At 900px the main lab stacks; at phone widths the learning controls remain usable and the Blockly workspace scrolls within its own bounded area. The stage's physical state never depends on layout. Disabled prediction controls explain that the result is locked. Disabled trace controls identify their endpoints. Empty instructor/progress screens show no sample learner results.

Default light shell/dark stage, persistent full dark preference, high contrast and larger text are implemented. Native semantic fields and selectively customized shadcn/Radix button/dialog primitives supply focus/keyboard behavior. Global ? help does not intercept typing. Escape closes dialogs. Reduced motion honors both device and local preference; there is no autoplay audio.

## Visual verification

Selected actual screenshots live in docs/evidence. Browser/a11y evidence and any corrected defects are recorded in TEST_REPORT and INTERACTION_AUDIT. No Figma reference was supplied; no Figma or pixel-perfect claim is made. An initial button-link foreground issue was found by screenshot inspection and repaired before the final gate.
