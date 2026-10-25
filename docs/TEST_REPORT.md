# Branchcade verification history

## Post-L Opus independent audit and repairs (2026-10-25)

Baseline `617b83d` (CI [40140698354](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40140698354) success). Linux cloud container, Node 22.22.0 (Node 24 unavailable here), Chromium 153 through Playwright with the preinstalled binary. Firefox was not available locally, so Firefox evidence comes only from GitHub CI. Full detail: [docs/audit/](audit/OPUS_INDEPENDENT_AUDIT.md).

| Check                                                            | Actual result                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline `npm ci` + `npm run check` at `617b83d`                 | 0 vulnerabilities; lint, strict TS, 396/396 tests in 29 files, build pass                                                                                                                                          |
| New independent audit suites (`tests/opus-audit-*`)              | 51 tests: 26 physics oracles, mutation probe of 8 missions, diagnosis journeys, 86 counterexample rechecks, hostile imports                                                                                        |
| Baseline browser sweep                                           | 66 route/viewport loads: 0 overflow, 0 console/page errors, local-origin only; axe found 1 serious issue at 390 px (OPUS-003)                                                                                      |
| Defects confirmed                                                | P0 1, P1 1, P2 1, P3 6 ([register](audit/OPUS_BUG_REGISTER.md))                                                                                                                                                    |
| After repairs: `npm test`                                        | 457/457 in 36 files                                                                                                                                                                                                |
| After repairs: local Chromium E2E (`CI=1`, retries 0, 2 workers) | 109/109 passed ([log](audit/evidence/after-repairs/chromium-e2e.log)). An earlier run of the same tree caught a 1366 px layout regression from the first OPUS-003 attempt (3 failures); it was fixed before commit |
| OPUS-001 E2E against unrepaired source                           | Failed as intended: expected 1 attempt, received 0 ([log](audit/evidence/after-repairs/opus-001-e2e-on-unrepaired-source.log))                                                                                     |
| After repairs: browser sweep                                     | 66 loads: 0 overflow, **0 axe violations**, 0 console/page errors, local-origin only                                                                                                                               |
| Final gates and CI                                               | Recorded in [OPUS_FINAL_VERIFICATION](audit/OPUS_FINAL_VERIFICATION.md)                                                                                                                                            |

## Part L — fresh release verification (2026-10-24)

Clean main fast-forwarded from `abd9d0a` to fetched `3d8b5f5c3fbc4a076c30d1c17bd03181dd306d1e`, preserving all Part K work. Its [baseline CI 40133267764](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40133267764) was independently checked completed/success. This is a new local verification, not a restatement of Part K counts. No runtime source, dependency/lockfile or frozen mission change is made in L.

| Local command/check                                                               | Actual result                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                                                                           | macOS27.0.1 arm64; selected Node24.22.1, npm11.6.2; system default Node24.13.0                                                                                                                                                  |
| `npm ci`                                                                          | Fresh 416 packages installed; 0 audit vulnerabilities; [install log](evidence/l/install.log)                                                                                                                                    |
| `npm run check`                                                                   | Lint, strict TypeScript, 396/396 tests in 29 files and production build pass; [check log](evidence/l/check.log)                                                                                                                 |
| `npm run format:check`, `npm run scan:secrets`, `npm run verify:spec -- modified` | Baseline pass; final edited-document results recorded below after execution                                                                                                                                                     |
| `node scripts/verify-k-docs.mjs`                                                  | Baseline pass:15 documents,93local targets,16workbook concepts; human obligations remain pending; L status guard now permits explicitly authorized continuation                                                                 |
| `npm audit`                                                                       | 0 vulnerabilities                                                                                                                                                                                                               |
| `CI=1 npm run test:e2e -- --project=chromium --workers=2 --retries=0`             | 105/105 passed in1.8minutes; 0 failed/skipped/retried; [full browser log](evidence/l/chromium.log)                                                                                                                              |
| Focused local Firefox                                                             | Browser launch failed before page/app code: “Could not find profile folder.” 1 selected test could not run; 0 local Firefox passes; [launch log](evidence/l/firefox-launch.log). Final Ubuntu CI must independently run all 105 |
| Real production walkthrough                                                       | Extended existing demo runner with L output/console/network/layout/trace capture; M01 wrong STOP→24<20 false/else→source comparison→probes→wall30/12 experiments→distinct transfer→Finish/save/reload/Progress passed           |
| Browser errors/privacy                                                            | 0 page errors, console errors/warnings, failed requests or HTTP errors; all requests local-origin-only; [raw observations](evidence/l/rehearsal.json)                                                                           |
| Static-preview paths/assets                                                       | Direct Home, M01, Lab, Settings, favicon, Blockly SVG and initial hashed JS/CSS return200 with correct MIME; [observations](evidence/l/static-preview.json); not a public-host/rewrite/header certification                     |

Full Chromium regression covers Home/onboarding, all8 missions and transfers, genuine Blockly edits/execution, deterministic simulator/debugger/replay, diagnosis divergence, experiments, team2–6, progress/instructor local records, settings/import/export/reset/delete, storage failures/recovery/unknown routes, axe/keyboard and responsive actions. Source-only inspection is not presented as equivalent to UI execution. No application defect was established during the focused L smoke.

The actual rehearsal screenshots `evidence/l/readme-workbench.jpg` (1440×1000), `chromebook-workbench.jpg` (1366×768), `m01-trace.jpg` and `counterexample.jpg` were all opened and inspected. Real blocks/stage/24cm/prediction controls are visible; comparison row02 is selected in the trace; 12cm produces true/stop with unchanged20threshold. Each capture measures document width equal to viewport width. Blockly retains its internal scrollable workspace; a scrolled QA frame is not a full-page video. No physical-device or formal accessibility certification is claimed. Trace: `../l-smoke-trace.zip` outside Git, synthetic actions only.

The first Firefox selector used an anchored grep that found no full test title; corrected unanchored selection then actually launched Firefox and reproduced the environment failure above. Neither invocation is counted as passing. No tests were skipped or assertions weakened. Build retains the documented799 kB lazy Blockly warning and locked ESLint9 deprecation; no unjustified package upgrade was made.

Final edited-tree local gates passed: format, secrets, modified-spec guard, K document guard (15 documents/98 local targets/16 concepts), lint, strict TypeScript,396 tests/29 files, build and audit 0; [raw final gates](evidence/l/final-gates.log). The new layout observer initially referenced bare `document` in a Node lint scope; it was changed to the already-declared browser `window.document`, and the full gate chain was rerun successfully. [Initial tooling-lint output](evidence/l/initial-tooling-lint.log) is retained. Seven release/handoff docs had55existing local Markdown targets checked; original-spec baseline and disposable-copy rollback checks passed ([rollback log](evidence/l/rollback.log)). No source file was rolled back.

Observed remote L results follow below. [PART_L_ACCEPTANCE](PART_L_ACCEPTANCE.md), [RELEASE_READINESS](RELEASE_READINESS.md) and [HANDOFF](HANDOFF.md) separate verified engineering from pending hosting/video/student review/eligibility/submission.

### First remote L checkpoint — additional test race found

[CI 40139396432](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40139396432) on pushed `1b39b337259b580b78d013a7ecfa5933756859ec` completed overall success:396 unit tests, all quality gates/audit 0 and all 210 browser cases ultimately passed. Its detailed log nevertheless reported **1 flaky Firefox case**, the shell/explanation navigation journey at `e2e/ij-interactions.spec.ts:214`. It was not accepted as a zero-flake final checkpoint. [Step metadata](evidence/l/first-ci.json) and [literal summary including the retry](evidence/l/first-ci-summary.log) preserve this result. Failure screenshots/traces were named in the log, but the workflow's failure-only artifact upload did not run because the retry passed; no downloaded Firefox screenshot/trace inspection is claimed.

The first attempt timed out waiting for Home's Resume link after Save and a full-page `goto('/')`. Save inserts a draft into the in-memory session before awaiting its IndexedDB write; the existing Resume-visible assertion therefore did not establish durability. The test now waits for the explicit “World, code and learning stage saved on this device.” completion message and the header's “Saved locally.” acknowledgment before unloading. The application's saving indicator/guard and persistence logic are unchanged. This is a test synchronization repair; no lost completed-save app behavior was established. Every original link, route and compact-menu assertion remains; no timeout/retry policy was changed.

Eight unmodified Chromium repetitions passed locally, so that run did not independently reproduce Firefox's timing. The exact failure was observed in remote Firefox. After the repair, **10/10 Chromium repetitions passed in 39.1 seconds with two workers and retries 0**; [before](evidence/l/resume-before.log) and [after](evidence/l/resume-after.log) results are retained. The next full remote run must verify both browsers; local Firefox's startup limitation remains separate.

### Repaired Part L source checkpoint — clean cross-browser CI

[GitHub Actions40140143019](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40140143019) on `1795b8b35922b6ad06ba141fd6f939f056da888d` completed success. Its actual log was parsed per project: **396/396 unit tests in 29 files,105 Chromium+105 Firefox (210/210 browser cases),zero failed or flaky tests and zero retry markers**. All install,format,secrets/spec,ESLint,strict TypeScript,production build and audit steps passed; audit 0 vulnerabilities. [Step metadata](evidence/l/repaired-ci.json) and [counts/retry evidence](evidence/l/repaired-ci-tests.json) are committed. The six-line navigation-test synchronization repair preserves the complete link/menu journey and does not change application persistence or global retries/timeouts.

Part L technical verification and operational/release documentation are complete at this source checkpoint. The subsequent record-only commit is pushed and its exact final CI is inspected before the user checkpoint; it is not automatically covered by this parent run. Hosting,video,student contribution/disclosure/eligibility,optional study and actual submission remain pending. Text evidence logs have trailing whitespace normalized for Git; test messages/outcomes are preserved.

## Part K — documentation and actual production rehearsal (2026-10-24)

Baseline/fetched source: `abd9d0a50abb30afd2d46057caac7ddfb90f4a9d`, clean main. Its [CI 40129455981](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40129455981) was independently checked: completed/success. Part K modifies documentation plus reproducible audit scripts, not the application, lockfile, frozen mission v1 or engine/mission versions.

| Executed local gate              | Actual result / evidence                                                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh maintained runtime/install | Node 24.22.1, npm 11.19.0; npm ci passed; `evidence/k/baseline.log`                                                                                                                                       |
| npm run check                    | Lint, strict TS, 396/396 tests in 29 files and production build passed                                                                                                                                    |
| Baseline format/secrets          | Passed; later final document gates recorded below                                                                                                                                                         |
| Spec guard                       | First no-mode invocation failed; corrected `npm run verify:spec -- modified` passed, guard/source unchanged; `evidence/k/spec-audit.log`                                                                  |
| Dependency audit                 | 0 vulnerabilities after corrected spec check                                                                                                                                                              |
| Production Chromium              | 105/105 passed, 0 failed/skipped, 2.8 minutes; workers 2/retries 0; `evidence/k/chromium.log`                                                                                                             |
| Real synthetic demo              | M01 → adaptive probes → generated wall experiment 30/12 → transfer 32 / <35 → durable reload/Progress; 0 page errors; only production-local request origin; `evidence/k/rehearsal.json` / `rehearsal.log` |
| Browser MCP inspection           | Playwright current M01 trace selects comparison row 02; 40 cm probe rationale; DevTools isolated M01 no warn/error and no fetch/XHR at inspection                                                         |
| Visual review                    | Actual 1440×1000 JPEG workbench/trace/counterexample opened; initial README framing omitted Blockly and was corrected by collapse/scroll, not app changes                                                 |

No new local Firefox success is claimed: existing profile-launch limitation persists as a documented workstation issue. The green fetched CI supplies 105 Firefox browser checks; later Part K CI must be separately observed. No human study, student-authorship verification, recording/duration/upload, eligibility certification or public deployment is implied.

Rehearsal development caught a stale foundation-title expectation; fresh source correctly renders **The Wall Problem**, and the tool assertion was corrected. Initial prebuild MCP views were not accepted as latest-source proof. A zsh wrapper used read-only `status`; the raw results were inspected and later wrappers use `result`. These are tooling corrections, not hidden test skips or established application defects.

Final prepared-package gates, checked commit and CI are appended below when observed. Acceptance: [PART_K_ACCEPTANCE](PART_K_ACCEPTANCE.md).

### Prepared-package local final gates

After all prepared materials and both scripts were added, the maintained-Node final gate chain exited 0: `npm run check` (396/396 tests, 29 files, lint/TS/build), `npm run format:check`, `npm run scan:secrets`, `npm run verify:spec -- modified`, `node scripts/verify-k-docs.mjs` and `npm audit` (0 vulnerabilities). The document preflight passed **15 documents, 92 local Markdown targets and 16 workbook concepts**, including human-pending safeguards. Raw complete stream: [final-gates.log](evidence/k/final-gates.log).

The final rehearsal rerun passed against the fresh production build; all three JPEGs were reopened and inspected after capture. [Disposable README rollback](evidence/k/rollback-verification.log) restored original bytes on a separate temporary copy while the live README stayed modified. `git diff abd9d0a -- src public package.json package-lock.json .github` was empty. Frozen mission v1 SHA-256 remains `44c196ded31be62883ee37a90394fab45f962086875821e2ec40bd31064e14e0`; original spec remains `f018432925c785df980a763f4da9c7ff9a3433d71ec54c65f2e52308a0a7244d`.

The existing large lazy Blockly chunk warning remains documented; no app regression was found. New Part K CI is recorded in a subsequent observed checkpoint, not inferred from these local results.

### Observed Part K pushed checkpoint

Checkpoint `8d562aa5d91f607ba599dd334fc8170a3c41aa6a` was pushed directly to main, remote SHA matched, and [CI 40132539841](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40132539841) completed **success**. Its actual log reports 396 tests/29 files and 210 browser cases passed (5.7 minutes), with no failed/flaky/skipped summary; the configured projects contain 105 Chromium and 105 Firefox cases. Every install/format/secrets/spec/lint/typecheck/build/audit gate succeeded; audit 0 vulnerabilities. Structured completed job/step evidence: [first-checkpoint-ci.json](evidence/k/first-checkpoint-ci.json).

The full prepared-material bundle was then committed/pushed as `986c7add51f70845cdf6f9b6d16bd9ec3e7db963`; remote SHA matched. The subsequent evidence-only checkpoint records the preceding verified run rather than inventing its own future CI result. Inspect the [main quality workflow](https://github.com/HrishikeshLenin13/Branchcade/actions/workflows/ci.yml) for the exact later commit/run result; the final chat handoff reports the observed final pushed run separately. Runtime source remains identical to the green A–J baseline.

Supplementary current-source **1366×768** Playwright MCP capture was opened: [Chromebook-sized workbench](evidence/k/chromebook-workbench.jpg). The full prediction action is visible after a deliberate 250px scroll (y472.59, height44px); lower Blockly content continues normally below the viewport. This is not physical-device evidence. The documentation preflight then passed 15 documents/**93 local link targets**/16 concepts; all 25 distinct workbook test-file paths were reopened and verified to exist. No participant findings, student source work, recording/upload or deployment was added by these checks.

## Parts I/J red-CI repair — final verified run (2026-10-24)

Source commit: `fddd0652554673081bc09b9ca4d6b3f402388044` on `main`. [GitHub Actions run 40128767480](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40128767480) completed successfully across all gates:

| Gate                              | Result                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `npm ci`                          | passed                                                                                |
| `npm run format:check`            | passed                                                                                |
| `npm run scan:secrets`            | passed; 280 source/document paths                                                     |
| `npm run verify:spec -- modified` | passed                                                                                |
| `npm run check`                   | lint and strict TypeScript passed; 396/396 tests in 29 files; production build passed |
| `npm run test:e2e`                | 210/210 passed: 105 Chromium and 105 Firefox; no failures, retries or flaky tests     |
| `npm audit`                       | 0 vulnerabilities                                                                     |

### CI failures investigated and corrected

- The mission-card “Start mission” click really navigates to `/missions/m01`. The test’s global exact-name heading lookup matched both the recommendation heading and the mission-page heading. The test now asserts the route and unique main-region H1. This was a locator bug, not a navigation defect.
- `answerAs()` queried the question count and then separately read an ID. On the final answer, React legitimately removes the question after recording terminal evidence, so those two locator operations raced. The helper now reads all IDs in one DOM observation and recognizes the valid terminal state by checking the enabled “Generate a targeted experiment” action. Investigation logic was not stuck; the test assumption was wrong.
- Full-suite repetitions also exposed test-only timing/fixture issues: replay could reach its terminal cursor before a step assertion; the 180-statement Blockly stress setup loaded unrelated heavy worlds; the cancellation fixture exhausted its execution budget before a cancel click; and the roster test left the progress page before the newly created solo alias had visibly completed its local save. The tests now use the actual enabled replay state, a focused Blockly fixture and test-specific render budget, a running wait-loop for cancellation, and observable alias plus “Saved locally.” synchronization. No app code defect was found.

The roster-preservation test passed **10/10** local Chromium repetitions with retries disabled. The final Actions suite passed every browser test on both remote projects. Local Firefox startup remains unavailable on this workstation (Playwright could not find its profile folder); the successful Ubuntu Actions Firefox run is the cross-browser verification.

The fixes were pushed directly to `main` in commits `175487c`, `7ccd12b`, `a57e9e2`, `6c96612`, and `fddd065`. No branch, pull request or force push was used. Parts K and L were not started.

Date:2026-10-22 (America/Chicago). Scope: master-prompt Parts A–C / Phase00 foundation with one real learning slice, not the complete release.

| Gate                              | Actual result                                                           | Evidence                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Fresh maintained runtime          | Node v24.22.1, npm11.19.0, npm ci passed                                | evidence/node24-gates.log                                                                                       |
| Format / lint / strict TypeScript | passed                                                                  | final-node24-check.log; CI                                                                                      |
| Vitest unit/integration/component | 86 passed across8 files,0 failed                                        | final-node24-check.log                                                                                          |
| Production build                  | passed, static dist/ produced                                           | final-node24-check.log                                                                                          |
| Browser production preview        | 54 passed,0 failed,0 skipped;27 Chromium +27 Firefox                    | production-browser-tests.log                                                                                    |
| Initial-route axe                 | 11 routes per browser,0 reported violations                             | persistent E2E; not a full accessibility certification                                                          |
| Full dependency audit             | 0 vulnerabilities at current lock                                       | node24-gates.log and successful GitHub audit step                                                               |
| Secret/spec checks                | passed; original hash preserved                                         | scan script, VERIFICATION.txt, CI                                                                               |
| Rollback                          | separate spec copy restored byte-for-byte; applied SPEC remains changed | VERIFICATION.txt / ROLLBACK.sh / DIFF_FILE.patch                                                                |
| Remote source CI                  | success on7a9d211, run39894586457                                       | evidence/github-ci.json and [Actions](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/39894586457) |

## Commands actually run

```bash
npm exec --yes --package=node@24.22.1 -- sh -c 'node --version && npm --version && npm ci && npm run format:check && npm run check && npm audit'
npm exec --yes --package=node@24.22.1 -- npm run check
npm exec --yes --package=node@24.22.1 -- npm run test:e2e
npm run scan:secrets
npm run verify:spec -- modified
```

The initial clean install used85 tests; the final source added one actual IndexedDB save-queue regression, giving86. E2E reused a real `npm run preview -- --port 4173 --strictPort` static production build. CI uses its own clean build and browser installation on Ubuntu; no local dev server is assumed there.

## Failures found and repaired, not concealed

- Initial OR truth-table expected value was wrong; corrected the fixture and kept the test.
- Blockly ESM locale/declaration mismatch failed headless import/build; namespace string-entry loading fixed both. shadcn generated aliases/imports were corrected and tested.
- Initial screenshot exposed a dark primary-link foreground. Corrected and visually rechecked.
- Initial Chromium exact Theme label lookup included options; explicit accessible select name fixed it.
- Initial GitHub run39893940001 passed install/format/secrets/spec/unit/build, then50/52 browsers. Immediate refresh raced pending IndexedDB saves in team/settings. Added ordered pending-write acknowledgment, stale-success-message clearing, deduplicated initialization and beforeunload guard. Reload assertions now wait for observable durable-save acknowledgment, not an assumption that clicking synchronously commits IndexedDB. No test skipped or failure ignored. New source CI passed all54 tests.
- Chromebook screenshot placed Run partly below the fold. Compact prediction spacing fixed it; measured y706.7/height40 in768px viewport and added a ratio1.0 viewport regression.

## Actual manual/browser and visual review

Context7 docs for Vite/Zod/Blockly, shadcn registry/audit, Playwright MCP interactive actions, Chrome DevTools MCP console/network/performance were used. Figma was not used without a reference.

Screenshots actually opened: Home1440×900, Home390×844, M01 prediction1366×768, full trace/probe/experiment view. No observed global clipping at reviewed sizes. Automated overflow/navigation also covers1024×768. Representative natural SVG obstacle dragging was tested with real pointer events. Blockly Undo/Redo/Apply and headless serialization were exercised; natural Blockly block dragging is not claimed.

Production-preview Home console:0 warnings/errors at inspection; no fetch/XHR. Local unthrottled trace: LCP282ms, CLS0.03. Earlier dev trace:1641ms/0.04. These different local runs are not controlled population benchmarks or deployment measurements. No claim of perfect performance or a public URL.

## Remaining limitations

Lazy Blockly chunk~790KB minified; warning retained. ESLint9 current jsx-a11y peer compatibility limits upgrade; audit0 does not erase that maintenance issue. No WebKit, physical Chromebook, formal accessibility certification, human study, learning-effectiveness statistics or public deployment. No later curriculum/phase gate is claimed. See INTERACTION_AUDIT and PARTS_ABC_ACCEPTANCE for exact current controls and scope.

## D/E local gate — 2026-10-23

Pinned Node24.22.1 final `npm run check`: lint and strict typecheck pass; **158/158 tests in14 files pass**, no skipped tests; production build passes. Full dependency audit: **0 vulnerabilities**. Formatting, secret scan, original-spec hash/current-scope validation and git whitespace check pass.

Production-preview Chromium final suite: **39/39 pass**, zero failed/skipped. Persistent specs are foundation.spec and product.spec. New coverage includes all8 authored mission/transfer/reload journeys, OR search/filter/preview recovery, world range/null truth and history, exact replay without extra attempts, and a synthetic imported infinite-loop safety fixture that stops and leaves the editor usable. Unit/React coverage adds all8 starter/reference Blockly execution roundtrips, goal failures for faulty starters, camera invariants, live sensor config, full persistence defaults, scoped export/merge, durable import rollback, multi-learner clear isolation, immutable transfers/hints, verified concept claims, team contribution gates/historical edited-program snapshots, and actual pause/resume cursor preservation.

During integration, the Chromebook primary action was found below the viewport, corrected through compact workstation spacing and optional prediction detail disclosure, and the original `toBeInViewport({ratio:1})` assertion passed. Updated E2E selectors reflect the new three-step onboarding, required role contributions/huddle, import strategy preview and typed erase; none of these new gates were bypassed.

Local Firefox could not launch:39 attempts failed at process startup, before any page/app behavior, with “Could not find profile folder.” A direct temporary-profile launch and an explicitly existing workspace-profile launch reproduced this environment error. Ubuntu GitHub CI remains configured to execute both Chromium and Firefox; its final remote result will be recorded separately. This is not labeled a passing local browser run.

Screenshot review: selected de-*.png files were actually opened. Desktop/Chromebook1366×768/1440×900 and phone390×844 screens were checked; automated overflow/navigation also covers1024×768. Initial WCAG A/AA axe scans pass all11 routes in Chromium. No WebKit/hardware/human study claim. Logs: de-check.log, de-chromium.log, de-audit.json.

### First remote integration run

Run 40033671253 on 6be463a passed installation, format, secret/spec checks, all 158 unit/component/integration tests and build. Browser results: 77 passed and 1 failed (all 39 Firefox checks passed). Ubuntu Chromium’s native scrollbar and font metrics wrapped the final toolbar item, leaving the prediction button about 0.6px clipped at 1366×768 (intersection ratio 0.98686). The artifact screenshot was downloaded and opened. Compact toolbar gaps and button padding were reduced to preserve a full row, and a new production browser regression reserves 15px of scrollbar width locally. The original full-visibility assertion remains unchanged. No retry or threshold relaxation masks the issue.

Final local post-fix rerun: all 158 tests, lint/typecheck/build and 40 Chromium browser checks passed. The added scrollbar-width case passes with full primary-action visibility.

### Verified remote checkpoint

GitHub run [40034287198](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40034287198) on source commit `fda537a9dda59104f79d3283c91aafea40ab0fe7` completed successfully. All **158 unit/integration/component tests** and **80 production browser tests (40 Chromium, 40 Firefox)** passed, with no failed or skipped tests. Format, secret/spec checks, strict typecheck, production build and full npm audit also passed. The native-scrollbar regression and the original Chromebook visibility assertion both passed on Ubuntu. Evidence: `docs/evidence/de-ci.json` and `de-ci-tests.log`. The local Firefox startup limitation remains explicitly distinguished from the successful remote Firefox checks.

## Part F checkpoint,2026-10-23

- Base bc4c9c0 clean/fetched/fast-forwarded; baseline158 tests and40 Chromium browser checks passed on Node24.22.1.
- Current npm run check passed lint, strict TypeScript,199 tests across18 files and production build.48 production Chromium E2E passed,0 failed/skipped. Cross-browser CI pending push verification.
- F suites cover numerical geometry/contact/sensors, small-step loop/function/cancellation/budgets, immutable code/tick replay,40 fixed historical trace fingerprints and mixed execution-version imports.
- All eight authored missions and distinct transfers, local reload durability,2–6 team flows, safe imports/exports, privacy and initial route accessibility continue passing. Null comparison and edit-lock tests were updated to assert the requested F behavior, not skipped.
- Playwright MCP verified Tick1 after Step tick, Tick10 after code action, exact comparison row24<20=false, and source error navigation with an actual highlighted Blockly condition. Chrome DevTools reported no warnings/errors and no fetch/XHR on the audited local page.
- An initial SVG footprint aria-label produced three axe failures; it was replaced with an SVG title and all unchanged axe checks passed.
- Limits rollback ran on /tmp/branchcade-f-rollback.ts and restored original bytes/behavior; src/domain/constants.ts remains changed. See evidence/f/VERIFICATION.txt for commands/outputs.

## Part F independent verification (friend #3), 2026-10-24

Base: `963ec3a` (clean, matches origin/main). Environment: cloud container, Node v22.22.0 / npm 10.9.4 (the repo pins Node 24 in `.nvmrc`; CI still uses Node 24). Chromium only locally: the project pins Playwright 1.64.1 (browser build 1248) while the container ships build 1243, so a local-only, uncommitted config pointed Playwright at `/opt/pw-browsers/chromium`. Firefox was not run locally.

- Baseline before any change: format, secret scan, lint, strict typecheck, **205/205** Vitest tests (19 files), production build, **49/49** Chromium E2E, `npm audit` 0 vulnerabilities.
- I re-read F1–F6 against `src/engine/*`, `src/interpreter/*`, `useTracePlayback.ts` and the F suites. Every F6 mandatory numerical case had coverage, but it was spread across five files. `tests/f-mandatory.test.ts` now maps each listed case to one assertion block (15 tests).
- **Defect found and fixed:** when the distance sensor origin sat on or beyond a world wall (floating-point rounding at contact, or a sensor offset larger than the chassis radius), `readSensors` skipped that wall and reported a far wall or `null`. Wall distances are now clamped at 0. The new test failed before the fix and passes after it.
- Playback reveal logic was extracted into the pure `revealCursor` so that 1× and 4× playback are proven to reveal identical events and the same final state.
- Comments on floor-zone tie-breaking were corrected: ties go by declared index, not lexicographic ID, which matches the behavior and tests.
- Real browser check (production preview, 1366×768): M01 shows `24 < 20 is false. Else branch selected`. Step tick gives Tick 1 · Paused. Step code animates the full motor action. "Why did that happen?" selects `compare · condition 24 < 20 is false`. 0 console errors and 0 non-local requests. Screenshot: `evidence/f/verify-m01-why-1366.png`.
- After the fixes: **220/220** Vitest tests (20 files), lint/typecheck/build pass, Chromium E2E rerun recorded in HANDOFF.

## Part G checkpoint (friend #3), 2026-10-24

Environment as in the Part F section: Node v22.22.0, local Chromium only.

- `npm run format:check` pass · `npm run scan:secrets` pass · `npm run verify:spec -- modified` pass · `npm run check` pass (lint, strict TypeScript, **267/267 Vitest tests in 21 files**, production build) · `npm audit` **0 vulnerabilities**.
- **Chromium E2E: 52/52 passed** (production preview, 4 files): the 49 earlier checks minus 2 obsolete static-probe journeys (replaced, not skipped), plus 5 new Part G journeys. Those are the two-learner split; the full helpers/experiment/transfer/reload journey; no forced diagnosis; Free Lab experiment; and axe WCAG A/AA scans of the investigation and experiment panels. The privacy check (no learner-content requests) was rewritten to walk the adaptive flow.
- `tests/g-learning.test.ts` (47 tests) covers: taxonomy completeness; ≥2 discriminating templates per idea (computed); seam neutrality on every mission and probe scenario; the mandatory two-student split; determinism; double counting, independence, conflict and downgrade; slip handling; C3 `Hypothesis` round-trip; a coverage check for all 14 ideas; counterexample validation, ambiguity rejection, no-candidate and fallback; transfer pool and adaptive difficulty; mastery rules; planner; G6 language; and import round-trip with tamper rejection.
- Measured, not assumed: only 7 of 14 ideas can make a first-action mission prediction wrong with the current missions (see PART_G_ACCEPTANCE). Cold counterexample search takes 4–182 ms per mission.
- Defects found while building G and fixed: (1) static "try next" copy contradicted generated experiments; (2) a correct learner was offered questions automatically, now only on explicit request; (3) nested quotation marks in labels; (4) M01 was not mapped to the comparisons concept even though it uses `<`, so the mapping now also reads ordering operators from the starter program; (5) a stale preview server once served an old build to E2E, so tests now always run against a fresh build.
- Real-browser walkthrough (1366×768, 1024×768, 390×844): wrong STOP → 4 possible ideas → "which part runs" question → "Might be: comparison direction" → generated "move the wall from 24 cm to 10 cm" experiment → transfer → "Why this next?" → evidence timeline after reload. 0 console errors, 0 horizontal overflow at the three widths. Screenshots were reviewed in the session; they were not committed.

## Part H checkpoint (friend #3), 2026-10-24

- Local (Node v22, Chromium): `format:check`, `scan:secrets` and `verify:spec -- modified` pass. `npm run check` passes: lint, strict TypeScript, **368/368 Vitest tests in 26 files**, build. **Chromium E2E 59/59.** `npm audit` 0 vulnerabilities.
- New suites: `h-goals` (new goal kinds and nodeless branch goals), `h-judge` (scenarios, concept check, versioned judging and import), `h-curriculum` (82 authoring checks over all eight missions, plus the AND/OR variant check and the completeness check), `h-completion`, `h-learning` (second question → evidence), and `e2e/missions-h.spec.ts` (7 journeys, including all eight reference programs completing their missions in the real workstation).
- **GitHub Actions:** run [40063268636](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40063268636) on `456c955` (F + G + early H) succeeded, and run [40064874934](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40064874934) on `c7e1091` (all Part H code) succeeded. That covers every step: npm ci, format, secrets, spec, check, Playwright install, **Chromium + Firefox E2E**, and npm audit. Intermediate runs were cancelled by the workflow's concurrency setting when newer commits arrived; they did not fail.
- Defects found while building H and fixed: (1) v1 goals tied to starter node ids would fail a correct, rebuilt program; (2) the first M02 v2 starter hid the colour-location idea from diagnosis (a measured regression) and was replaced; (3) only a wrong first action opened the investigation, now any wrong committed answer does; (4) the branch question was offered for programs with no if/else.
