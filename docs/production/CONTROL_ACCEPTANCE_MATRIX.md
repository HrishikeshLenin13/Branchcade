# Control acceptance matrix

Every visible interactive control on 12 route states was activated, each in its own fresh synthetic Chromium context, by `scripts/final-control-crawl.mjs`. The run started from `ae22d2e` with this round's UI fix applied. The full per-control table is in [CONTROL_INVENTORY](CONTROL_INVENTORY.md), and the raw data is in `evidence/control-crawl.json`.

| Route state                      | Controls | Visible effect | Disabled with reason | Other                                                             |
| -------------------------------- | -------- | -------------- | -------------------- | ----------------------------------------------------------------- |
| Home                             | 20       | 20             | 0                    | —                                                                 |
| Onboarding                       | 20       | 19             | 1                    | —                                                                 |
| Mission library                  | 42       | 42             | 0                    | —                                                                 |
| Mission, before prediction (M02) | 71       | 63             | 8                    | —                                                                 |
| Mission, after a run (M01)       | 101      | 90             | 10                   | Skip link: focus is already on the result after a run             |
| Free Lab                         | 100      | 88             | 10                   | 1 file input (import journey); 1 single-option dropdown           |
| Team setup                       | 27       | 27             | 0                    | —                                                                 |
| Progress (seeded)                | 30       | 29             | 0                    | Alias dropdown label differs per fresh profile                    |
| Instructor (seeded)              | 29       | 25             | 1                    | 1 file input; 1 single-option dropdown; 1 alias-labelled dropdown |
| Settings (seeded)                | 27       | 25             | 1                    | 1 file input (import journey)                                     |
| How it works                     | 19       | 19             | 0                    | —                                                                 |
| Not found                        | 16       | 16             | 0                    | —                                                                 |
| **Total**                        | **502**  | **463**        | **31**               | 8 accounted for above                                             |

- **Broken controls found: 0.** Console or page errors during activation: 0.
- **Repaired:** the first full crawl (before fix `7bd8418`) found **22 controls disabled with no stated reason**: 6 on the mission before prediction, 6 after a run, 8 in the Lab, and 1 each in Instructor and Settings. The new regression test then found the world-variant buttons and the world-editor section with no reason either. All now state a reason; regression `e2e/final-acceptance.spec.ts`. That first crawl's raw JSON was overwritten by the second run (same filename). Its per-state counts are recorded here.
- **Not activated by the crawler:** 3 file inputs, which the import journeys exercise with real files (Lab world import, Settings import, Instructor import).
- "Visible effect" means the URL, a dialog, page content, control state, focus, scroll, a download, the print call or a new tab observably changed. For buttons with a native confirm, the confirm was accepted and its result recorded.
