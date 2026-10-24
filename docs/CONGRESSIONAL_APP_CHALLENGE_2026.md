# 2026 Congressional App Challenge — verified sources and owner draft

Checked **2026-10-24** for Part K. Materials are prepared, not submitted. **Eligibility, student contribution evidence, final video and owner approval remain unresolved.**

Part L rechecked the official PDF (including the AI/originality and video/deadline pages) and registration page on the same date. The discrepancy persists; retain the earlier 11am Central planning cutoff. No organizer clarification, private portal login, eligibility attestation or submission was performed. The [release checklist](RELEASE_READINESS.md) separates prepared materials from owner actions.

## Official-source findings

The [2026 rulebook](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) is linked by the [official rules page](https://www.congressionalappchallenge.us/students/rules/). Its §3 permits disclosed AI support but requires significant student technical contribution/understanding; AI must not supply the entire technical development. Extensive AI-authored Branchcade source makes that an actual unresolved issue, not something a disclosure checkbox settles. §1 also limits creation date to after October 30, 2025 and one entry per student; a revised project must identify its new coding. These are owner verification tasks, not certifications from this audit.

**Deadline conflict:** rulebook §5 says **October 26, 2026, 12:00 p.m. EDT** (**11:00 a.m. CDT**); the [official registration page](https://www.congressionalappchallenge.us/students/student-registration/) currently says **9:00 p.m. ET** that day (**8:00 p.m. CDT**). Both were checked. The earlier cutoff is our planning deadline, not a claim that the discrepancy has been resolved. Ask the organizer/district office for authoritative clarification; do not rely on the later time without confirmation. The older general Students landing page still describes 2025 and is not a 2026 deadline source.

The [official eligibility page](https://www.congressionalappchallenge.us/students/rules/) describes middle/high-school entrants, U.S. residency, one participating residence/school district and teams of **at most four**, with at least half eligible in that district. The app's 2–6 local learning roster is unrelated to contest team size. Each actual collaborator's eligibility and role need confirmation; operating an AI agent on another computer is not independent coding evidence.

For video, rulebook §4 specifies **1–3 minutes**, names of all entrants, app name, clear purpose, audience, tools/languages and real function; upload publicly to YouTube or Vimeo. The [official House video guidance](https://khanna.house.gov/services/congressional-app-challenge) independently lists the same content and duration. The [national FAQ](https://www.congressionalappchallenge.us/congress/frequently-asked-questions/) outlines eligibility → app → demo → checklist → online submission → exit questionnaire. Check any district-specific instructions through the owner's actual participating office.

## Requirement-to-material map

| Review item                                   | Prepared evidence                                                                                                            | Still requires human action                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose, audience, tools and genuine function | README; [script](DEMO_VIDEO_SCRIPT.md); [storyboard](DEMO_STORYBOARD.md); actual production rehearsal                        | All entrant names and spoken claims confirmed; record and inspect actual media                                                                            |
| AI and source ownership                       | [inventory](SOURCE_OWNERSHIP_REVIEW.md); [workbook](STUDENT_TECHNICAL_REVIEW.md); [draft disclosure](AI_DISCLOSURE_DRAFT.md) | Personally revise/test/explain substantive implementation; confirm collaborators; seek organizer clarification if development history does not meet rules |
| Human feedback                                | [voluntary protocol](USER_TESTING_PROTOCOL.md), [forms](USER_TESTING_FORM.md), [empty results](USER_TESTING_RESULTS.md)      | Appropriate permission, actual sessions if feasible; no invented results or implied mandatory study rule                                                  |
| Access and source                             | Public Git repository; local reproducible build; DEPLOYMENT instructions                                                     | Real public app URL if chosen/requested; judges' actual access requirements; no localhost-as-hosted claim                                                 |
| Portal and deadline                           | Official rulebook/registration sources above; blank approval log below                                                       | Account/eligibility process, actual fields/limits, district and cutoff confirmation; final owner review/submission not performed                          |

## Portal inspection boundary

The public [2026 portal entry](https://webportalapp.com/sp/login/congressional_app_challenge_2026) was reached from official registration and presents sign-in/sign-up and eligibility instructions. No login, registration, private form, upload or submission was performed. Actual answer character limits are **UNVERIFIED**: the public rulebook supplies example questions, not limits. The drafts below are working copy, not guaranteed field-fit or exact current portal wording. Owner copies actual prompts/limits without private registration information; trim only after they are known. Keep contest-required personal registration details out of app data and this repository.

## Source-grounded answer drafts — owner must adapt

These are editorial drafts, not claims that the owner already wrote code, debugged an issue, learned a concept, tested with children or met eligibility requirements.

### Title / what is it?

**Branchcade — Make the logic click.** A browser-based robotics lab where learners predict a program's behavior, inspect its actual execution and test their ideas through controlled experiments.

### Purpose / problem / intended users

Beginning roboticists can reproduce working blocks without understanding sensors, comparisons or branch decisions. Branchcade makes those decisions visible through a deterministic robot stage and source-linked trace, then offers discriminating questions and a different transfer scenario. It is intended for beginning robotics learners, approximately ages 9–13, instructors and local small teams. No educational effectiveness has yet been measured in a human study.

### Inspiration — OWNER CONFIRMATION REQUIRED

The owner reports experience helping younger FLL learners with LEGO SPIKE Prime. If accurate in the owner's words: “Helping younger robotics learners made me want a place to explore why a program behaves as it does, not only whether it reaches a goal.” Confirm that wording and any first-person detail; do not reuse unverified counts or imagined classroom quotes from planning documents.

### Tools and technology

TypeScript, React, Vite, Blockly, React Router, Zod, Zustand and IndexedDB via idb; Vitest/Testing Library, Playwright/axe, ESLint/Prettier and GitHub Actions for verification. Fonts are bundled locally. Codex and Claude Code substantially assisted implementation, tests, UI/content and documentation. The deployed runtime has no LLM dependency or learner-content inference service. Exact packages/notices are in the lockfile and LICENSE_NOTICES.

### Technical difficulty and solution — PROJECT FACT, NOT YET A PERSONAL STORY

A documented issue was retained mental-model trace memory: the earlier cache could hold thousands of complete runs. Commit `1475fc1` introduced deterministic LRU eviction with entry and accounted-byte caps while preserving recomputed results. The robustness test forces eviction and compares the full rerun; PERFORMANCE_REPORT distinguishes trace accounting from actual V8 heap. This repair is recorded as AI-assisted. The student may discuss it as an investigated project challenge only after personally reviewing/testing it; they must not claim to have independently discovered or implemented it without evidence. A personal alternative is `[actual student difficulty, exact revision/test commit, observed outcome]`.

### What was learned / biggest takeaway — AWAITING STUDENT REFLECTION

`[After actually completing the workbook, explain one changed belief about sensor geometry, bounded interpretation or uncertain evidence. Cite the source and a test you personally ran/revised, and what its failure taught you.]` No AI-written autobiography is offered as a completed answer.

### Version 2.0

Potential next work: genuine instructor/learner usability review, stronger accessible alternatives for spatial block authoring, physical Chromebook/WebKit checks, and measured off-main-thread search if needed. Prioritize observed problems rather than adding cloud identities or unvalidated learning claims. These are proposals, not implemented features or measured outcomes.

### AI assistance

Use the [full draft](AI_DISCLOSURE_DRAFT.md), tailored to the actual portal field. State extensive agent involvement across simulation, interpretation, diagnosis, curriculum, UI, tests and docs; distinguish runtime algorithms from development tools. Add only verified personal revisions/reviews. Disclosure is transparency, not proof of originality/eligibility.

### Student contribution — UNVERIFIED, DO NOT SUBMIT AS COMPLETE

Known from the user's account: product direction, reported robotics-teaching motivation and coordinating code across computers. Independent technical implementation/revision attribution is not established by current records. Fill `[student; substantive design/implementation/revision; exact commit/files/test; personal explanation; supporting dated evidence]` only after actual work and confirmation. Ask the organizer about unresolved outside development/AI concerns rather than asserting compliance.

## Owner approval record — blank until performed

Actual entrants and district/eligibility checked privately: ______
Creation/new-code date and one-entry confirmation: ______
Collaborators/AI history reviewed; organizer response if needed: ______
Actual student contribution commits and oral explanation evidence: ______
Confirmed current portal questions/character limits: ______
Deadline clarification source/date; internal submission target: ______
Actual recorded video path/duration/public URL: ______
Owner-reviewed answers/disclosure: ______

Part K prepares these materials. It does not perform registration, final submission, public deployment, rule attestation or Part L work.
