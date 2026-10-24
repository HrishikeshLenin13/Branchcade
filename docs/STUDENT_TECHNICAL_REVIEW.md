# Student technical understanding and revision workbook

**AWAITING STUDENT REVIEW — none of the exercises below is marked performed.** Prepared explanations are AI-assisted reading material, not evidence of student authorship. Work from actual source, predict the outcome before running a test, and record your own explanation. Do not merely memorize this text.

## How to use and document real work

Use the maintained runtime: `nvm use && npm ci`. Each section supplies an existing targeted command; run from the repository root. Proposed new tests/revisions do not exist yet unless you personally implement them. First inspect the current test to avoid duplicating it. Preserve deterministic contracts, frozen v1 and other contributors' work. A substantive, justified implementation revision needs its own negative test, before/after result and full `npm run check`; not every practice exercise should alter production behavior.

For **each** concept fill privately or with nonidentifying notes:

`Actual date: ____ | Own explanation/example: ____ | Exercise result: ____ | Personally implemented test/revision and rationale: ____ | Exact commit/files: ____ | Command and literal output/exit: ____ | Uncertainty/reviewer: ____ | Status: AWAITING STUDENT REVIEW`

Mark VERIFIED STUDENT CONTRIBUTION only after the real source/test contribution and human role are confirmed in [the ledger](SOURCE_OWNERSHIP_REVIEW.md). Agent-run commands do not count as personal work. Choose at least one meaningful implementation/design problem to personally solve and explain, not just a cosmetic edit; discuss the development history with the organizer when eligibility remains uncertain.

## 1. Why is 20 < 20 false?

**Plain explanation:** `<` asks for strictly smaller. Equal operands do not satisfy it; `<=` includes equality. The display's rounding is separate from the full-precision operands.

**Source:** `src/interpreter/interpreter.ts`, private `Interpreter.evaluate`, `compare` case; `src/interpreter/trace.ts`, trace facts.

**Actual example:** M01's `24 < 20` is false and its else body moves. With 20 and20, `<` remains false, but `<=` is true.

**Do:** Draw the true/false table for19,20,21 against20 for all six comparison operators. Explain the selected branch without running it.

**Personally implement:** A parameterized interpreter test using noninteger values that display alike but have different full precision; assert the evaluated operands and result. If you improve near-threshold explanatory UI, preserve the comparison math and add a UI test.

**Confirm:** `npm run test -- --run tests/f-mandatory.test.ts tests/interpreter.test.ts`

## 2. How does distance to a rectangle work?

**Plain explanation:** A ray starts at the front sensor offset, not the robot center. The slab algorithm intersects the ray's allowed X and Y intervals and returns the nearest forward entry; parallel rays outside a slab miss.

**Source:** `src/engine/geometry.ts`: `rayRectangle`, `transformOffset`; `src/engine/sensors.ts`: `readSensors` chooses nearest solid hit/boundary.

**Example:** Origin(116,100), heading0°, rectangle left edge x250 spanning y100: forward hit134 cm. It is not150 cm from the center. Beyond configured range the reading is null.

**Do:** Compute a ray parallel to a rectangle face, once inside its Y span and once outside; explain the different result.

**Personally implement:** An independent diagonal/parallel-ray numeric test with explicit expected interval intersection, not an expected value calculated by `rayRectangle` itself. If you find a defect, repair the smallest geometry case with the same test.

**Confirm:** `npm run test -- --run tests/engine.test.ts tests/f-physics.test.ts`

## 3. How is floor color sensed?

**Plain explanation:** The sample point is the robot pose plus its configured floor offset. Containing zones compete by descending priority and declared order, with closed edges. The robot outline touching paint is not the sample entering it.

**Source:** `src/engine/sensors.ts`: `readSensors`; `src/engine/geometry.ts`: `containsZone`, `transformOffset`.

**Example:** A sample exactly on a black rectangle edge reads black if that zone wins; outside all zones reads white. Swapping equal-priority declaration order can change the winning color in current execution; historical v1 stays separate.

**Do:** Draw the chassis and sample offset in M02 and explain why first color detection happens at its own tick.

**Personally implement:** A rotated-offset overlapping-zone edge test with explicit coordinates. Consider a clearer footprint legend as a substantive access improvement only if the user need and UI regression are documented.

**Confirm:** `npm run test -- --run tests/f-physics.test.ts tests/h-goals.test.ts`

## 4. Why doesn't the robot tunnel through a wall?

**Plain explanation:** Each move sweeps a circle along its full tick displacement and takes the earliest contact fraction. Rectangle sides and rounded corners, circles and world boundaries participate. Endpoint-only collision would miss a thin wall.

**Source:** `src/engine/sweep.ts`: `sweepCircle`; `src/engine/robot.ts`: `advanceRobot`.

**Example:** A large step across a thin solid box stops at first chassis contact, not at the proposed destination or inside the box. A physical bump is not a programmed stop.

**Do:** Calculate contact center and fraction for a radius6 robot approaching a vertical wall, then compare a tangential path.

**Personally implement:** A signed diagonal swept-contact regression with an independent geometry derivation; repair only an actual failing case. Explain why square-expanded corners alone overestimate contact.

**Confirm:** `npm run test -- --run tests/f-physics.test.ts tests/f-mandatory.test.ts`

## 5. What happens between a Blockly block and a program?

**Plain explanation:** Supported connected blocks become typed expression/statement objects with source IDs. Schema, size, name, duplicate-ID and semantic validation run before interpretation. Unapplied workspace edits are not executed.

**Source:** `src/interpreter/blockly-workspace.ts`: `editableProgram`, `programWorkspace`; `src/interpreter/validate.ts`: `validateProgram`.

**Example:** The comparison block's distance input and numeric20 become a sensor expression and literal in an if condition. Deleting an input yields a source-linked validation error rather than guessed code.

**Do:** Locate one real block ID, its AST node and resulting trace event. Rebuild the starter using blocks and compare behavior.

**Personally implement:** A missing-input/unsupported-shape round-trip regression for a nested block, and a meaningful validation-message improvement if justified; assert focus goes to the actual offending block.

**Confirm:** `npm run test -- --run tests/blockly.test.ts`; `npm run test:e2e -- --project=chromium e2e/ij-blockly.spec.ts`

## 6. Why do learner blocks not execute arbitrary JavaScript?

**Plain explanation:** Only known AST kinds are interpreted by explicit cases. Pseudocode is a read-only printer, not executable source. Imported JSON is validated; it is not eval, Function, module source or HTML.

**Source:** `src/interpreter/ast.ts`, `validate.ts`: `validateProgram`; `interpreter.ts`: `Interpreter.evaluate`/`step`; `pseudocode.ts`: `pseudocode`; `src/storage/import-export.ts`: `parseImport`, `validateImport`.

**Example:** A string that resembles a script is rejected as an invalid AST or remains text where text is allowed; it does not run in the page. This does not make every browser/dependency risk disappear.

**Do:** Trace the trust boundary from file input to strict schema to interpreter, naming which arbitrary fields are rejected.

**Personally implement:** A synthetic import/AST rejection test for a previously untested unknown node/unsafe key, asserting current records remain unchanged. Do not add dynamic code execution to “support” it.

**Confirm:** `npm run test -- --run tests/contracts.test.ts tests/contract-completeness.test.ts tests/f-storage.test.ts`

## 7. How do loops terminate or stop safely?

**Plain explanation:** Explicit sequence/repeat/while/motion/call frames avoid recursively executing arbitrary user loops in JavaScript. Conditions are re-read; budgets bound instruction work, physics ticks, events, bytes, depth and variables. Async batches yield and check cancellation.

**Source:** `src/interpreter/interpreter.ts`: `Interpreter.step`, `whileIteration`, `budget`, `executeAsync`; `src/domain/constants.ts`: `LIMITS`.

**Example:** `while true` with no changing condition stops at a safety limit. An initially false while runs zero times; a repeat3 body runs exactly three times.

**Do:** Manually walk frames for repeat2 containing while-false, then a helper call. Identify which limit could stop each pathological version.

**Personally implement:** A nested-loop/call cancellation test that cancels before budget exhaustion and verifies one terminal event plus a usable subsequent run. Keep budgets effective rather than raising them to hide failure.

**Confirm:** `npm run test -- --run tests/f-interpreter.test.ts tests/ij-robustness.test.ts`

## 8. What makes a trace deterministic?

**Plain explanation:** Identical validated world/program, execution version and seed produce identical logical events. Every event records actual source, before/after state, operands, tick and variables; random IDs/timestamps outside the trace are not physics inputs.

**Source:** `src/interpreter/interpreter.ts`: `Interpreter.emit`, `execute`; `src/domain/invariants.ts`: `stableHash`; `src/engine/robot.ts`: fixed-step `advanceRobot`.

**Example:** Two M01 runs yield the same execution hash even if the learner watches one at4×. A threshold edit can change that hash and behavior.

**Do:** Compare two event arrays and explain which fields are deterministic and which attempt metadata can differ.

**Personally implement:** A seeded-noise deterministic trace test across sync/async execution with an independent sensor-bound assertion; do not suppress differences by removing fields from the hash.

**Confirm:** `npm run test -- --run tests/f-mandatory.test.ts tests/ij-robustness.test.ts tests/f-legacy.test.ts`

## 9. What does rewind/replay change?

**Plain explanation:** Rewind selects a saved event snapshot; replay presents existing execution, not a new scored attempt. Code stepping and tick stepping target different boundaries. Hash-checked reconstruction can rebuild a snapshot independently of a small cache.

**Source:** `src/engine/replay.ts`: `replayAt`; `src/interpreter/debugger.ts`: `nextCodeCursor`, `nextTickCursor`; `source-replay.ts`: `rebuildSnapshot`; `src/features/lab/useTracePlayback.ts`.

**Example:** Rewinding M01 to its comparison shows24 cm again without erasing the later movement or changing the prediction. Step tick adds one50 ms logical tick where movement exists.

**Do:** Find the trace cursor before/after a move and distinguish robot state from wall-clock playback time.

**Personally implement:** An eviction/reconstruction regression verifying robot, variables, cursor and trace hash for a mid-loop event; assert replay adds no attempt. If improving recovery UI, preserve immutable execution facts.

**Confirm:** `npm run test -- --run tests/f-recovery.test.ts tests/f-interpreter.test.ts`; `npm run test:e2e -- --project=chromium e2e/physics-debugger.spec.ts`

## 10. How does a wrong prediction become evidence?

**Plain explanation:** A prediction commits before reveal and binds world/program hashes. An observation combines that answer with executable truth and each model's predicted answer. Later probe/experiment/transfer annotations append rather than rewrite the initial record.

**Source:** `src/learning/predictions.ts`: `recordPrediction`; `investigation.ts`: `attemptObservations`; `diagnosis.ts`: `missionObservation`, `assess`; `src/storage/repositories.ts`: `annotateAttempt`.

**Example:** STOP at24/<20 disagrees with the actual MOVE, but can support several candidate models. Selecting “Not sure” is not a wrong-answer diagnosis.

**Do:** Trace one recorded answer ID through observation provenance to a support/contradiction item.

**Personally implement:** An uncertainty/branch-answer independence test that preserves execution facts and proves two answers from one mission moment do not become two independent supports.

**Confirm:** `npm run test -- --run tests/g-learning.test.ts tests/h-learning.test.ts tests/learning-storage-team.test.ts`

## 11. Why isn't one wrong answer a diagnosis?

**Plain explanation:** Several ideas and an ordinary slip can predict the same wrong action. `assess` requires independent support and accounts for contradictions. Its normalized score is an authored heuristic, never a psychological probability.

**Source:** `src/learning/diagnosis.ts`: `assess`, `selectNextProbe`. Current “Might be” rule needs at least2 independent support keys and support minus contradiction ≥1.5; contradicting evidence can downgrade it.

**Example:** First STOP at24/<20 yields four possible mix-ups in the rehearsed UI, not certainty about comparison direction.

**Do:** Construct two supports from the same template and explain why they are not independent. Then add a genuinely different probe and a contradiction.

**Personally implement:** A provenance/downgrade regression for duplicated scenarios versus independent templates. If changing weights, justify the educational assumption and update behavior/wording/tests together, never relabel scores as probabilities.

**Confirm:** `npm run test -- --run tests/g-learning.test.ts`

## 12. How can two executable mental models disagree?

**Plain explanation:** The learning-only `ModelInterpreter` changes exactly one protected rule of the authoritative interpreter; NO_MISCONCEPTION changes none. Models approximate an idea, not a complete person.

**Source:** `src/learning/mental-models.ts`: `ModelInterpreter.comparisonOp`, `stopsBeforeMoving`, `runModel`, `observe`; `src/learning/taxonomy.ts`.

**Example:** In the40 cm turn-if-<20 scenario, reversing comparison expects then/turn, normal semantics expects else/move; the sensor-action model need not reverse comparison. Their later responses separate even with the same first STOP.

**Do:** Run the existing two-model split and explain why a collision candidate could wrongly appear to support automatic sensor stopping.

**Personally implement:** A neutral-seam test on a new nested example plus a contrasting model case with explicit expected result. Any personal model revision must state its assumptions rather than claim a measured child behavior.

**Confirm:** `npm run test -- --run tests/g-learning.test.ts`; `npm run test:e2e -- --project=chromium e2e/learning-g.spec.ts`

## 13. How does search choose a counterexample?

**Plain explanation:** Enumerate bounded single edits, validate and execute each, compare candidate-model outputs, reject ambiguity/errors and rank informative simple changes with stable tie-breaks. No valid candidate is an honest result.

**Source:** `src/learning/counterexamples.ts`: `candidateEdits`, `applyEdit`, `searchCounterexamples`, `explainCandidate`; `investigation.ts`: `experimentPlan`.

**Example:** The comparison-direction demo searches15 edits and selects wall24→10; the actual controls then verify30/<20 MOVE and12/<20 STOP. The global budget80 is a ceiling, not a promise of80 candidates.

**Do:** List why one candidate is rejected and compute separated model pairs for two surviving candidates.

**Personally implement:** A new legal-placement/no-candidate test with a zero/limited budget, plus a substantive search-constraint or explanation revision only if a reproduced defect warrants it. Confirm no invented fallback trace.

**Confirm:** `npm run test -- --run tests/g-learning.test.ts`; with built preview, `node scripts/rehearse-k-demo.mjs`

## 14. How is transfer different from repeating the answer?

**Plain explanation:** A transfer pool uses distinct authored/generated scenarios, executed before use. Selection avoids previously revealed checks and adapts difficulty from prior evidence. Repeating an identical answer does not add independent mastery evidence.

**Source:** `src/learning/transfer.ts`: `transferPool`, `chooseTransfer`; `src/learning/mastery.ts`: `conceptEvidence`.

**Example:** M01 begins at24/<20, whereas the rehearsed first transfer is32 / <35. Both numbers and the correct first action differ; memorizing MOVE is insufficient.

**Do:** Identify scenario IDs/hashes for the initial run, a transfer and a retry; explain repeated-revealed versus unseen evidence.

**Personally implement:** A transfer-pool exhaustion/deduplication test and a justified selection improvement only if it keeps solvable distinct scenarios and honest no-new-example handling.

**Confirm:** `npm run test -- --run tests/g-learning.test.ts tests/h-curriculum.test.ts`

## 15. What does local storage protect, and what doesn't it protect?

**Plain explanation:** IndexedDB keeps a versioned envelope on this browser/origin; ordered durable writes and validated atomic imports protect consistency. It is not encryption, a private account boundary or remote backup. Same-profile users and downloaded exports can expose records.

**Source:** `src/storage/{db,repositories,import-export,migrations}.ts`: `saveData`, `appendAttempt`, `annotateAttempt`, `validateImport`, `mergeData`, `scopedData`, `csvCell`; `src/app/session.ts`.

**Example:** Settings export/import can roundtrip a valid record; a future-version or tampered trace is rejected without replacing current work. Erase does not delete downloaded JSON or hosting logs.

**Do:** Export a synthetic record, inspect its versions/aliases and try a separately altered invalid copy. Explain scoped learner deletion versus all-data erase.

**Personally implement:** A failed-import durable-write test asserting both live and stored envelopes remain unchanged; or personally improve explicit shared-profile privacy copy with a regression. Never use real child data as a fixture.

**Confirm:** `npm run test -- --run tests/f-storage.test.ts tests/local-records.test.ts tests/session.test.ts`

## 16. What counts as mission completion or understanding?

**Plain explanation:** Physical and concept goals read actual execution, plus additional success worlds. Recorded versions retain their original rules. Completion needs goals, committed prediction and correct transfer; v2 capstone also needs a10-character reason and an experiment response. Concept understanding is a separate stricter heuristic.

**Source:** `src/missions/goals.ts`: `judgeGoals`; `judge.ts`: `judgeMission`, `judgeRecorded`; `completion.ts`: `completionChecks`; `src/learning/mastery.ts`: `conceptEvidence`; `achievements.ts` derives stamps.

**Example:** Hand-copying M06 moves can solve its physical path but fail its helper-call concept check. Completing M01 with one successful transfer can still show Working on it. Understanding requires2 distinct correct unassisted scenarios, a correct unseen/latest transfer, a reason and no currently supported conflicting idea.

**Do:** Explain why a collision stop, Run click, assigned team role or revealed solution alone earns no mastery. Run both positive references and deliberately flawed programs.

**Personally implement:** A negative capstone/assisted-evidence regression with a real executed fixture; revise an actual completion-message defect only after reproduction. Never edit frozen `src/missions/mission-data/v1.json` or add success overrides.

**Confirm:** `npm run test -- --run tests/h-goals.test.ts tests/h-judge.test.ts tests/h-completion.test.ts tests/ij-achievements.test.ts`

## Final personal demonstration and evidence checklist

- [ ] Explain all 16 concepts without reading the supplied descriptions; mark unknowns honestly.
- [ ] Personally implement and justify meaningful technical work; capture exact before/after output and commits, not agent-produced statements about student work.
- [ ] Run targeted tests and `npm run check`, `npm run format:check`, `npm run scan:secrets`, `npm run verify:spec -- modified`; run the relevant actual production browser journeys. Record real local vs CI evidence separately.
- [ ] Rehearse a changed-number run and predict its trace before executing it; explain one rejected counterexample and one contradictory observation.
- [ ] Review AI/contributor disclosure, original history and current official requirements with the owner/organizer. A completed workbook alone does not certify contest compliance.

Actual student/reviewer completion record: ______
