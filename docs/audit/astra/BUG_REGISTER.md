# Astra bug register

Initial source02ce0dd. Six independent failures are preserved before repairs.

| ID        | Severity | Issue                                                         | Reproduction                   | Status        |
| --------- | -------- | ------------------------------------------------------------- | ------------------------------ | ------------- |
| ASTRA-001 | P0       | Concurrent learning annotations / immutable evidence conflict | astra-storage first2 tests     | FAIL baseline |
| ASTRA-002 | P0       | Queued stale snapshots erase foreign attempts                 | astra-storage queued-save test | FAIL baseline |
| ASTRA-003 | P0       | Stale new data after erasure                                  | astra-storage deletion test    | FAIL baseline |
| ASTRA-004 | P0       | Baseless overwrite / nonmonotonic revision                    | astra-storage last2 tests      | FAIL baseline |

Other hypotheses remain unconfirmed in INDEPENDENT_FINDINGS. This register will track verified repair evidence, not just plausible code changes.
