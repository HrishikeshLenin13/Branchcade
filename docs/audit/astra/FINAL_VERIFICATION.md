# Astra final verification

Starting SHA:02ce0dddafad5d0b9bd9e529bb0641a0a4e2fd80. Main only. Initial findings:045744c32d48bd8c53e5894f63a2e02b7452284e, pushed and remote matched. Repaired source6d606d6 and its exact-SHA GitHub CI are verified below; the containing documentation commit is checked separately after push.

## Independently observed

- Clean npm ci, pinned Node 24.22.1/npm 11.19.0. Baseline457 tests/36 files and109 Chromium browser tests pass.
- New original-source failures:6 selected storage regressions fail; same-ID cache 24→12 incorrectly reuses MOVE;200 mixed mission records commit then fail load's structural preflight.
- Repaired local unit suite:478/478,39 files. All 113 Chromium and 113 Firefox tests pass, retries 0.
- Production capture66 route/viewport loads with0global overflow,0 page/console exceptions and22 axe checks0 violations. M01all 6 sizes and9 other routes opened visually. No physical-device/screen-reader certification.
- Persistent browser-process restart smoke: Chromium 156.0.8078.4,Firefox 157.0,WebKit 27.2 all pass; M01real24<20false execution, exact comparison selection, save, close process, relaunch same temporary profile, Progress attempt visible. No external origins or page exceptions in the observed journey. WebKit is not the full maintained suite.
- Actual M01learning investigation/probes/30cm and12cm experiments/distinct transfer/durableProgress rehearsal passes; synthetic only. Evidence/rehearsal provenance note explains the reused script's old hardcoded date and precommit HEAD field.
- Rollback tested only on a disposable marked copy: six old failures return; repaired live source unchanged. All restored source bytes equal02ce0dd. See evidence/VERIFICATION.txt and raw transaction logs.
- Existing engine/interpreter/mission snapshots/public assets/package lock are unchanged from02ce0dd. Original specification hash and independent-findings checksum verified.

## Failure accounting

- Baseline documentation commit045744c CI40190117520 failed only generated JSON formatting. The report was formatted, not suppressed; this is not called green.
- Earlier local gate launches raced newly produced JSON/ongoing formatting and failed format:check. Final static gates are rerun only after captures/reports are complete.
- First repaired browser run:6 pass/1 fail. An intervening remote save correctly rejected stale deletion; the test had assumed unconditional deletion. The revised test asserts visible CAS conflict recovery. That exposed the real behind-modal error alert, now fixed. New focused storage browser suite 4/4 passed, retries 0.
- The preserved Opus natural-gesture script successfully ran 9 drag/connect/detach/Undo checks, then timed out opening a numeric field with a single click on current Chromium. Its failure is retained. The adapted Astra rerun uses the existing double-click field interaction; outcome is recorded separately. No application behavior was weakened to satisfy it.

## Reproduction

```sh
npm ci
npm run format:check
npm run scan:secrets
npm run verify:spec -- modified
node scripts/verify-k-docs.mjs
npm run check
npm run test:e2e -- --workers=2 --retries=0
npm audit
```

Use `.nvmrc` Node 24.22.1. Build fresh before standalone browser scripts; do not confuse a stale preview with current source. Completed local totals and independently checked source CI appear below.

## Repaired source checkpoint

Committed and pushed **6d606d6a418f25a8bf5ac3aef141e89f4308ce05**; `git ls-remote origin refs/heads/main` matched immediately after push. [Source workflow40225633060](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40225633060) is the exact source check; it completed success with zero failures/flakes/retry-recovered cases, as verified from raw logs. Documentation-only finalization follows this source checkpoint and also needs its own CI check.

Natural Blockly rerun:21/21 checks passed after adapting the field gesture to double-click, with0console/page errors. Real toolbox drag/snap, detach/reject, Undo/Redo, field typing, comparator dropdown, M03v3all-goal run, transfer, Finish, reload and Progress were performed. `scripts/astra-blockly-journey.mjs` is explicitly adapted from the preserved Opus script, not claimed as an independently invented21-case test design. Raw evidence is in evidence/blockly-verified/ and blockly-verified.log.

## Completed final local gates

`npm run check && npm run test:e2e -- --workers=2 --retries=0 && npm audit`: exit0. **478/478 unit tests in 39 files;113 Chromium +113 Firefox =226/226 browser tests**,0 failed/flaky/retried/skipped; browser summary **226 passed (7.3m)**; npm audit 0 vulnerabilities. Raw output: evidence/runtime-final.log; machine summary: evidence/local-final-summary.json. Unlike earlier sessions, the maintained local Firefox 157browser launched and completed its full suite here.

Final static chain: format/secrets/spec/K-doc guard/lint/typecheck all exit0 after captures were formatted. Raw output: evidence/static-final.log. Fresh npm ci was performed first; its warning about unsupported ESLint9 and the existing lazy Blockly bundle warning are retained. No dependency was changed just to hide either warning.

Concurrent deletion/export supplementary check passed in Chromium 156,Firefox 157andWebKit 27.2: start with a genuinely executed attempt, click clear and export concurrently in separate tabs, open/replay-validate the downloaded JSON, check no orphan draft references, then reload and confirm empty Progress. Each observed export coherently contained the 1 before-deletion attempt while the final stored count was 0. This establishes snapshot coherence, not a promise that an export initiated during deletion excludes the previous snapshot. Script/evidence: `scripts/astra-export-race.mjs`, evidence/export-delete-race.json/log.

## Verified source CI

[GitHub Actions40225633060](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40225633060) completed **success** for **6d606d6a418f25a8bf5ac3aef141e89f4308ce05**. Raw job logs were downloaded and inspected:478 unit tests/39 files,113 Chromium +113 Firefox =226 browser tests;0 failed/flaky/retry-recovered/skipped tests; npm audit 0 vulnerabilities. Every install/static/check/build/browser/audit step succeeded. The failure-artifact upload step was correctly skipped; that is not a skipped test. Evidence: source-ci.json, source-ci-summary.json, source-ci-tests.log.

The containing final documentation commit will have a different SHA; its exact CI is independently checked after push and reported to the owner. This record deliberately names the preceding verified source checkpoint rather than inventing its own containing-commit hash or CI result. All source/tests are unchanged after `6d606d6`; finalization adds reports, real evidence and reusable QA scripts.
