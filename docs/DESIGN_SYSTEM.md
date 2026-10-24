# Design system foundation

Branchcade uses the prompt’s robotics-laboratory vocabulary: a physical stage, an editable program and trace-derived learning instruments. Home invites an actual prediction. The current Part I/J audit extends the earlier D/E foundation; evidence is browser-based and does not claim classroom effectiveness or physical-device testing.

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
Lab:    program | physical world + readings | prediction + trace
        diagnostic evidence → experiment → transfer
```

The workbench uses three columns above 1180px: program, world and prediction/inspector. Between desktop and phone the inspector moves below the program/world columns; narrow screens stack the instruments and retain a laptop advisory for spatial Blockly authoring. Panel widths have bounded sliders and a real reset. The Blockly workspace scrolls inside its container. World coordinates and execution do not depend on viewport dimensions. Guarded prediction controls explain locked results; trace controls identify their endpoints. Empty reports contain no sample learner results.

Default light shell/dark stage, persistent full dark preference, high contrast and larger text are implemented. Native semantic fields and selectively customized shadcn/Radix button/dialog primitives supply focus/keyboard behavior. Global ? help does not intercept typing. Escape closes dialogs. Reduced motion honors both device and local preference; there is no autoplay audio.

## Visual verification

Selected actual screenshots live in docs/evidence. Browser/a11y evidence and any corrected defects are recorded in TEST_REPORT and INTERACTION_AUDIT. No Figma reference was supplied; no Figma or pixel-perfect claim is made. An initial button-link foreground issue was found by screenshot inspection and repaired before the final gate.

## D/E implementation, 2026-10-23

The shell now uses a complete token vocabulary for semantic surfaces, syntax, selection, spacing, typography, z-index, focus and component states. The workbench places program, physical stage and contextual learning/trace instruments in three columns at desktop width. Panel-width controls have minimums; the inspector moves below on smaller screens and the phone view has a laptop advisory and usable simplified controls.

On 1366×768 the initial mission primary prediction action is fully visible: observed y=681.6, height=44. Confidence and optional reasoning use a disclosure so the core question stays in view. Camera operations alter SVG viewBox only. Real zone/robot/obstacle drag and numeric controls validate world geometry. Inline controls obey disabled states, focus and reduced motion. Blockly component themes follow the appearance tokens without modifying program state.

Actual visual review included Home, Onboarding, Mission library, How it works, Settings, Instructor, Progress, Team and the M01 workbench. Home/library/onboarding/settings/instructor/team were also checked at 390px. Selected screenshots: `de-home-chromebook.png`, `de-missions-desktop.png`, `de-onboarding-phone.png`, `de-workstation-chromebook.png`. Four-width automated checks cover 1440, 1366, 1024 and 390px; these are browser viewport tests, not physical-device claims.

## Part I/J visual and interaction review, 2026-10-24

The final production capture contains 93 actual screen states: 27 workflow/dialog/editor states plus all 11 routes at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024 and 390×844. Each structural frame measured document width; all 66 route/viewport checks had zero global horizontal overflow. The capture recorded no page exceptions. Only the local production origin served requests, including Blockly media; sound loading is disabled. See the [machine inventory](evidence/ij/control-inventory.json), [per-control matrix](INTERACTION_AUDIT.md) and [test report](TEST_REPORT.md). The inventory identifies visibility, and the matrix separately identifies exercised controls; an image alone does not establish an action result.

Eight selected frames were opened and visually inspected after the final production build:

| Viewport/state                     | Reviewed evidence                                                       | Observed result                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1920×1080 Home                     | [Home](evidence/ij/screenshots/home-1920x1080.png)                      | Hero copy and measured 24cm world have clear hierarchy; both starting actions are visible.                            |
| 1440×900 M01 prediction            | [Mission](evidence/ij/screenshots/mission-1440x900.png)                 | Three columns remain legible; the complete primary prediction action is above the viewport bottom.                    |
| 1366×768 replay                    | [Running mission](evidence/ij/screenshots/mission-running-1366x768.png) | Playing/paused status, speed and replay notice remain explicit; the stage represents the current trace tick.          |
| 1024×768 Lab                       | [Lab](evidence/ij/screenshots/lab-1024x768.png)                         | Program/world columns fit; wrapped toolbar controls remain named; the learning inspector follows in document flow.    |
| 768×1024 Instructor                | [Instructor](evidence/ij/screenshots/instructor-768x1024.png)           | Report scope, filters, imports and exports fit the tablet viewport and preserve explicit local-only wording.          |
| 390×844 Team                       | [Team](evidence/ij/screenshots/team-390x844.png)                        | Shortened title and wrapped session actions fit; compact navigation and Settings remain reachable.                    |
| 1366×768 counterexample, full page | [Experiment](evidence/ij/screenshots/counterexample-1366x768.png)       | The one-change comparison, locked answer, executed result and transfer action retain their order and labels.          |
| 1366×768 Blockly, full page        | [Blockly](evidence/ij/screenshots/blockly-1366x768.png)                 | Native program preview and visible block workspace agree; the spatial editor remains bounded with its own scrollbars. |

Two audit findings resulted in repairs. At 1440×900 the initial mission prediction action was partly below the fold because the compact desktop query only applied up to 820px height. Extending that query to 940px preserves the three-column layout and exposes the full primary action (final screenshot approximately y696–740). The six-size persistent route test now requires the complete button to be in view on desktop. Separately, controlled dialogs without a Radix trigger lost focus on close. The shared dialog primitive now remembers the actual opener, honors explicit caller focus handlers, and restores a connected opener. A primitive regression and actual route dialogs cover both default restoration and caller overrides.

Interface controls use semantic links, buttons, radios, checkboxes, selects, numeric inputs and disclosures. A visible focus ring, native validation, inline error copy and modal close semantics support keyboard use. Inspector tabs implement their tab roles and Arrow-key movement. Preferences retain system/dark/light appearance, larger text, contrast, motion and sensor-label choices; the runtime applies them after reload. These are tested behaviors, not an assertion that every possible contrast pairing or assistive-technology combination was manually certified. Blockly’s native spatial editing can require a pointer; the read-only pseudocode, source stepping, timeline and validation alternatives remain available.

The six sizes are simulated browser viewports. No Figma reference, classroom user study or physical-device review was supplied; none is claimed. Part K/L submission materials remain outside this pass.
