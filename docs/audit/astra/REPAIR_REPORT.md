# Astra repair report

Starting source02ce0dd. Independent findings preserved at045744c before repairs were pushed. All datasets are synthetic.

## Data-integrity repair

- `storage/rebase.ts`: immutable attempt facts must match. Disjoint assistance is preserved; ordered diagnostic/experiment/retry histories must be prefix-compatible; conflicting revealed answers fail explicitly instead of choosing a longer array. Removing already-recorded assistance is rejected. Same-team concurrent edits fail explicitly. Mutable drafts/labs/assignments keep last-writer semantics.
- `app/session.ts`: capture each queued mutation's own starting snapshot, not the most recent merged commit. Serialize saves/imports/retry/erase on the same queue. Retry rebases instead of blind overwrite. Return committed records to the UI and ignore stale asynchronous broadcast reads.
- `storage/repositories.ts`: atomic read/rebase/write awaits transaction completion and aborts on validation/conflict. Stamps exceed current storage, incoming data and the reset barrier, including clock rollback. Initial baseless writers merge instead of erasing another first writer.
- Explicit import/delete replacement compares the reviewed dataset against current storage, rejects intervening changes and commits the exact replacement plus a non-identifying `reset-barrier` stamp atomically. Stale ordinary writes/retry cannot cross that barrier. Reset notifications stop stale mounted tabs in export/reload recovery mode. No learner tombstones or schema-version bump.
- `settings/LocalImport.tsx`: carry the pre-validation reviewed snapshot through asynchronous replay validation; do not accept a new base after validation and delete unseen records.

## Large datasets and learning correctness

- `storage/migrations.ts`, `domain/constants.ts`: imports retain their original20,000-node/500KB preflight. Local storage has a separate1,000,000-node bound, applied both before commit and after load; 200 mixed authored-scenario attempts now survive reading. Previously the app could persist an envelope it then refused to open. Existing strict versions/depth/keys/schemas remain.
- `learning/mental-models.ts`: compare serialized bounded world/program identity before cache reuse. Caller IDs remain labels. Account for identity memory and evict collided entries. Same-ID replacement scenarios no longer reuse old truth. No costly hashing dependency.

## Honest recovery and scoped UI

- `LabLesson.tsx`: manual Save checks actual session persistence status, not only a fulfilled promise; quota failure displays Not saved. Older saves cannot clear the dirty flag for later revisions or failed saves.
- `settings/Settings.tsx` and LocalImport: failure alerts render inside the active modal so keyboard/screen-reader users can perceive the conflict and recover.
- `workstation.css`: scoped laptop toolbar grid1300–1599px keeps every control, existing tokens, DOM order and wide/narrow behavior. No new visual system or logo.

## Tests and evidence

New persistent tests: `tests/astra-storage.test.ts`, `astra-additional.test.ts`, `astra-oracles.test.ts`, `e2e/astra-storage.spec.ts`. They cover independent simultaneous append, queued-save loss, immutable/annotation conflicts, reset/import races, recovery, monotonic revisions, cache identity,200-records, seeded analytic circle-contact oracles, all8reference/stop-only judges and v2/v3 distinction. Browser tests exercise real Save/clear/retry, notifications enabled/disabled, coherent exported JSON, close/reopen and injected quota failure.

Old tests were not skipped: local-records quota mock follows the new explicit replacement writer; the older erasure test now requires no orphan draft after learner deletion. Failure evidence for the old behavior is retained. One first repaired-browser run encountered the intended CAS conflict while a remote trailing autosave changed the reviewed dataset; the test now verifies that explicit recovery rather than assuming deletion always silently wins. The underlying alert was found behind the modal and repaired.

Baseline documentation-only CI045744c failed formatting of the generated JSON report. JSON whitespace was corrected without changing observations. A local full-gate attempt raced an ongoing formatter and failed format:check; it is not reported as a pass. Final gates are rerun after formatting.

Engine/interpreter/frozen missions/package lock/public branding remain unchanged. Existing engine/mission versions are preserved. This is risk-reducing local-first hardening, not a guarantee of every possible interleaving.
