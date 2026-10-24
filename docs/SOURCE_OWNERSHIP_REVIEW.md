# Source ownership and contribution review

**Inventory prepared 2026-10-24; AWAITING STUDENT REVIEW and owner confirmation.** Reviewed baseline: `abd9d0a50abb30afd2d46057caac7ddfb90f4a9d`. No application behavior changes are authorized merely to produce a personal-contribution claim. This inventory is evidence of what needs review, not an authorship certificate.

## Evidence and labels

Evidence inspected: [AI log](AI_ASSISTANCE_LOG.md), current source, `git log --oneline`, source-specific `git log -- FILE`, F/G/H/I/J acceptance records and persistent tests. The AI log explicitly identifies substantial agent-authored implementation, tests, educational text and UI. Commit author/committer metadata identifies a Git identity, not who personally designed/typed/revised the algorithm. A friend operating Claude Code or Codex is not evidence of independent student code.

- **AI-ASSISTED:** the existing log attributes substantial development in this area to coding agents; student independent work must be separately evidenced.
- **CONTRIBUTOR REQUIRES CONFIRMATION:** a human's actual role, entrant status and contribution have not been established beyond user reports/git metadata.
- **AWAITING STUDENT REVIEW:** no completed personal explanation/revision/test record is supplied.
- **UNVERIFIED:** evidence does not establish the claim; do not fill gaps by inference.
- **VERIFIED STUDENT CONTRIBUTION:** reserved for an actual student-confirmed substantive contribution with source/commit/test evidence. **No independent student-written implementation is verified by this audit.** That is a statement about available evidence, not a claim that the student did nothing.

Known human involvement from the user's account: product direction, reported experience helping younger FLL/SPIKE learners and coordinating updates between computers. These remain owner-reported; the record does not substantiate a particular person's independent coding hours, algorithms, eligibility or personal testing. Names on older commits are deliberately not treated as an entrant roster.

## Significant subsystem inventory

Every row below is **AI-ASSISTED / AWAITING STUDENT REVIEW** on the existing disclosure evidence. Human technical authorship for every row is **CONTRIBUTOR REQUIRES CONFIRMATION** unless a genuine record is later added.

| Subsystem / real source                                                                                                                                                    | Functionality and exact review entry                                                        | AI evidence / inspectable checkpoint                | Required personal task and unresolved ownership                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain contracts: `src/domain/{types,schemas,invariants,constants}.ts`                                                                                                     | Validated versioned inputs, `assertBounded`, `stableHash`, limits                           | AI log A–F; `4c170a9`, `96c76f3`                    | Explain structural/byte limits, immutable prediction identity and unknown-version rejection; identify any actual student design/revision                    |
| Geometry/physics: `src/engine/{geometry,sweep,robot}.ts`                                                                                                                   | `rayRectangle`, `rayCircle`, `sweepCircle`, `advanceRobot`                                  | AI log F; `96c76f3`                                 | Derive a slab hit and continuous contact; add an independent numerical test, then personally revise a meaningful edge case if warranted                     |
| Sensing/world editor: `src/engine/{sensors,world,placement}.ts`, `src/features/lab/WorldEditor.tsx`, `src/features/lab/world-tools.ts`                                     | `readSensors`, `nearestLegalSpawn`; legal edits and sensor refresh                          | AI log D/E/F and friend #3 F verification           | Explain offset, null, edge/priority and wall-clamp semantics; provenance of any human geometry/content contribution unknown                                 |
| Blockly/AST: `src/interpreter/{ast,blockly-workspace,block-definitions,validate,pseudocode}.ts`                                                                            | `editableProgram`, `programWorkspace`, `validateProgram`, `pseudocode`                      | AI log D/E/F; `b074b27`, `96c76f3`                  | Trace one actual block/input to AST and error focus; personally add/refine a validation case rather than claim generated JS executes                        |
| Interpreter: `src/interpreter/interpreter.ts`, `legacy/`                                                                                                                   | `Interpreter.step`, private `evaluate`/`emit`, `executeAsync`, `executeRecorded`            | AI log F, G protected seams; `96c76f3`, `24fe1b6`   | Explain explicit frames, budgets, cancellation and version selection; document any independent implementation/revision with tests                           |
| Debugger/rendering: `src/interpreter/{debugger,source-replay}.ts`, `src/engine/replay.ts`, `src/features/lab/useTracePlayback.ts`, `src/components/illustration/Stage.tsx` | `nextCodeCursor`, `nextTickCursor`, `conditionComparisonIds`, `rebuildSnapshot`, `replayAt` | AI log F/IJ                                         | Explain presentation versus logical time, exact causal source selection and snapshot recovery; confirm no student-authored artwork claim without evidence   |
| Mental models/taxonomy: `src/learning/{taxonomy,mental-models,probe-templates}.ts`                                                                                         | 14 explicit altered-rule models, `runModel`, `observe`, `buildProbe`                        | AI log G; `24fe1b6`; cache fix `1475fc1`            | Explain simplified assumptions such as perceived-near=30 and no-misconception neutral seam; personally test/change a justified model rule                   |
| Diagnosis: `src/learning/{diagnosis,investigation,predictions}.ts`                                                                                                         | `recordPrediction`, `attemptObservations`, `assess`, `selectNextProbe`                      | AI log G; `fc3374a`                                 | Explain independent support, contradictions, ambiguous first answer and actual two-model divergence; no validated psychological diagnosis claim             |
| Counterexamples: `src/learning/counterexamples.ts`, `src/features/experiments/Experiment.tsx`                                                                              | `candidateEdits`, `applyEdit`, `searchCounterexamples`, `explainCandidate`                  | AI log G; `a023835`                                 | Explain legal single edits, executed truth, ambiguity/bump rejection, ranking and no-candidate result; personally revise/test a justified constraint        |
| Transfer/mastery/planner: `src/learning/{transfer,mastery,adaptive-planner,achievements}.ts`                                                                               | `transferPool`, `chooseTransfer`, `conceptEvidence`, `recommend`                            | AI log G/IJ; `c73cf7f`, `a4f77af`, `a02705a`        | Distinguish new evidence from repeated revealed answers and goal completion from understanding; review authored heuristic thresholds                        |
| Missions/curriculum: `src/missions/{catalog,curriculum,goals,judge,completion,legacy-v1}.ts`, `mission-data/v1.json`                                                       | `missionAuthoring`, `judgeGoals`, `judgeMission`, `judgeRecorded`, `completionChecks`       | AI log H; `456c955` plus mission-specific H commits | Solve reference/flawed examples, justify tolerances and pedagogy; teacher review unknown. Never edit frozen v1; new changes require documented versioning   |
| Persistence/privacy: `src/storage/*`, `src/app/session.ts`                                                                                                                 | `saveData`, `appendAttempt`, `annotateAttempt`, `validateImport`, `mergeData`, `csvCell`    | AI log A–IJ; `b074b27`, `5e123f2`, `ec29204`        | Explain same-profile exposure, atomic rollback, replay proof, migration/merge and CSV escaping; owner must confirm any independent data-design work         |
| Collaboration: `src/collaboration/*`, `src/features/team/*`                                                                                                                | `submitTurn`, `startHuddle`, `runTeamRound`, `advanceTeamRound`, help history               | AI log D/E/IJ; `5d33076`                            | Explain 2–6 local learners, locked private answers, role coverage, shared evidence and no solo-mastery award; entrant roster is a separate question         |
| App/UI/content: `src/app/*`, `src/features/*`, `src/components/*`, `src/styles/*`                                                                                          | Real routes, accessible controls, local progress/instructor and original SVG presentation   | AI log D/E/IJ                                       | Review keyboard/accessibility, content accuracy and layout; product requirements are owner-reported, implementation attribution unverified                  |
| Tests/tooling/docs: `tests/`, `e2e/`, `scripts/`, `.github/workflows/ci.yml`, `docs/`, README                                                                              | Unit/integration/E2E/axe, audits, reproducible builds, Part K materials                     | AI log throughout; this session's commits           | Personally design/run/explain tests; distinguish AI-executed tests from student work, browser evidence from human study and narration from a recorded video |

## Exact Git checkpoints (source evidence, not human authorship proof)

```text
96c76f3405986d997eecae230e9b998db9ec5a6b  F physics/interpreter/debugger
24fe1b6ae7bb97673d4c80876b1530d3f728a3b1  executable mental models
fc3374a04a221fd00f7a78b8ca4276bb0362590f  evidence/probe selection
a023835a8608ca6b708981b72acb4e643f2d745c  executed counterexample search
c73cf7f08fd8e5ec2bc8b64f670c6de7f5d26964  adaptive transfer
a4f77af3fdf7e46a466480482ca8ddae6cb5add3  derived concept evidence
456c9556005b6d1e4389c99faf42515bb4e5ed3f  mission/capstone completion
1475fc1baef0ed7b4bf86c4294afaa0571030a06  bounded model cache
5d3307652319fd2949c163c76e9c35796c0b131c  immutable team assistance
a02705a485f78e920a2002f5e12a8c07ef73bd72  evidence-derived stamps
```

Inspect with `git show COMMIT -- FILE` and `git log --follow -- FILE`; expand short references above if needed. History plus disclosure supports labeling these AI-assisted; it does not establish independently student-written percentages. No fabricated percentage of AI/human lines is supplied.

## Student contribution ledger — deliberately unfilled

| Student-confirmed role | Actual substantive change and rationale | Exact commit/files | Personally designed/run test and literal result | Personal explanation/reviewer/date | Status                         |
| ---------------------- | --------------------------------------- | ------------------ | ----------------------------------------------- | ---------------------------------- | ------------------------------ |
| ______                 | ______                                  | ______             | ______                                          | ______                             | UNVERIFIED — awaiting evidence |

For product direction or non-code work, record it accurately in a separate owner-confirmed note; do not relabel it as implementation. Keep identifying eligibility documents privately, not in this public ledger. Contributions from other people must be credited honestly and checked against the actual entrant/team rules.

## Required owner resolution

The [official-source review](CONGRESSIONAL_APP_CHALLENGE_2026.md) identifies a real concern: extensive agent-authored technical development is documented, while significant independent student implementation/revision is not verified. A disclosure, oral memorization, adding a comment or changing a constant solely for attribution does not establish eligibility. The owner must personally understand/revise meaningful implementation, test it, record actual evidence, confirm collaborators/entrant status and ask the organizer about unresolved compliance questions. Do not assume later revisions automatically cure the earlier development history.

Use the [16-concept workbook](STUDENT_TECHNICAL_REVIEW.md) and [disclosure draft](AI_DISCLOSURE_DRAFT.md). Keep review, human study, video, hosting and submission statuses separate. This Part K audit does not certify legal ownership, contest eligibility or human actions that have not occurred.
