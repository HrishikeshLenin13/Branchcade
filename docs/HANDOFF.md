# Branchcade handoff

## Current operational handoff — Part L (2026-10-24)

**Project:** Branchcade.

**Current completed phase:** A–J technical implementation and K prepared materials re-verified locally; L startup/browser/release documentation complete locally, final pushed L CI pending until recorded in TEST_REPORT. Human release/submission actions are separate.

**Current branch:** `main`, exclusively. No branches, PRs, force pushes, rebases or discarded work.

**Commit SHA (local):** `3d8b5f5c3fbc4a076c30d1c17bd03181dd306d1e` at the pre-L documentation checkpoint; L documentation/tooling changes follow it. See current `git rev-parse HEAD` and final CI for the containing commit, which cannot embed its own SHA.

**Remote pushed SHA (verified):** `3d8b5f5c3fbc4a076c30d1c17bd03181dd306d1e` at session synchronization; independently confirmed [baseline CI](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40133267764). Final L pushed SHA/run is recorded after push below/in TEST_REPORT. Do not treat a previous run as verification of later files.

**Start environment (Node/npm):** macOS 27.0.1 Darwin arm64; default Node 24.13.0, maintained `.nvmrc` Node 24.22.1 explicitly selected from the existing runtime for commands; npm 11.6.2. Actual checkout is `/Users/mukeshbokam/Documents/Codex/2026-10-23/https-github-com-hrishikeshlenin13-branchcade-git/work/branchcade`; the suggested `~/Desktop/Branchcade` does not exist here. Use the actual clone path on each machine. Locked `npm ci`; no package changes. Fresh production builds precede browser evidence.

**Changed files/modules:** AGENTS and SPEC current invocation; HANDOFF, STATUS, TEST_REPORT, DEPLOYMENT, AI_ASSISTANCE_LOG, contest-source review and README release links; new PART_L_ACCEPTANCE, RELEASE_READINESS and POST_L_AUDIT_PLAN; existing demo runner gains selectable output, console/network/layout/trace observation; Part K document guard recognizes the authorized subsequent L status without changing human-pending checks; genuine L evidence under `docs/evidence/l/`. No `src/`, package/lockfile, branding or frozen historical mission changes.

**Features actually working:** all eight missions and goal/transfer journeys; onboarding/library/navigation; real Blockly field/context-menu edits and validated execution; deterministic physics/sensing and source-linked stepping/replay; locked predictions, uncertain diagnoses, counterexamples/transfer and saved evidence; Lab world edits; 2–6-person local team handoffs/roles; real local progress/instructor filters/exports/assignments; settings/import/export/reset/delete; blocked-storage/recovery/unknown-route UI. These are tested capabilities, not a guarantee of every possible input or classroom effectiveness.

**Features not yet implemented:** accounts/authentication, cloud sync/backend/remote classroom, public hosting, service-worker/PWA offline installation, final approved-logo integration. No new runtime functionality was added during L. Human video/submission/study work remains unperformed.

**Manual browser checks actually performed:** a scripted real-browser production walkthrough, not a human participant study: M01 → open Blockly → wrong STOP prediction → actual 24<20 false/else → source comparison → adaptive probes → generated wall experiment (30cm MOVE; 12cm STOP, unchanged threshold20) → distinct transfer → Finish → “Saved locally.” → reload → Progress. Four genuine desktop/Chromebook-sized JPEGs were opened and visually inspected; no global overflow at captured states. Real field/context-menu editing and the other release flows were exercised by the maintained Chromium E2E suite. No new Playwright MCP/Chrome DevTools MCP session was available or claimed; ordinary Playwright supplied page/console/network observations.

**Automated commands + actual pass/fail outcomes:** fresh `npm ci`; `npm run check`: lint/strict TS, 396/396 unit tests in29files and build pass; `npm run test:e2e -- --project=chromium --workers=2 --retries=0` with CI=1:105/105 pass; format/secrets/spec modified and `node scripts/verify-k-docs.mjs` pass; npm audit0. Focused Firefox attempted and fails at browser startup before app code (profile folder); no local Firefox pass. Final remote Chromium/Firefox counts and new docs' final gates are in TEST_REPORT.

**Screenshots/trace artifact paths:** `docs/evidence/l/{readme-workbench,chromebook-workbench,m01-trace,counterexample}.jpg`; `rehearsal.json` records empty errors/warnings/failed requests and local-origin-only requests; `install.log`, `check.log`, `chromium.log`, `firefox-launch.log`, `static-preview.json`. Full local synthetic walkthrough trace: `../l-smoke-trace.zip` outside the repository. The local Firefox launch context/trace is under `test-results/foundation-new-alias-actua-4555d-nd-instructor-export-delete-firefox/` until the next Playwright run clears test-results. These are QA artifacts, not demo media or real learner records.

**Known bugs/limitations:** no new app blocker found in this smoke. Local Firefox profile-launch failure persists; Ubuntu CI must supply Firefox proof. Blockly is a roughly799kB lazy chunk and its spatial editor may require pointer use; bounded simulation/search remains on the main thread. No physical-device/WebKit/assistive-technology certification or human learning study is claimed. Same-browser records and downloaded exports are not confidential between device users. Contest deadline discrepancy and AI/student contribution eligibility remain unresolved.

**Architectural decisions/contract changes:** preserve pure centimeter/50ms deterministic engine, typed AST and bounded interpreter, separate replay presentation clock, immutable execution/evidence snapshots, mission/engine version selection and versioned IndexedDB envelope. No schema, provider or algorithm contract changed in L. Future sync requirements are a proposal, not implemented ADRs.

**Privacy/security notes:** no runtime API, analytics, accounts or learner-content requests added. Actual smoke: 0 page/console errors, 0 warnings, failed requests or HTTP errors; all origins `http://127.0.0.1:4173`. Exports can contain optional reasoning; keep them private. Static hosts can retain path/IP logs. Provider-specific security headers require checking on the actual deployed URL. No credentials read into Git/docs or hosting login initiated.

**AI-assisted portions and student review needed:** L documents and QA-tool extensions are AI-assisted; no personal student authorship is inferred from Git metadata. Student must personally understand, meaningfully revise/test where warranted and document real contributions to engine/interpreter/diagnosis/counterexample/persistence code using SOURCE_OWNERSHIP_REVIEW and STUDENT_TECHNICAL_REVIEW. Owner must approve disclosure and resolve eligibility; preparing a workbook is not completing it.

**Next chronological phase:** finish owner-dependent release/contest actions; proposed independent two-reviewer audit only upon separate authorization. It is not Part M of SPEC. Accounts/sync and approved-logo work wait for later design/privacy/asset approval. Do not execute the proposal automatically.

**First actions for next Codex session:**

1. Locate the actual clone; `pwd`, `git status --short --branch`, `git branch --show-current`, `git remote -v`, `git fetch --all --prune`, compare `git rev-parse HEAD` and `git rev-parse origin/main`. Preserve dirty/diverged work; only clean main may `git pull --ff-only origin main`.
2. Read AGENTS, SPEC L1–L4/full relevant requirements, STATUS, this current block, PART_L_ACCEPTANCE, RELEASE_READINESS and TEST_REPORT. Check CI for the exact fetched SHA, including flaky/retry summaries.
3. `nvm use`, `npm ci`, `npm run format:check`, `npm run scan:secrets`, `npm run verify:spec -- modified`, `node scripts/verify-k-docs.mjs`, `npm run check`, `npm run test:e2e`, `npm audit`. If local Firefox fails before app code, preserve that result and verify remote Firefox separately.
4. `npm run preview -- --port 4173 --strictPort`; for a new isolated synthetic smoke, set `BRANCHCADE_REHEARSAL_OUTPUT=docs/evidence/<new-session>` and optionally `BRANCHCADE_REHEARSAL_TRACE=<local-zip-path>` before `node scripts/rehearse-k-demo.mjs`. Never overwrite earlier evidence or mistake a previous preview for current source.
5. Only start the owner's newly authorized scope. For a future audit follow POST_L_AUDIT_PLAN independent findings first; for release use the owner checklist without registering/submitting/hosting beyond explicit authorization.

## Historical scope — Part K prepared materials (2026-10-24)

User-authorized scope: K1–K4 only on updated A–J, **main only**. Start/fetched remote: `abd9d0a50abb30afd2d46057caac7ddfb90f4a9d`, clean. Prior [CI 40129455981](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40129455981) was independently confirmed green. No runtime source, frozen mission v1, dependency lock or historical judging changes were made. Part L is **NOT STARTED**.

Prepared: complete README with an authentic Blockly/stage/prediction screenshot and architecture/algorithm guide; voluntary learner/instructor protocol, blank forms and unfilled results; 2:48 narration/2:35 alternate, exact storyboard, macOS checklist, verified official-source review and answer drafts; subsystem AI/contributor inventory, 16-concept personal workbook and disclosure draft. Old foundation demo/study/submission files now point to the canonical materials instead of contradicting the current eight-mission app. See [PART_K_ACCEPTANCE](PART_K_ACCEPTANCE.md).

Actual verification on Node 24.22.1/npm 11.19.0: fresh npm ci; lint/strict TS/396 tests across 29 files/build; local production Chromium 105/105,0 failed/skipped; corrected-mode spec check, formatting/secrets and npm audit 0. New docs/rehearsal scripts have their final gates recorded in TEST_REPORT. The initial spec invocation lacked the required mode and failed; rerunning `npm run verify:spec -- modified` passed without changing its guard. Local Firefox's previously documented profile-launch failure is not counted as a local pass; cross-browser CI is tracked separately.

The real production rehearsal executes M01's wrong-STOP prediction, actual 24<20 false/else, adaptive 40 cm then 10 cm probes, generated wall-distance experiment, 30 cm MOVE and 12 cm STOP with threshold 20, distinct 32 / <35 transfer and saved Progress after reload. Zero page errors/nonlocal request origins. Playwright MCP independently verified comparison selection/probe rationale; Chrome DevTools spot check had no warn/error or fetch/XHR. Three actual JPEGs were opened and inspected; screenshot framing was adjusted to show Blockly, not source/UI behavior. All answers are labeled synthetic demo choices, not real participants. Evidence/commands: `docs/evidence/k/` and `scripts/rehearse-k-demo.mjs`.

**Human-state separation:** protocol/script/inventory/workbook are prepared; actual learner/instructor sessions, student explanation/substantive implementation/revision/test evidence, owner disclosure approval, eligibility/collaborator confirmation, real recording/duration/public upload and final readiness all remain **AWAITING OWNER ACTION**. Existing logs document extensive AI-authored technical work; no independent student implementation is verified here. Do not claim compliance from a disclosure alone.

**Urgent deadline discrepancy:** the official 2026 PDF says October 26 noon EDT / 11 a.m. CDT; official registration says 9 p.m. ET / 8 p.m. CDT. Plan to the earlier cutoff and obtain organizer clarification. Public portal character limits were not visible without login and remain unverified. No account/registration/upload/submission or public hosting action was performed. Public deployment still requires owner authorization and actual URL checks.

Commits: `8d562aa5d91f607ba599dd334fc8170a3c41aa6a` (human-review materials) and `986c7add51f70845cdf6f9b6d16bd9ec3e7db963` (full prepared package) were pushed and their remote SHAs matched. The first Part K [CI 40132539841](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40132539841) completed successfully: 396 unit tests, 210 browser tests across Chromium/Firefox, all quality gates and audit 0. TEST_REPORT records that preceding observed checkpoint; later evidence-only commits must have their actual CI inspected. Keep original/historical sections below as history, not current instructions to redo A–J.

Next actions: owner reads the workbook/source inventory and confirms actual personal work/contributors; reviews official-source discrepancy; conducts any voluntary sessions with permission; adapts narration and records/inspects real media. An engineering continuation should fetch clean main, run `node scripts/verify-k-docs.mjs` and relevant gates, preserve human-pending flags, and only perform separately user-authorized work. Do not start Part L implicitly.

## Previous checkpoint — I/J red CI repaired (2026-10-24)

Latest verified source commit: `fddd0652554673081bc09b9ca4d6b3f402388044` on `main`. [GitHub Actions run 40128767480](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40128767480) is green: 396 unit/integration tests, 105 Chromium E2E, 105 Firefox E2E, no failed or flaky tests, format/secrets/spec, lint, strict TypeScript, production build and dependency audit all passed. The latest repair commits are `175487c`, `7ccd12b`, `a57e9e2`, `6c96612`, and `fddd065`, all pushed directly to `main`.

The two reported failures were test issues: mission start worked but its assertion matched two identical headings; the investigation’s final answer correctly ended the question list while the helper performed separate racing locator reads. Additional full-suite flakes came from a terminal replay cursor, unrelated Blockly stress fixtures, a cancellation fixture that exhausted its budget, and a team test that navigated before observing local-save completion. These were repaired in test locators, synchronization and fixtures; no production app defect was found. The targeted roster journey passed 10/10 local Chromium repetitions with retries disabled, and the full remote run passed both browser projects. Local Firefox cannot launch in this workstation due to a Playwright profile-folder error; use the verified remote Firefox run as evidence.

Continue from the I/J acceptance record and test report. Do not begin Parts K or L unless separately requested. Preserve `main`-only work and do not rewrite history.

## Friend #3 session — Parts F, G and H (2026-10-24)

Project: Branchcade
Completed in this session: Part F re-verified and finished, Part G (G1–G6) implemented, **Part H implemented** (requested later in the same session). Parts I–L not started.
Branch: main only (no other branches, no PRs, no force-push). Everything is **pushed** to https://github.com/HrishikeshLenin13/Branchcade. See `git log --oneline 963ec3a..origin/main`.
GitHub Actions: green on `456c955` (F + G + early H) and on `c7e1091` (all Part H code). Both runs include Chromium and Firefox E2E. Later docs-only commits were checked locally.
Part H in short: eight missions upgraded in place to mission data version 2 (multi-scenario success, new goal kinds, curriculum material, hint ladder, confirmed Show solution, second questions, capstone completion); version-1 data frozen in `src/missions/mission-data/v1.json` and used to judge older records. Details: `docs/PART_H_ACCEPTANCE.md`.
Verification: 368 unit tests (26 files), 59 Chromium E2E, format/secrets/spec/lint/typecheck/build pass, npm audit 0.
Known limitations: 6 of 14 ideas still only surface through optional investigation; Team mode has no hint ladder or second question; narratives, hints and teacher notes are AI-written and need student/teacher review.

### Instructions for friend #4 (Part I)

1. `git clone https://github.com/HrishikeshLenin13/Branchcade && cd Branchcade && npm ci && npm run check && npm run test:e2e`. Confirm the latest GitHub Actions run is green before changing anything.
2. Read AGENTS.md, this file, docs/STATUS.json and the PART_F/G/H acceptance docs.
3. Part I is the 12-phase plan (Phases 00–11). STATUS.json marks 05/06/07 as in progress: code is done and CI is green, but student algorithm review is pending and some Phase 07 extras (onboarding polish, restrained badges) were outside this request. Start from the first phase whose gate isn't verified, re-checking evidence instead of trusting markers.
4. Never edit `mission-data/v1.json`. To change a mission again, bump its version and keep older versions judgeable (see `missions/judge.ts`).
5. Keep `tests/g-learning.test.ts` and `tests/h-curriculum.test.ts` passing. They encode the G and H acceptance criteria.

### Earlier in this session — Part F verified, Part G implemented

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
