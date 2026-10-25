# Final release acceptance — Branchcade (2026-10-25)

## Checkpoints

| What                        | SHA / link                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fetched at start            | `ae22d2e` (Astra hardening; CI green)                                                                                                                                                                  |
| Final **source** checkpoint | `1f195d6`: CI [run 40235203957](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40235203957) **success** (Chromium + Firefox E2E, unit, build, lint, types, format, secrets, spec, audit) |
| Reports commit              | the commit that adds this file (documentation only). Check its CI on GitHub                                                                                                                            |

## Results

| Gate                                                   | Result                                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Unit / integration                                     | **486 / 486** in 40 files (was 478 / 39)                                                                                              |
| Chromium E2E (local, `CI=1`, retries 0, 2 workers)     | **115 / 115** (`evidence/chromium-e2e.log`)                                                                                           |
| Firefox E2E                                            | CI only; the run's steps all succeeded. Per-test counts are visible on the run page                                                   |
| Build, lint, strict TS, format, secrets, spec          | pass                                                                                                                                  |
| `npm audit`                                            | 0 vulnerabilities                                                                                                                     |
| Every control activated                                | **502**: 463 visible effect, 31 disabled-with-reason, 8 accounted (file inputs, single-option dropdowns); **0 broken, 0 errors**      |
| Journeys (challenge pass on `1f195d6`, fresh contexts) | **208 / 208**: teams 2–6, Free Lab vs oracle, returning learner, recovery (106); Blockly gestures (21); all missions and exports (81) |
| Visual / axe sweep (challenge pass)                    | 66 loads: 0 overflow, 0 axe violations, 0 errors, local origin only                                                                   |
| Physics / judging                                      | 26 independent oracles; 152 mutants; structural wrong programs refused (new)                                                          |
| Performance                                            | cold loads ~180 ms; run ~111 ms; Blockly open ~360 ms; heap flat over 10 runs                                                         |

## Defects this round

| Severity | Found                                                                                                                           | Fixed                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| P0 / P1  | 0 new                                                                                                                           | —                                |
| P2       | 1 group: 22 controls (plus the world-variant and world-editor buttons) were disabled with no explanation, so they looked broken | `7bd8418` + regression E2E       |
| P3       | Instructor dropdown truncation at 1024 px; M05 `!= 12` (known)                                                                  | deferred, listed in RELEASE_GAPS |

Earlier P0/P1 issues (Opus OPUS-001/002, Astra ASTRA-001…006) stay fixed; their regressions are in the passing suites.

## Release decision (statuses as defined by the assignment)

- **ENGINEERING VERIFIED** for the local production build. Every mandatory feature in [FEATURE_CONTRACT](FEATURE_CONTRACT.md) passes, except F15 (logo, BLOCKED) and F16 (public deployment, NOT DONE). So **FEATURE ACCEPTANCE COMPLETE is not claimed** while the logo is pending.
- **DEPLOYMENT VERIFIED: NO.** No public origin exists.
- **LEGAL/ELIGIBILITY REVIEW PENDING.** The authorship history is the main risk ([CAC_SOURCE_OWNERSHIP_GAPS](../compliance/CAC_SOURCE_OWNERSHIP_GAPS.md)).
- **COMPETITION MATERIALS PREPARED: partly.** Drafts and checklist exist; the video, final answers and disclosure need the owner.
- **CONTEST SUBMITTED: NO.** Only the owner can do this.

No claim of bug-free software or legal compliance is made.
