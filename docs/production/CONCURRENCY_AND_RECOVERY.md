# Saving, multiple tabs and recovery (final acceptance)

Branchcade saves to one IndexedDB envelope per browser profile. It is **not** cloud sync; nothing leaves the device.

| Scenario                                                               | Evidence                                                                                                                                   | Result          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Save, then reload                                                      | Journeys: the returning learner's run is present after closing the tab and reopening; M01–M08 verdicts persist after reload                | PASS (observed) |
| Two tabs: stale tab saves after another tab records an attempt         | `e2e/opus-regressions` OPUS-001 (fails on the original code, passes after the fix)                                                         | PASS            |
| Concurrent new attempts in two tabs; export coherent; close and reopen | `e2e/astra-storage` "concurrent tabs append attempts…"                                                                                     | PASS            |
| Concurrent answers on the same attempt                                 | `tests/astra-storage`, `tests/opus-multitab`: append-only superset; incompatible answers raise an explicit conflict instead of overwriting | PASS            |
| Queued stale same-tab saves                                            | ASTRA-002 regression                                                                                                                       | PASS            |
| Delete or reset while another tab is open                              | `e2e/astra-storage` deletion test, with and without BroadcastChannel: the stale tab cannot save or resurrect deleted data                  | PASS            |
| Import replacement                                                     | Reviewed-snapshot replacement with a revision barrier (ASTRA-003)                                                                          | PASS            |
| Quota failure on manual Save                                           | `e2e/astra-storage` quota test: never announces success                                                                                    | PASS            |
| 200-attempt envelope                                                   | ASTRA-006 regression: saves and loads within the documented bound                                                                          | PASS            |
| Corrupt stored data                                                    | Notice shown; the corrupt envelope is not overwritten (Opus audit journey)                                                                 | PASS            |
| Corrupt import file                                                    | Settings and Lab both reject it with a message; data unchanged (final journeys)                                                            | PASS            |
| Unknown route or mission                                               | Recovery links work (final journeys)                                                                                                       | PASS            |

**Known policy:** drafts, saved labs and assignments are mutable, and the last writer wins. Immutable attempt evidence never changes. Same-browser profiles are not access control. Browser data clearing or private windows erase everything, and there is no remote backup.
