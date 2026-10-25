# Initial independent findings — frozen before Opus report comparison

2026-10-25. Source: `02ce0dddafad5d0b9bd9e529bb0641a0a4e2fd80`, main, clean fast-forward from `3d8b5f5`. User attachment summarized Opus issues; this was therefore not a blinded review. Detailed Opus audit reports have not yet been read. The evidence below comes from source inspection and newly authored adversarial tests, not adoption of prior conclusions. Do not revise this initial record to match subsequent results; use REPAIR_REPORT and OPUS_COMPARISON.

## Actual baseline

Node24.22.1/npm11.19.0, clean npm ci, lint/typecheck/build and 457 tests in36 files pass. Existing Chromium suite and independent66-route/viewport sweep are running; no final browser-suite claim yet. Production was rebuilt before inspection. Initial MCP requests preceded preview startup and returned connection refused; retry after server startup succeeded. A competing preview start correctly rejected occupied4173; no user process was killed.

Playwright MCP inspected M01's real24cm prediction and run controls. Chrome DevTools isolated context `astra-independent-baseline` loaded M01: no warning/error messages or fetch/XHR at that point. Full request-origin checks pending sweep.

## New reproduced storage failures (SPEC C4/E14/E15/J2)

`tests/astra-storage.test.ts`: **6 failed of6**, exit1 on baseline; raw evidence storage-before.log.

- ASTRA-001 P0: concurrent annotations choose the record with a larger annotation count, rather than preserving separate evidence. Equal-sized hint/experiment additions lose experiment assistance. Conflicting immutable traceHash is not rejected. Risks include false independent-learning credit and evidence corruption.
- ASTRA-002 P0: two same-tab queued saves use the last _committed merged_ envelope as the base for a stale pre-merge snapshot. The second save interprets foreign records as deliberate deletions. A real session-store/IndexedDB regression loses the foreign attempt.
- ASTRA-003 P0: erasure followed by a stale tab's NEW attempt saves an orphan with no learner. Existing old-ID deletion coverage does not cover newly created stale records. A destructive-operation barrier needs to reject stale edits, not silently resurrect or drop them.
- ASTRA-004 P0: null-base writes blindly overwrite existing data; write stamps are derived from the incoming snapshot instead of the current stored revision and can move backwards. Both are directly reproduced.

## Additional source risks requiring tests

- retryStorage uses blind saveData and may undo another tab's writes; import/erase are not actually part of the same serialized write queue.
- Replace-import goes through ordinary rebase and therefore need not implement the UI's promised exact replacement.
- Model memoization trusts caller keys; same-ID imported replacement scenarios could reuse old predictions. Need real call-path reproduction before claiming a production bug.
- Draft dirty state is set on mount, and any earlier asynchronous save can clear it despite a newer edit. Unapplied Blockly workspace edits are separately transient; text openly says Apply required, but navigation protection needs review.
- Header/toolbar density and small stage controls need visual inspection, not speculative redesign.
- No approved logo found by filename search in repository outside node_modules. No new identity asset invented.

No claim of full production readiness, complete spec coverage, public hosting, classroom effectiveness, student contribution or contest eligibility. Independent mathematical/mutation checks, full user journeys, failure recovery, deletion/import races and final CI are still required.
