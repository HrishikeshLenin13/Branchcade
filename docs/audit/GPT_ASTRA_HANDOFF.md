# Handoff for the independent GPT Astra review

**Status: GPT Astra review NOT STARTED.** Nothing in this repository is a second-model audit. This page only tells the next reviewer what the Opus round did and did not do, so they can challenge it rather than repeat it.

## Checkpoints

| What                                                       | SHA                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Code Opus audited (read-only round)                        | `617b83daf96c136bd4105df7b0c015dc043f737a`                                                               |
| Opus baseline findings preserved, before any source change | `c2ba103`                                                                                                |
| Final Opus checkpoint to review                            | the latest `main` commit whose CI run is linked in [OPUS_FINAL_VERIFICATION](OPUS_FINAL_VERIFICATION.md) |

Suggested protocol (from [POST_L_AUDIT_PLAN](../POST_L_AUDIT_PLAN.md)):

1. Read `docs/SPEC.md` in full **before** reading any `OPUS_*` file.
2. Use a fresh clone and a fresh browser profile.
3. Write your own findings first, then compare.

## What Opus actually verified (and how)

- **Physics/sensors:** independent ray-marching and clearance-bisection oracles (`tests/opus-audit-oracles.test.ts`). This is a strong check, but both oracle and engine are mine to read, so a reviewer should write their own cases too.
- **Mission judging:** single-point mutation probe of the eight reference programs (`tests/opus-audit-mutation.test.ts`). Only single-point mutants were tried. Multi-point or structurally different wrong programs were not.
- **Diagnosis:** four synthetic journeys on M01 only (`tests/opus-audit-diagnosis.test.ts`).
- **Counterexamples:** all 86 generated for the eight starter programs were re-executed and structurally diffed. Experiments generated from learner-edited programs or probe fallbacks were not covered.
- **Browser (Chromium 153 only):** 66 route × viewport loads with axe/console/network capture, corrupt storage, unknown routes, history, dialog focus, two-tab persistence.

## What Opus changed (scrutinize these first)

1. **`src/storage/rebase.ts` + `saveRebased` + `session.ts`:** new cross-tab write path. This is the highest-risk change. Try:
   - two tabs both answering probes on the _same_ attempt;
   - delete a learner in tab A while tab B keeps working on that learner;
   - import-replace in one tab while the other autosaves;
   - storage-quota failure in the middle of a transaction;
   - Firefox and WebKit `BroadcastChannel`/IndexedDB behaviour;
   - performance of the slow path with 200 attempts carrying large traces (it JSON-compares records).
2. **M03 mission data v3** (`catalog.ts`, `legacy-v2.ts`, `mission-data/v2-revised.json`, `judge.ts`, `collaboration/learning.ts`). Check that:
   - v2 records, team results and team assistance re-judge exactly as before;
   - the 9.9 cm rule is pedagogically right for M03;
   - nothing else assumed "all missions are v2" (Opus found and updated one test).
3. **UI:** the learning-cycle region wrapper, 32 px stage buttons, "Mission not found" and the `Button asChild` Next-mission link.

## Areas Opus did NOT test (treat as open)

- Team mode at each of the 2–6 sizes, by hand (existing E2E only).
- Print output, and the M08 capstone _completion_ path (Opus only checked that the flawed M08 starter is withheld).
- Blockly beyond the gap-closure script: keyboard-only block editing, very large workspaces, functions/variables blocks.

Closed later in the gap-closure round, and worth re-checking independently: real Blockly drag/connect/detach/field/dropdown/undo gestures; browser journeys for every mission's starter; instructor CSV/JSON contents and learner deletion. See the addendum in OPUS_REQUIREMENT_MATRIX.

- Firefox locally (CI only), WebKit/Safari, physical Chromebooks, touch.
- Screen readers, dark mode, high contrast, large text, reduced motion.
- Long-run memory growth and 1,500-event trace timing.
- Offline behaviour, and deployed-host headers (no deployment is authorized).

## Open low-severity items Opus left unfixed

OPUS-005 (toolbar wrap), OPUS-007 (model-cache key trust), OPUS-008 (M05 accepts `!= 12`), OPUS-009 (early beforeunload). Details are in the bug register.

## Logo

**BLOCKED: APPROVED LOGO ASSET REQUIRED.** No owner-approved logo file was supplied. The existing favicon and lucide mark are unchanged.

## Not for any reviewer to claim

Human study, student technical contribution, AI-disclosure approval, contest eligibility, deployment and submission all remain owner actions. Green CI does not settle any of them.
