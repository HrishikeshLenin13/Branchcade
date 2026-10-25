# Baseline metrics

Source02ce0dd; macOS arm64, Node24.22.1/npm11.19.0. `npm ci`:416 packages added,417 audited,0 vulnerabilities. `npm run check`:457/457 tests,36/36 files,19.98s reported Vitest duration; build1.42s. Lazy Blockly chunk798.91kB minified/214.00kB gzip. The warning is retained, not suppressed. No dependency changes.

Independent storage fault injection:6/6 failures,1.87s total,90ms test body. This is correctness evidence, not a performance win. Raw logs in evidence. Browser timing/200-attempt writes are measured separately; concurrency with other QA tasks must be disclosed.

## Comparable measured samples

Final measured CPU/merge samples are in evidence/metrics-before.json and metrics-after-final.json; the intermediate metrics-after.json predates the symmetric local-node validation and is not the final comparison. Five200record samples per side; same370,093-byte shape. Baseline medians initial17.48ms/save44.84ms/rebase72.82ms/load17.56ms; final31.02/73.18/93.32/23.16ms. These measurements ran with other QA workloads; no CPU improvement is claimed. Correctness validation adds work.1000warm cache lookups0.88→6.12ms in the small fixture. Accounted cache memory includes identities. See PERFORMANCE_REPORT for explicit environment/limits.
