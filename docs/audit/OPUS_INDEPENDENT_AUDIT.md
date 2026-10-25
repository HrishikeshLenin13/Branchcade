# Opus independent audit — baseline report (read-only round)

**This file is the preserved original.** It was committed before any production source changed and must not be edited during repairs. Later results go in [OPUS_REPAIR_REPORT](OPUS_REPAIR_REPORT.md) and [OPUS_FINAL_VERIFICATION](OPUS_FINAL_VERIFICATION.md).

## Checkpoint and environment

| Item        | Value                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audited SHA | `617b83daf96c136bd4105df7b0c015dc043f737a` (`main`, fast-forwarded clean from `968ff2e`, equals `origin/main`)                                                  |
| Baseline CI | [run 40140698354](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40140698354): success on this SHA (verified with `gh`)                           |
| Reviewer    | Claude Opus 5.5 in a Claude Code cloud container (Linux). Date 2026-10-25                                                                                       |
| Runtime     | Node 22.22.0, npm from lockfile (`npm ci`, 0 vulnerabilities). Note: `.nvmrc` asks for Node 24; Node 24 was not available here                                  |
| Browser     | Chromium 153.0.8010.12 headless, run through the Playwright library. **Firefox was not available locally**                                                      |
| MCP tools   | **No Playwright MCP or Chrome DevTools MCP server was available.** I used ordinary Playwright scripts with console/network listeners and `@axe-core/playwright` |
| Data        | Synthetic only: generated `Robot XXXX` aliases on fresh browser contexts                                                                                        |

Baseline gates I reran: `npm ci` OK; `npm run check` → lint, strict tsc, **396/396** unit tests in 29 files, build OK (Blockly chunk-size warning only). I did not rerun the full E2E suite. The existing 105 Chromium + 105 Firefox result is from CI and is cited as the existing suite's evidence, not mine.

## Method

1. **Independent numerical oracles** (`tests/opus-audit-oracles.test.ts`, 26 tests). Expected values come from separately written ray-marching and clearance-bisection code, not the engine's slab/quadratic/sweep formulas.
2. **Mutation probe of mission judging** (`tests/opus-audit-mutation.test.ts`). All 152 single-point mutants of the eight reference programs were judged, and every survivor was reviewed by hand.
3. **Synthetic learner journeys** through the evidence engine (`tests/opus-audit-diagnosis.test.ts`).
4. **Counterexample re-verification** (`tests/opus-audit-counterexamples.test.ts`). All 86 generated experiments were structurally diffed against their base and re-executed independently.
5. **Hostile imports** (`tests/opus-audit-import.test.ts`).
6. **Browser** (Chromium, production `vite preview` build):
   - 66-load route × viewport sweep with axe, overflow, h1, target-size, console and network capture (`scripts/opus-audit-sweep.mjs`).
   - Exploratory journeys (`scripts/opus-audit-journeys.mjs`): corrupt storage, unknown route, reload/back/forward, dialog focus, onboarding.
   - Multi-tab persistence (`scripts/opus-audit-multitab.mjs`).
   - Targeted probes (`scripts/opus-audit-probe.mjs`, `scripts/opus-audit-focus.mjs`).
7. Source reading of the storage/session layer, engine, interpreter motion stepping, judge, counterexample search and CSV export.

## Findings summary

| Severity | Count | IDs                                                 |
| -------- | ----- | --------------------------------------------------- |
| P0       | 1     | OPUS-001 multi-tab silent attempt loss              |
| P1       | 1     | OPUS-002 M03 completed by a never-driving program   |
| P2       | 1     | OPUS-003 phone learning-cycle strip keyboard access |
| P3       | 6     | OPUS-004 … OPUS-009                                 |

Details, reproduction steps and recommended fixes: [OPUS_BUG_REGISTER](OPUS_BUG_REGISTER.md). Requirement-level results: [OPUS_REQUIREMENT_MATRIX](OPUS_REQUIREMENT_MATRIX.md) (45 rows: 28 PASS, 4 FAIL, 10 PARTIAL, 2 NOT TESTED, 1 BLOCKED). Visual review: [OPUS_VISUAL_REVIEW](OPUS_VISUAL_REVIEW.md).

### Most important observation

The persistence layer keeps the entire learner envelope in each tab's memory and writes it back blindly. Nothing in `src/` coordinates tabs. Two tabs are common in classrooms (for example, a teacher opens Progress next to a running mission). An ordinary Save in a stale tab permanently deletes attempts made in the other tab, with no message. That contradicts the immutable-evidence contract, so I rated it P0.

### What held up under independent checking

- Physics and sensors agree with independent oracles to 1e-4 cm across rectangles, circles, diagonal corner contacts, world edges, touching starts, range limits, floor-colour sample points and seeded noise. No penetration was seen at any tick. Traces are deterministic.
- The diagnosis engine doesn't over-claim: one wrong answer leaves 4 possible ideas labelled "Need more examples". Different follow-ups separate learners, and repeated answers aren't double-counted.
- Every generated counterexample is a genuine single change whose stated result matches real execution.
- Imports reject prototype pollution, oversize input, deep nesting, unknown versions and extra keys. CSV cells are formula-escaped.
- Pages make no non-local requests and produce no console errors, and no route overflows horizontally at any of the six viewports.

### Corrections to my own harness (kept for transparency)

My first oracle run reported 2 failures, and my first counterexample recheck reported 3 mismatches. All five came from mistakes in my test code (an un-awaited async hash, a wrong expected heading, and a cache-key collision in my recheck). None was an application defect. The cache-key mistake does show a latent hazard in the application's memoization API, recorded as OPUS-007.

## Not tested by me in this round

- Real Blockly drag/connect/undo gestures (R07).
- Team mode at each size (R31).
- Full step-by-step mission journeys for M02–M08 in the browser.
- Instructor exports, printing, Firefox, WebKit, physical devices, screen readers, dark/high-contrast themes.

These rest on the existing automated suite and CI only.

## Logo

No owner-approved final logo exists in the repository or this workspace. A filesystem search of the container found none, and none was attached to the assignment. Status: **BLOCKED: APPROVED LOGO ASSET REQUIRED.** The existing `public/favicon.svg` and lucide `GitBranch` mark were left unchanged.
