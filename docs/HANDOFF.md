# Branchcade handoff

## Friend #3 session — Part F verified, Part G implemented (2026-10-24)

Project: Branchcade
Current completed scope: Part F independently re-verified and finished; Part G (G1–G6) implemented and integrated. **Part H was NOT started**, because the project lead removed it from this invocation.
Current branch: main (no other branches, no PRs, no force-push)
Base: 963ec3a558866c2c777f0287970be6f579e3a01f (origin/main at session start)
Commits made in this session: 38 focused commits on local main, `git log --oneline 963ec3a..main` (5 for Part F, the rest for Part G engine, UI, tests and docs). Every commit passes typecheck, lint, formatting and the full Vitest suite on its own; the final commit also passes the production build and 52 Chromium E2E.
Remote pushed SHA (verified): NOT PUSHED. This session's GitHub identity had no push permission on HrishikeshLenin13/Branchcade (git proxy 403). The commits were handed over as a git bundle and a patch series. Push them from an authorized machine with `git pull --ff-only <bundle> main` or `git am`, then `git push origin main`.
GitHub Actions: not observable from this session. The first push must be checked, especially Firefox, which was not run locally.
Start environment: cloud container, Node v22.22.0 / npm 10.9.4 (repo pins Node 24); Chromium via a local-only Playwright config (container ships browser build 1243, the repo pins 1248).
Changed modules: `src/learning/*` (new: taxonomy, mental-models, scenarios, probe-templates, diagnosis, counterexamples, transfer, concepts, mastery, adaptive-planner, investigation, recommendations; legacy `probes.ts` kept for pre-G records; removed: hypothesis-library, evidence-engine), `src/interpreter/interpreter.ts` (neutral protected seams), `trace.ts` (`runFacts`), `src/domain/schemas.ts` (optional experiment/transfer fields), `src/storage/*` (append-only experiment answers, adaptive import validation), `src/features/diagnosis/Investigation.tsx`, `src/features/experiments/Experiment.tsx`, LabLesson, Progress, Missions, Instructor, AttemptReview, About copy.
Features actually working: see `docs/PART_G_ACCEPTANCE.md`. Adaptive questions; ranked possible ideas with provenance; generated, validated single-change experiments; adaptive transfers; derived concept statuses; "Why this next?" everywhere; everything re-validated on import.
Manual browser checks actually performed: the full wrong-STOP journey at 1366×768, plus panel layout at 1024×768 and 390×844 (no horizontal overflow, 0 console errors). The "Why are you asking?" list, experiment slider, evidence timeline and reload were all checked.
Automated commands and actual outcomes: format:check pass; scan:secrets pass; verify:spec modified pass; npm run check pass (267/267 tests, 21 files; lint; strict TS; build); Chromium E2E 52/52; npm audit 0 vulnerabilities.
Known limitations: 7 of 14 ideas cannot make a first-action mission prediction wrong with the current eight missions (they need optional investigation). The models are single-rule simplifications. `PERCEIVED_NEAR_CM = 30` is an authored assumption. Main-thread computation (measured ≤182 ms cold per search). No Firefox/CI evidence for these commits yet.
Architectural decisions/contract changes: diagnosis is event-sourced from immutable answers; probe ids are self-describing (`g.<template>.<param>`); `Counterexample` schema widened (not persisted); new optional `Attempt.experimentResponses`, `Reassessment.scenarioId`.
Privacy/security notes: no new network calls (privacy E2E rewritten for the adaptive flow); no new personal fields; tampered experiment/probe answers are rejected on import.
AI-assisted portions and student review needed: everything above was AI-written (Claude Code). See AI_ASSISTANCE_LOG for the review checklist. No student review has happened yet.

### Instructions for friend #4

1. Push this work first if it isn't on GitHub yet. From the repo with access: `git fetch origin && git checkout main && git pull --ff-only origin main`, then apply the handed-over bundle (`git pull --ff-only /path/branchcade-friend3.bundle main`; it holds all 38 commits) or patches (`git am /path/patches/*.patch`). Run `git push origin main`, then confirm the GitHub Actions run is green, **especially Firefox**. If CI fails, fix that before anything else.
2. Read AGENTS.md, this file, docs/STATUS.json, PART_F_ACCEPTANCE.md, PART_G_ACCEPTANCE.md and TEST_REPORT.md. Run `npm ci && npm run check && npm run test:e2e`.
3. **Part H was skipped on purpose in this session.** Unless the project lead says otherwise, do Part H before Part I. Keep the eight authored missions (M01–M08) and their ids. Add the H fields (hint ladders, flawed variants, three variants each, probe-bank links, teacher notes, reference-solution verification loop). Wire each mission's `recommendedProbeIds` to the new `g.*` probe templates, and add mission scenarios that let the 7 "silent" ideas show up in a first prediction: equality thresholds, out-of-range readings, re-assigned variables, loop-count questions.
4. Part I is the 12-phase chronological plan (Phases 00–11). STATUS.json marks Phases 05/06 as `in_progress` (code done; CI, Firefox and student review not yet confirmed). Continue with the first phase whose gate isn't verified, re-checking evidence rather than trusting the markers.
5. Do not change the learning engine's rules without updating `tests/g-learning.test.ts`. Those tests encode the G2/G3 acceptance criteria, including the mandatory two-student split.

### Earlier in this session — Part F verification (2026-10-24)

Project: Branchcade
Current completed scope: Part F independently re-verified and finished; Part G in progress (see the section added after this one when it lands). Part H is excluded from this invocation by the project lead.
Current branch: main (no other branches created)
Base commit verified: 963ec3a558866c2c777f0287970be6f579e3a01f (clean, equal to origin/main at session start)
Start environment: cloud container, Node v22.22.0 / npm 10.9.4 (repo pins Node 24; CI uses Node 24)
Changed files/modules: src/engine/sensors.ts (wall clamp fix), src/engine/geometry.ts (comment), src/features/lab/useTracePlayback.ts (pure revealCursor), tests/f-mandatory.test.ts, docs.
Features actually working: everything in PART_F_ACCEPTANCE.md, re-verified against source; legacy v1 attempts are untouched.
Manual browser checks actually performed: M01 run/branch facts, Step tick → Tick 1, Step code, Why did that happen? → exact compare row, Lab load. 0 console errors, 0 external requests (1366×768 Chromium, production preview).
Automated commands + actual outcomes: format:check pass; scan:secrets pass; verify:spec modified pass; npm run check pass (220/220 tests, 20 files); Chromium E2E 49/49 pass; npm audit 0 vulnerabilities. Firefox was not run locally because the container has Chromium only.
Push status: this session's GitHub account has no push permission on HrishikeshLenin13/Branchcade, so commits were made locally on main and handed over as a git bundle/patch series. GitHub Actions could not be observed from this session.
Known limitations: same as the Part F section below; Blockly chunk is about 800KB; computation runs on the main thread in bounded batches, not in a worker.

## Previous: Branchcade Part F checkpoint

Authorized scope: implement master-prompt F1–F6 on the updated A–E repository and regress previous functionality. Branch: main only.
Fetched/fast-forwarded base: bc4c9c0d6b9d8fe7e472ee22382ee959c5e2f353. Its D/E work is preserved, not replaced with the older A/C checkout. The current commit is identified by git log; no self-referential hash is invented.

## Implemented

Continuous exact swept-circle contact,600×360cm nominal lab/radius16, deterministic ray/floor/noise semantics, legal-placement suggestion and edit locking; complete typed Blockly null guard and source lookup; explicit-stack small-step interpreter with finite budgets and actual cooperative cancellation; separate source-linked sensor/comparison/branch/loop/call/return/collision/terminal events;50ms tick stepping, animated code stepping, rAF interpolation, bounded snapshot ring, pan and SVG stage capture. New execution version2 preserves original A–E attempt/team hashes through the isolated legacy runner. See PART_F_ACCEPTANCE and ADR for precise semantics.

## Verified checkpoint

Pinned Node24.22.1: npm ci; npm run check passed lint, strict TypeScript,199 tests across18 files and production build.48 production Chromium E2E checks passed, including all original40 scenario checks (with explicit F semantics), eight new F debugger/edit/cancel/snapshot flows, all eight mission transfers/reloads, team/import/privacy/layout/accessibility checks.40 fixed pre-F starter/reference/transfer fingerprints and mixed-version imports passed. Baseline before modification:158 tests and40 Chromium browser checks. CI after push is pending and must be independently checked.

Original specification hash remains f018432925c785df980a763f4da9c7ff9a3433d71ec54c65f2e52308a0a7244d. F guard-constant original hash is c949c4ccce424cbbdd6ac50ed04f51e13635b99414f2b6c3125f90811bf13478. Tested disposable-copy rollback preserves the modified live limits. Commands/output are in docs/evidence/f/VERIFICATION.txt.

## Remaining verification and boundaries

Check pushed CI on Chromium and Firefox; record final visual evidence and final audit/secret/format gates. Initial F screenshots were opened and the actual result heading corrected; primary Chromebook run button y722.6/height44 remains fully visible. No deployment, physical Chromebook, child study, measured learning effect or student algorithm review is claimed. Blockly's spatial editing may require a pointer; its lazy bundle is about799KB minified. Computation uses bounded yielding main-thread batches, not a worker. Trace history stops at a disclosed4MB cap rather than streaming indefinitely. Legacy attempts retain their original action snapshots; fixed-tick stepping requires a new version2 run.

## Reusable continuation prompt

Read AGENTS.md, docs/HANDOFF.md, STATUS, SPEC Part F, PART_F_ACCEPTANCE and TEST_REPORT. Fetch main, inspect status/log before pulling ff-only. Preserve the latest A–F work and immutable versioned records. Run npm ci, npm run check, format/secrets/spec, audit and production browser tests. Verify CI and actual browser evidence, update handoff, commit and push main only. Do not start G–L without a new user request. Student review remains uncompleted until performed by the student.
