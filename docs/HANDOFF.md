# Branchcade build checkpoint

Project: Branchcade
Current completed phase:00 foundation; user-authorized Parts A–C, with one real seven-stage learning slice.
Current branch: main — the only local/remote branch; GitHub default main.
Commit SHA (local): verified application checkpoint7a9d211471956c329557315ee8e8842ef456602d. The following documentation/evidence-only checkpoint is identified by `git log -1 --oneline` (self-referential hashes are not fabricated).
Remote pushed SHA (verified):7a9d211471956c329557315ee8e8842ef456602d at the source verification; final documentation push is verified again in the session's user-facing report.
Start environment (Node/npm): host26.8.1 /11.19.0; clean maintained Node24.22.1 /npm11.19.0 gates performed.

## Changed files/modules and actual features

- All C3 shared types, strict runtime schemas, sample world/program/mission/profile, canonical hashes and bounded untrusted-data validation.
- Pure centimeter geometry/sensors, fixed50ms collision-aware motion, pause/reset/replay, bounded typed AST interpreter and actual Blockly JSON→AST adapter. No eval or executable generated strings.
- Home, anonymous onboarding, M01/library, free lab, real trace inspector, diagnostic probes, executed counterexamples, parameter experiment, distinct transfer, local progress/team/instructor/settings/About and recovery routes.
- Actual local2–6-alias pass-and-play; private individual predictions, real shared goal proof, role rotation. Instructor sees real local records, exports filtered CSV and confirms deletion. Settings validates JSON before explicit replacement.
- Original SVG robot/stage; self-hosted fonts/tokens; keyboard dialogs, skip/help, reduced motion/text/contrast/theme; storage-denied recovery.
- Reproducible npm/Node config, CI with pinned action SHAs, documentation and complete A–C acceptance/interaction records.

## Verification actually performed

- Fresh Node24 npm ci: passed. Initial fresh gate85 tests; final source plus durable-save regression86 tests passed.
- npm run format:check, npm run lint, npm run typecheck, npm run test -- --run, npm run build: passed. No unit tests skipped.
- npm run test:e2e on real production preview:54 passed,0 failed,0 skipped;27 each Chromium/Firefox. Covers new alias, both diagnostic paths, transfer/reload, actual pointer drag, Blockly apply/undo/redo, valid/invalid files, real instructor export/delete,3/6-person rounds, preferences, storage blocked, keyboard, route recovery, privacy requests, four viewport widths and11-route initial-state axe scans.
- npm audit (full dependencies):0 vulnerabilities at checked lockfile. Secret scan and original-spec/hash/rollback-copy checks passed.
- First GitHub run39893940001 exposed2 durable-save/reload races; fixed, not skipped. New CI39894586457 on application commit7a9d211 passed all steps, including54 browser tests and audit. Evidence: docs/evidence/github-ci.json and live Actions URL.
- Playwright MCP: actual Home/onboarding/M01/wrong prediction/probes/experiment, real Blockly Apply, Progress, and rendered destinations for every main nav route. Browser screenshots actually opened and reviewed.
- Chrome DevTools MCP: production Home no warning/error at inspection, no fetch/XHR; unthrottled local LCP282ms, CLS0.03. These are local measurements, not hosted/user-population claims.
- Screenshot paths: docs/evidence/home-desktop.png, home-mobile.png, mission-chromebook.png, mission-evidence-desktop.png. Reviewed1440×900,1366×768,390×844; automated overflow/nav also1024×768. Chromebook Run action y706.7/height40 in768px viewport, confirmed fully visible.
- Exact streams: docs/evidence/node24-gates.log, final-node24-check.log, production-browser-tests.log. Scope diff/hash/rollback: DIFF_FILE.patch, VERIFICATION.txt, executable ROLLBACK.sh. Working SPEC remains scoped; rollback was tested only on a separate copy.

## Known limitations / unfinished work

- This is not the complete eight-mission or Parts D–L competition release. Only M01 is exposed. Other phase gates00–11 must be interpreted from STATUS; phases01–11 are not verified by this foundation.
- Initial Blockly toolbox is a subset of the broader tested AST. Full function/variable visual authoring, larger curriculum/diagnostic planner, advanced world authoring, real-time animator/debugger/worker and PWA remain later work. Free lab is not scored as a mission.
- Lazy Blockly chunk remains~790KB minified; the warning is documented, not hidden. No WebKit, physical Chromebook or human study claimed. ESLint9 peer-compatibility maintenance limitation is documented in ADR.
- Vercel CLI identity check returned invalid token. No deployment performed or URL invented. Built dist/, vercel.json and _redirects are ready; owner login/deploy instructions are in README. Hosting authorization is the remaining external action for a public URL.
- Student review, personal contributions, current contest rule verification and optional authorized usability study remain human/later-release tasks. No student actions or outcomes were invented.

## Architecture, privacy and AI notes

Schemas v1; units in centimeters; fixed50ms steps; prediction/goal core immutable, later learning annotations append-only. IndexedDB writes are ordered and show Saving/Saved acknowledgment; reload while writes are pending has a beforeunload guard. Unknown/corrupt imports never silently overwrite current data. Local anonymous data only; no accounts/analytics/inference service or learner-content network calls. Export files are separate from in-app deletion. All source/tests/docs/SVG in this session are AI-assisted; see AI_ASSISTANCE_LOG for real required student review.

Next chronological phase: user-authorized Part D / remaining master-prompt phases, beginning with a fresh assessment of already implemented representative geometry/editor code. Do not rebuild the working application or claim later gates passed automatically.
First actions for next Codex session: inspect this handoff/STATUS, pwd/status/remotes/log, fetch/prune, pull clean main --ff-only, npm ci/check/E2E, then implement the next explicitly authorized scope. Keep only main, preserve work, commit/push tested checkpoints.

## Reusable continuation prompt

```text
Continue Branchcade from main. Read AGENTS.md, HANDOFF, STATUS, PARTS_ABC_ACCEPTANCE and SPEC. Parts A-C foundation and application CI are verified; the full later release is not. Reuse the real engine, AST, lesson and local records. Confirm current tests, implement the next user-authorized unfinished scope, inspect the browser, update honest evidence and push tested checkpoints only to main.
```
