# Branchcade D/E checkpoint

Project: Branchcade
Authorized scope: investigate the reported failing CI, then implement Parts D and E on the existing A–C foundation.
Branch: main, preserving the repository’s single-branch workflow.
Base checkpoint: 1e27f5e (A–C); its preceding application CI fix 7a9d211 and successful run 39894586457 were independently verified through GitHub API.
Local source checkpoints: b074b27 (missions and records), followed by the responsive-workbench commit shown in git log.
Remote pushed checkpoint: pending final push and CI at this documentation checkpoint. No hash is fabricated.
Environment: pinned Node 24.22.1 used for local final gates; npm with existing lockfile.

## What works

Eight authored missions/reference programs and actual goal predicates; three-step anonymous onboarding; searchable/filterable mission library; desktop three-column workbench; validated full Blockly AST roundtrips; actual stage/world manipulation, sensor range/comparator, world history and collections; camera controls and cursor-based playback/debugging; immutable prediction→probe→experiment→transfer flow and append-only retries; meaningful local 2–6-person contributions/huddles/editable shared program/rotation; multiple local learners, evidence/replay/scoped exports; instructor real filters/local assignments/CSV/JSON/print; validated merge/replace rollback; independent clear scopes, typed erase and storage recovery.

## Actual verification

- npm run check: passed lint, strict TypeScript, 158 unit/integration/component tests across 14 files, and production build.
- Production preview Chromium: 39 passed, 0 failed, 0 skipped. Covers all eight mission transfers/reloads, original save regression, both diagnosis paths, real pointer drag, Blockly apply, legal/invalid imports, team handoffs, settings persistence, storage blocked, privacy requests, four viewport widths, 11-route initial axe scans and safe budget-stop UI.
- Format, secret scan, original-spec preservation/current-scope check and full dependency audit: passed; audit found zero vulnerabilities.
- Local Firefox installed but its process exited before app load with “Could not find profile folder,” for both temporary and explicitly existing workspace profile paths. No local Firefox success is claimed. Run the unchanged two-browser CI on Ubuntu after pushing.
- Manually opened screenshots include Home, onboarding, library, help, settings, instructor, progress, team and M01 workbench at desktop/Chromebook and selected 390px phone screens. Chromebook primary prediction action observed at y681.6, height44 in a 768px viewport and passes the original full-visibility regression.
- Evidence: docs/evidence/de-check.log, de-chromium.log, de-audit.json and de-*.png. Full interaction coverage and evidence boundaries are in PARTS_DE_ACCEPTANCE and INTERACTION_AUDIT.

## Remaining boundaries

Later F–L/full release gates remain separately unverified. No deployment, physical Chromebook, WebKit, real child testing or learning efficacy is claimed. Counterexample synthesis is a bounded threshold/sensor bank; unsupported targets get executable probes and transparent no-candidate recovery into transfer. Interpreter computation is synchronous with hard budgets. Blockly’s spatial authoring may need a pointer; inert text and numeric world controls are available. Its lazy bundle remains about798KB minified. AI-assisted portions and uncompleted student review are recorded in AI_ASSISTANCE_LOG.

## Continue

Fetch main, inspect STATUS/TEST_REPORT and verify the latest CI/checkpoint. Do not automatically start later phases: the current user asked only for D and E. Use npm ci, npm run dev, npm run check and npm run test:e2e. Preserve learner data, meaningful commits and the main-only policy. Source review: missions/catalog, missions/goals, learning/probes, storage/import-export, storage/progress-records, features/lab, collaboration/session and app/session.
