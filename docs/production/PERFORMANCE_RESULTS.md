# Performance results (final acceptance)

Measured 2026-10-25 by `scripts/final-performance.mjs` against the local production preview in this Linux container (Chromium 153 headless, 1366×768). Raw data: `evidence/performance.json` and Chrome trace `evidence/trace-m01-run.json`. These are observations on this machine, not guarantees for a Chromebook.

| Measurement (median of 5 fresh contexts)    | Result                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Cold load `/` (DOMContentLoaded)            | 174 ms, 260 KB transferred, 1 long task (90 ms)                          |
| Cold load `/missions`                       | 180 ms                                                                   |
| Cold load `/missions/m01`                   | 180 ms, 291 KB                                                           |
| Cold load `/lab`                            | 181 ms                                                                   |
| Cold load `/instructor`                     | 191 ms                                                                   |
| Open Blockly editor (click → first block)   | 360 ms median (327–408); loads the ~799 KB lazy chunk on first use       |
| Lock prediction & run → verdict shown (M01) | 111 ms median over 10 consecutive runs (95–126 ms)                       |
| JS heap after GC across 10 runs in one tab  | 5.8 → 7.3 MB after the first run, then flat at 7.4–7.5 MB: **no growth** |

**Conclusion:** no bottleneck was demonstrated in the measured paths, so no optimization was made. Two things were not re-measured here: the large-trace and large-envelope paths (1,500+ events, 200 attempts, cross-tab rebase slow path). Astra measured and bounded those (docs/audit/astra/BASELINE_METRICS.md, PERFORMANCE_REPORT.md). The Blockly chunk size is unchanged, and it only loads when the editor opens.
