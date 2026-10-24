# Final A–C foundation test report

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
