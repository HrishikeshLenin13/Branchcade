# Architecture: Parts A–C

## One-way state flow

```text
Blockly JSON or authored mission
           ↓ typed adapter + bounded validation
Validated Program AST + validated World (centimeters)
           ↓ pure bounded interpreter
50ms robot steps → passive ray/floor sensors → ExecutionEvent[]
           ↓                         ↓
SVG stage / trace replay        actual goal predicates
           ↓                         ↓
locked prediction → compare → probes → evidence rules
           ↓
bounded executed counterexample → distinct transfer → local records
           ↓
Zod-validated IndexedDB envelope → progress / local instructor / exports
```

`src/domain/schemas.ts` owns external and persistence shapes. `types.ts` derives public types; only the recursive AST is declared independently in `interpreter/ast.ts` and validated by typed recursive schemas. There are no domain→engine or storage→UI imports. Schemas never import React, Blockly, or browser rendering code.

## Geometry and execution

Positions, radii and distances are centimeters. The SVG viewBox applies camera scaling only. Ray/axis-aligned rectangle intersections use slabs, circle intersections use the quadratic equation. Closed floor-zone edges count as inside; highest priority wins, then lexicographic ID. Spawns/obstacles must fit and cannot intersect solid objects. Movement uses 50ms ticks with substeps no longer than half a radius, so a long movement cannot jump through a thin wall. Headings normalize to [0,360). Sensors do not mutate motion. Default max range is 100cm; out of range is null, never zero. Seeded measurement perturbations are stateless per-tick and bounded to ±0.05cm; default runs have no noise. Sampling is fixed at 20Hz in schema v1.

The interpreter accepts typed literals, sensors, variables, arithmetic, numeric/color comparisons and boolean logic; move/turn/stop/wait, conditions, bounded loops, variable assignment, function declarations/calls and inspection. It never executes code strings. Expression types, stable IDs and missing inputs are checked first. Division by zero, missing variables/functions, instruction/trace/tick/call-depth budgets and cancellation produce explicit errors. Definitions alone never invoke functions. The initial Blockly toolbox intentionally exposes a subset; the AST contract is broader.

A run is computed synchronously within hard budgets. The initial UI reveals its actual completed trace and lets users step through snapshots; it does not yet have a real-time play/pause animator or a worker. Engine pause/reset invariants are unit-tested. Later-phase debugging/worker features must not be claimed complete.

## Learning

A prediction is hashed against canonical program/world JSON, frozen and recorded before execution is revealed. Completed attempts append; only append-only diagnostic/transfer annotations may be added, never rewritten execution facts. One incorrect initial prediction leaves multiple hypotheses possible. Two explicit probes distinguish reversed comparison and autonomous sensor action. Supporting/contradicting observations use bounded heuristic weights, not statistical confidence. Contradictions reduce support. Counterexamples use a finite candidate bank and execute baseline/changed programs; checksums record the actual traces. Correct initial predictions can skip remediation. A transfer variant uses a different world and threshold. Repeated identical transfers do not add independent mastery evidence; one answer never proves mastery.

## Local persistence and recovery

`idb` opens one versioned IndexedDB store. A strict envelope contains profile, attempts and local teams; UI orchestration uses Zustand, not a second physics model. Writes are ordered and atomic at envelope level. Storage denied/corrupt/quota failures preserve a usable in-memory session and a visible export notice. Import validates byte size, structure depth, keys, record schema versions, IDs and replay checksums before an explicit replace confirmation. Unknown versions are rejected, not partially imported. Only a documented pre-release v0 alias shape migrates. Exports are JSON; instructor CSV neutralizes formula prefixes.

No remote learner service, network synchronization, analytics, account registration or inference API exists. Fonts and artwork are bundled. Core navigation and features are static-host compatible. Vercel/Netlify SPA fallback configurations are supplied; no public deployment is claimed.

## Extension seams

Future features belong in the directories prescribed by C2. Current diagnosis/experiments are integrated in `features/lab/LabLesson.tsx`; module-level algorithms already live in `learning/`. See STATUS for separate gates on phases 01–11. Shared contracts change only with a version/migration/test decision recorded in ADR.

## D/E extension

The v1 envelope remains backward compatible through default collections: inactive profiles, drafts, saved labs and local assignments. Drafts carry the authoritative world/program, stage, attempt ID and trace cursor; prediction/attempt execution facts remain immutable. Transfer retries and hint/experiment annotations append without rewriting earlier evidence. Independent concept claims are reconciled against distinct executed scenarios and assistance metadata.

The mission catalog contains eight schema-validated activities and reference programs. Goal predicates include explicit branch, final displacement/position, event/call counts, programmed color stops and heading. Blockly can roundtrip each authored starter/reference program; arbitrary source strings remain inert. Live and interpreted sensors both honor world sensor configuration.

Computation is bounded and synchronous; a separate cursor schedules presentation of recorded events at selected playback speed. Pause/resume/replay/zoom cannot change trace order, measurements or scoring. Real world edits validate geometry and reset transient execution while keeping prior attempts. Team shared programs lock after the first private prediction; later rounds retain prior predictions, contributions and immutable program/world/result snapshots.

Imports replay attempts, transfers and team results and ground concept claims before a preview. Merge preserves existing immutable IDs. Durable import commits before the UI switches datasets; failed saves roll back. Scoped exports remove unrelated learner/attempt/evidence claims. No external learner service or network synchronization was added.

## Part F execution version2

The current interpreter uses explicit typed sequence/repeat/while/motion/call-return frames. `step` advances a control boundary or one50ms motion tick; the async UI runner yields every64 steps. A single rAF presentation clock reveals/interpolates preserved states without changing logical physics. A64-slot,20-tick snapshot ring supplements the4MB bounded full event trace. Step code and Step tick have distinct implemented semantics. Cancellation, collision, completion and safety ceilings emit explicit terminal reasons.

Collision now uses first continuous contact, including rounded rectangle corners rather than square AABB inflation or endpoint/substep rejection. Floor ties use declared order. Null comparisons require a short-circuit detected guard. These are versioned semantics: optional attempt/team `engineVersion=2` selects the new runner, while absent/1 uses the frozen A–E runner/validator/geometry rules and historical world schema. Immutable hashes are not silently recomputed into new semantics. The domain's historical-world union is the intentional compatibility seam; new world editing/imports continue to use the stricter current schema.

The authoritative Blockly serializer/adapter lives in `interpreter/blockly-workspace.ts`; the feature and older adapter modules re-export it. Block lookup maps safe AST IDs back to Blockly raw IDs and synthetic literal-field owners. No generated source is executed. See PART_F_ACCEPTANCE for limits, function/null/stop semantics and numerical proof.
