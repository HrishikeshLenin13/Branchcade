# Astra bug register

Initial source02ce0dd. Six independent failures are preserved before repairs.

| ID        | Severity | Issue                                                         | Reproduction                   | Status        |
| --------- | -------- | ------------------------------------------------------------- | ------------------------------ | ------------- |
| ASTRA-001 | P0       | Concurrent learning annotations / immutable evidence conflict | astra-storage first2 tests     | FAIL baseline |
| ASTRA-002 | P0       | Queued stale snapshots erase foreign attempts                 | astra-storage queued-save test | FAIL baseline |
| ASTRA-003 | P0       | Stale new data after erasure                                  | astra-storage deletion test    | FAIL baseline |
| ASTRA-004 | P0       | Baseless overwrite / nonmonotonic revision                    | astra-storage last2 tests      | FAIL baseline |

Other hypotheses remain unconfirmed in INDEPENDENT_FINDINGS. This register will track verified repair evidence, not just plausible code changes.

## Verified repair status (initial rows above are historical)

| ID        | Severity | Confirmed behavior                                                                     | Repair/verification                                                                          |
| --------- | -------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| ASTRA-001 | P0       | Annotation loss, immutable conflict and assistance removal                             | Prefix-compatible evidence, assistance union, explicit conflicts; new unit regressions       |
| ASTRA-002 | P0       | Two queued same-tab writes erase foreign attempts                                      | Per-request base capture, serialized queue, retry rebase; session/IndexedDB tests            |
| ASTRA-003 | P0       | Stale new records after delete/import                                                  | Atomic revision barrier and reviewed-snapshot replacement; browser notification on/off tests |
| ASTRA-004 | P0       | Initial blind overwrite / backward revision                                            | Baseless merge, monotonic max of observed stamps; regression tests                           |
| ASTRA-005 | P1       | Same imported attempt label returns different scenario's cached answer                 | Serialized input identity check;24cmMOVE/12cmSTOP and8reference truth regressions            |
| ASTRA-006 | P0       | 200 mixed-mission records can save then become unreadable                              | Separate bounded local-envelope preflight applied symmetrically at save/load;200-record test |
| ASTRA-007 | P2       | Manual Save claims success on quota failure; older draft save clears newer dirty state | Actual status check and revision guard; injected browser quota test                          |
| ASTRA-008 | P2       | Conflict errors behind an active modal                                                 | In-dialog alerts; deletion CAS recovery browser check                                        |
| ASTRA-009 | P3       | Laptop toolbar orphan control                                                          | Scoped two-row laptop grid; six-width visual verification and full control suite             |

Counts:9confirmed issue groups (P0=5,P1=1,P2=2,P3=1). Multiple failing tests can belong to one issue group; this is not a count of unique exploit vectors. Closure depends on final full-suite/CI evidence in FINAL_VERIFICATION, not just code existence.

Outstanding observations: M05 equality solution generalizes poorly outside authored aligned scenarios (curriculum limitation; new version deferred); initial450ms autosave may warn before navigation; Blockly pointer/screen-reader editing limitations; same mutable draft last-writer policy; physical-device and assistive-technology evaluation unperformed. No remaining confirmed P0/P1 is knowingly left unrepaired, but this is not exhaustive proof of absence.
