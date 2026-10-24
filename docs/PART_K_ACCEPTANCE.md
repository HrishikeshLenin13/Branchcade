# Part K acceptance — prepared materials versus human completion

Historical Part K record below. Part L was separately authorized afterward; see [current L acceptance](PART_L_ACCEPTANCE.md) and HANDOFF for the later phase and current verification. The original K-session scope statements are preserved as history.

Date: **2026-10-24**. Scope: **K1–K4 only**, preserving existing A–J. Starting and fetched remote main: `abd9d0a50abb30afd2d46057caac7ddfb90f4a9d`. No app, curriculum, package-lock or runtime algorithm change is needed for these deliverables. Part L is **NOT STARTED**. This record uses preceding verified SHAs, never a fabricated self-referential commit hash.

## Requirement map

| Area | Prepared and independently checked                                                                                                                                                                                                                                                | Human completion state                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1   | README product/motivation/features, actual Blockly/stage/prediction screenshot, exact package commands, Mermaid dataflow, actual source/functions, repo tour, privacy/access/limits, tests, license/disclosure, troubleshooting                                                   | No public deployment, formal accessibility certification or student-authorship assurance                                                                                         |
| K2   | [protocol](USER_TESTING_PROTOCOL.md), [blank learner/instructor forms](USER_TESTING_FORM.md), [empty results](USER_TESTING_RESULTS.md); permission/assent, nonidentifying observations, pre24/<20, transfer32 / <35, help/skips, instructor dimensions, retention/analysis limits | **NOT YET CONDUCTED — AWAITING ACTUAL PARTICIPANTS**                                                                                                                             |
| K3   | [2:48 narration plus 2:35 alternate](DEMO_VIDEO_SCRIPT.md), [exact storyboard](DEMO_STORYBOARD.md), [macOS checklist](DEMO_RECORDING_CHECKLIST.md), [official-source review and answer drafts](CONGRESSIONAL_APP_CHALLENGE_2026.md); actual app sequence executed                 | Human adaptation/read-aloud timing, real recording/inspection, public upload and final questions/limits are **AWAITING OWNER ACTION**                                            |
| K4   | [subsystem/source inventory](SOURCE_OWNERSHIP_REVIEW.md), [16-concept workbook](STUDENT_TECHNICAL_REVIEW.md), [AI draft](AI_DISCLOSURE_DRAFT.md); logged assistance and exact source checkpoints distinguished from Git identity                                                  | Personal student review/substantive revision/test/contribution evidence, collaborator verification, disclosure approval and eligibility resolution are **AWAITING OWNER ACTION** |

## Actual fresh engineering verification

Maintained Node **24.22.1**, npm **11.19.0**, local macOS arm64, production preview owned by this checkout at 127.0.0.1:4173. `npm ci` passed; `npm run check` passed lint, strict TypeScript, **396 tests in 29 files** and production build. `npm run format:check` passed on baseline. `npm run scan:secrets` passed. The initial spec command omitted its required mode and failed; corrected **`npm run verify:spec -- modified`** passed without changing the verification script or specification. `npm audit` reported **0 vulnerabilities**. A shell footer originally used zsh's read-only `status` name; the command chain/results were inspected and corrected, not called a green wrapper.

**Local production Chromium:105/105 passed (2.8 minutes), zero failed/skipped**, workers 2, retries 0. Command: `npm exec --yes --package=node@24.22.1 -- npm run test:e2e -- --project=chromium --workers=2`. No new Firefox local pass is claimed; the documented workstation profile-launch issue predates Part K. The fetched source has verified [CI 40129455981](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40129455981) with 105 Chromium +105 Firefox and 396 unit tests. Part K's subsequent CI/checkpoints are recorded in TEST_REPORT; historical green runs do not stand in for later unobserved results.

Reproduction and raw artifacts: [baseline command output](evidence/k/baseline.log), [corrected spec/audit](evidence/k/spec-audit.log), [local Chromium](evidence/k/chromium.log), [rehearsal output](evidence/k/rehearsal.log), [actual rehearsal observations](evidence/k/rehearsal.json). Final documentation/format/secrets/spec/source-scope and CI results are appended to TEST_REPORT after execution. No test skip, suppressed assertion or app change was used to ease the demo.

## Actual visual and browser checks

`node scripts/rehearse-k-demo.mjs` passed against freshly rebuilt current production source: actual Blockly → deliberately wrong M01 STOP → `24 <20 false` and real movement → `g.which-branch.40` / `g.branch-at.10-lt` → comparison-direction experiment → wall 30/12 with unchanged threshold20 → distinct32 / <35 STOP transfer → saved/reloaded Progress. The script observed **zero page errors and local-origin-only requests**. It used model output only to select labeled synthetic probe answers; it did not inject application state or mock physics. Its narration duration is not measured media duration.

Three real JPEGs were opened and visually inspected at 1440×1000:

- [README workbench](evidence/k/readme-workbench.jpg): stage/ray/24cm, actual Blockly conditional and prediction controls visible together. Initial framing omitted Blockly; collapsing redundant pseudocode and scrolling fixed framing, not the app.
- [M01 trace](evidence/k/m01-trace.jpg): locked wrong prediction, real false/else result, goal facts and source-linked events; presentation cursor is a replay state, not a new attempt.
- [Counterexample](evidence/k/counterexample.jpg): actual12cm world, unchanged condition, true/stop and trace-derived comparison. No generated artwork/UI or student PII.

Playwright MCP independently verified the current M01 run, four tentative possibilities, the40cm probe rationale, and **Why did that happen?** selecting actual row02 compare. Chrome DevTools on an isolated M01 page reported no warn/error messages and no fetch/XHR at inspection. The full isolated rehearsal's all-origin check is broader than that spot check. Initial MCP attempts read the stale prebuild foundation title; the fresh current build title **The Wall Problem** was then verified and the rehearsal assertion corrected. No runtime defect was established.

## Official-source and ownership findings

The [2026 review](CONGRESSIONAL_APP_CHALLENGE_2026.md) documents the actual conflict between the rulebook's noon EDT cutoff and official registration's9pm ET notice. Plan to the earlier **October 26 noon EDT / 11am CDT** until organizer confirmation. The public portal exposes login, not verified private answer limits. Required video content/duration and student-led/AI restrictions are documented from primary sources; compliance is not certified.

The inventory finds extensive logged AI assistance and **no verified independent student-written implementation evidence** in the supplied record. Owner-reported product direction/motivation is separated from technical authorship. Human review, substantive contribution, collaborator eligibility and disclosure approval are unresolved. Test software and blank paperwork do not fulfill those obligations.

## Repeatable document preflight

`node scripts/verify-k-docs.mjs` checks local Markdown link targets, all 16 workbook sections, human-pending STATUS fields and actual synthetic rehearsal facts. It does not certify educational accuracy, human action, external portal limits or eligibility. Review formatted files and images in addition to this mechanical check. Follow TEST_REPORT for its actual result.

## Remaining owner actions / Part L boundary

1. Resolve deadline, district/team eligibility, creation dates and collaborator/AI-development concerns with the actual organizer; use the earlier cutoff for planning.
2. Personally perform the source workbook, make/justify substantive implementation or revision and tests, record actual commits/explanation, and approve the honest disclosure. Do not relabel AI work as independent.
3. Conduct optional properly authorized usability/instructor sessions if feasible; only actual anonymized findings may fill results. No study is fabricated to meet a deadline.
4. Confirm narration/names/claims, record and inspect genuine media, measure exported duration and authorize public upload; verify actual portal prompts/limits and final drafts.
5. Authorize/verify a real hosting project if publication is chosen; localhost is not public deployment. Publication and final submission are not performed by this Part K session.

**Prepared deliverables are ready for human review; the entry is not certified submission-ready. Part L has not begun.**

### Supplementary Chromebook-sized capture

Playwright MCP opened the current M01 Blockly editor at **1366×768**, collapsed redundant pseudocode and scrolled the real page250px. The [actual viewport](evidence/k/chromebook-workbench.jpg) was captured and opened: stage,24cm reading, program workspace and the full prediction action remain accessible; the lower Blockly content continues below the viewport and uses normal scrolling. The action bounding box was x1024.43,y472.59,width290.42,height44px after that deliberate scroll. This is browser-viewport evidence, not a physical Chromebook or proof that every block fits above the fold.
