# Part I / J performance and robustness evidence

Measured 2026-10-24 against the fetched A–H checkpoint `f9871ba0efa20f9f3e63b5aaa489f13ed5a9b91d` and the Part I/J cache repair. Runtime measurements use the local macOS arm64 host and pinned Node **24.22.1**; local browser captures use the installed Playwright 1.64.1 Chromium binary. Browser checks use a local production preview at a **1366 × 768 browser viewport**; these are not physical Chromebook, mobile-device, hosted-network, Lighthouse or learning-effectiveness results.

## Reproducible runtime workloads

Run `node --expose-gc scripts/bench-ij.mjs docs/evidence/ij/runtime-after.json` with the `.nvmrc` runtime. The script loads existing TypeScript through Vite's SSR loader with network listeners and dependency discovery disabled. It validates the stress run before measuring it; every reported long run really has **1,503 events**, **600 inspect executions**, **100 solid obstacles**, and a **1,251,459-byte JSON trace**. Seven samples are recorded for each runtime workload. Timings are observations, not hardware-dependent CI gates.

| Workload                                                  |   Before median |      After median | Interpretation                                                                                      |
| --------------------------------------------------------- | --------------: | ----------------: | --------------------------------------------------------------------------------------------------- |
| 100 obstacles / 1,503 events, authoritative execution     |       18.420 ms |         52.489 ms | No physics change; machine-load and module-warmup variance are visible. No CPU speed-up is claimed. |
| Canonical JSON plus SHA-256 of the full trace             |       22.034 ms |         62.608 ms | Existing stable-hash boundary retained.                                                             |
| 180-statement user-program AST validation                 |        0.343 ms |          0.387 ms | Existing node/depth budgets retained.                                                               |
| Cold counterexample search, eight missions, all 14 models | 8.340–79.451 ms | 32.153–255.953 ms | Actual candidate execution and ranking, without mocked results.                                     |

Raw sample streams: `docs/evidence/ij/runtime-before.json` and `runtime-after.json`. Counterexample timings include source/schema validation and executable mental models. The benchmark was rerun after the collection workload was added; CPU/host-load variance is visible. The cache repair is justified by retained memory and byte-budget correctness, not a CPU speed-up claim.

## Measured defect and repair: retained mental-model traces

The original memoization cache allowed **4,001 full model runs** before clearing itself. Each run could retain a trace up to the interpreter's byte ceiling. A synthetic, valid sequence of 60 distinct 1,503-event runs increased retained V8 heap by **95.57 MiB after explicit GC**. This workload exercised genuine stored `ModelRun` objects, not an estimate derived from an entry count.

`learning/mental-models.ts` now uses least-recently-used eviction with both a **512-entry cap and an 8 MiB accounted trace/entry payload cap**. It reads the interpreter's already-counted UTF-8 trace size through a read-only getter, avoiding a second full trace serialization. Cache eviction changes only recomputation cost; the real interpreter, generated predictions, frozen v1 fixtures, ranking and stable trace hashes remain unchanged.

The same 60-run workload now retains **6 model runs / 7,515,246 accounted bytes**, with **9.39 MiB measured heap increase** after GC. Accounted payload and V8 heap are intentionally distinguished: object/runtime overhead means an 8 MiB payload cap is not an 8 MiB process-memory promise. The before run also contained the preceding cold-search cache; the after script clears its bounded cache before measuring, which makes the reported after delta conservative for the repair.

Regression: `tests/ij-robustness.test.ts` forces eviction with 10 large runs, verifies the payload cap, then recomputes an evicted scenario and compares the complete result. Existing F/G and frozen historical fingerprints are rerun unchanged.

## Additional robustness coverage

The new eight-test suite adds independent coverage for workloads not present in the earlier acceptance suites:

- A legal 100-solid world and 1,503-event run, sampled exact replay snapshots and identical async trace hash.
- A user-created 180-statement Blockly program round-trip and rejection after adding a disconnected instruction.
- 32 deterministic seeded nested loop/function/variable programs checked against a separate arithmetic oracle.
- Eight successive real mid-run cancellations, one terminal event each, unchanged input, and a successful next run.
- Signed movement at 48 seeded headings, independent trigonometric displacement and exact logical tick time.
- Exact agreement between the interpreter's accumulated UTF-8 byte count and serialized trace bytes.

**Collection stress:** 50 synthetic attempts with distinct prediction IDs, real executed checksums and unscored Free Lab outcomes occupy **92,869 bytes**. Full byte/structure/schema/identity/trace validation accepted them in **50.790 ms median / 88.031 ms maximum** (five samples). Tampering with the final trace checksum is rejected. No student achievement or mastery was fabricated for these fixtures.

The earlier F/G/H suites already cover null guards, collision/tangency, short circuiting, budgets, seeded sensors, mutation prevention, source-linked errors, all 14 hypotheses, conflicting/repeated evidence, honest no-candidate behavior, distinct transfers and every authored mission/reference. Those implementations were audited and reused.

## Browser profiling

`e2e/ij-performance.spec.ts` imports explicitly labeled synthetic fixtures through the real validated local-data UI. It checks 60-row bounded timeline rendering for 1,503 events, actual filtering and pagination, snapshot replay without duplicate attempts, a 180-statement real Blockly workspace, disposal on unmount, repeated navigation, cold-browser load, and a timed 1,500-tick replay. Timing and Chromium heap/DOM counters are attached as diagnostic JSON; assertions concern observable correctness and bounded rendering.

Seven production Chromium checks (five stress/privacy/collection checks plus two actual Blockly context-menu journeys) passed with zero page errors, failed media loads, nonlocal requests or sound requests. The final browser stream is `docs/evidence/ij/browser-chromium-final.json`; decoded diagnostic attachments are in `browser-metrics.json`.

| Local Chromium observation                                 | Actual measurement                                  |
| ---------------------------------------------------------- | --------------------------------------------------- |
| Cold browser-context Home load through first heading/fonts | 143.21 ms                                           |
| LCP / CLS from PerformanceObserver                         | 112 ms / 0.0492                                     |
| 1,503-event / 100-obstacle run and result reveal           | 269.51 ms                                           |
| Filter interaction and displayed matching results          | 57.50 ms                                            |
| 180-statement Blockly load and apply                       | 923.35 ms                                           |
| Four Missions ↔ Lab navigation round trips                 | 132.61–152.14 ms                                    |
| Two-second 4× replay observation                           | 121 rAF intervals, 16.7 ms median / 16.8 ms maximum |

The replay measurement is an observed local interval sample, not a universal 60 fps guarantee. The pause assertion verifies that the displayed logical tick remains fixed after pausing; playback never changes authoritative ticks or adds a scored attempt.

Chromium CDP with explicit GC measured 8,082,256 bytes of used JS heap before first Blockly initialization and 14,092,680 after initialization/unmount/four navigation round trips. Three further open/dispose cycles measured 15,352,536 / 14,954,960 / 15,049,840 bytes; DOM-node counts stayed between 17,818 and 17,850. This distinguishes one-time Blockly resources from sustained linear DOM growth; three samples do not prove indefinite leak freedom. No unmeasured memory rewrite was made.

The browser collection check imports **50 records / 92,842 bytes** (the raw fixture omits the optional app-version export field), reaches durable confirmation in **623.57 ms**, renders all 50 review actions and retains them after reload.

Actual context-menu journeys duplicate a numeric block, place the copy with a real mouse gesture, verify disconnected-program rejection, undo/redo/delete it, and run the unchanged program. A second journey deletes a required input, observes a source-linked error, focuses its comparison block and repairs the input with Undo. This does not claim a natural block-drag experiment.

**Additional real defect repaired:** opening Blockly previously requested media from `static.blockly.com`. The editor now serves the pinned upstream visual media from the same origin, preserves its Apache-2.0 license, and explicitly disables sounds. The production network regression opens, previews, lays out and applies actual blocks and verifies no external origin, sound request or missing bundled media.

Local Firefox launch currently fails before application code with `Could not find profile folder`, both with the system temporary directory and `/private/tmp`; this is a local browser launch limitation, not a test skip or an application pass. Ubuntu GitHub CI remains the independent Firefox verification path.

## Limits of the evidence

Main-thread interpreter work remains bounded and async UI execution yields between batches. The benchmark does not establish a universal frame rate or memory bound for all devices. Counterexample synthesis remains synchronous within its bounded search. No worker, speculative geometry rewrite or unmeasured trace-filter optimization was introduced. Performance work preserves deterministic physics, frozen historical execution and all learning correctness checks.

## Post-L note (2026-10-25)

The Opus audit made no performance optimization. The production build still emits the lazy Blockly chunk (798,910 B) and a 256,757 B main chunk. Saves now run read → rebase → write in one IndexedDB transaction. When no other tab has written, rebasing returns immediately. Only after a write from another tab does it JSON-compare records, and that cost was **not measured** for 200 large-trace attempts; it is listed for the next reviewer in [GPT_ASTRA_HANDOFF](audit/GPT_ASTRA_HANDOFF.md).
