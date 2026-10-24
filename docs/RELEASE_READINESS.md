# Branchcade release and submission readiness

Part L, 2026-10-24. Read with [Part L acceptance](PART_L_ACCEPTANCE.md), [current handoff](HANDOFF.md) and [test report](TEST_REPORT.md). Engineering verification, public release and contest submission have separate evidence requirements.

## Current decision

- **Engineering:** existing A–J implementation and K materials are being re-verified for the L checkpoint; final command/CI evidence is recorded in TEST_REPORT and STATUS.
- **Release:** static deployment configuration exists; no owner-authorized hosting project or verified public URL was supplied. Public release is not complete.
- **Contest:** materials are prepared; eligibility/source ownership, student work, disclosure, recording/upload, form approval and submission are pending. No entry was submitted by this session.

No runtime, dependency, persistence-schema, historical mission or branding change is required for the Part L documentation scope. Do not interpret green CI as an authorship, educational-effectiveness, privacy-compliance or contest-eligibility certification.

## Static build and deployment review

`vite.config.ts` uses Vite's default root base and produces static `dist/`. `index.html` references `/favicon.svg`; hashed JS/CSS/fonts are emitted under `/assets/`. The lazy Blockly editor uses `import.meta.env.BASE_URL` plus `assets/blockly/`, which is committed locally with upstream notices; sounds are disabled. No frontend API keys, backend endpoint or required runtime environment variables are configured. A subdirectory host would require a deliberate base/router change; deploy the current build at an origin root.

`vercel.json` preserves `/assets/` and `/favicon.svg` while rewriting app routes to `index.html`. It supplies no-sniff, no-referrer and camera/microphone/geolocation-denial headers. `public/_redirects` supplies the Netlify SPA fallback; it does not apply Vercel security headers to another provider. Configure equivalent headers at the selected host. The local Vite preview does not prove production headers. No CSP or service worker/PWA/offline installation is claimed. Already loaded code can work without requests, but unloaded chunks require network/cache.

The release walkthrough must load fresh built source, open actual Blockly, execute M01, inspect requests and reload nested routes. Local measurements and screenshots are evidence only for the tested browser/viewports. Existing 105-case browser projects cover all eight missions, deterministic execution/debugger, misconception/experiment/transfer, teams, instructor, settings, import/export, reset/delete, recovery, accessibility and layout. See TEST_REPORT for this session's actual results.

Known maintenance limits: the lazy Blockly chunk is about 799 kB minified; build warns above 500 kB. ESLint 9 is deprecated; the existing accessibility-plugin peer constraint is documented in ADR. Neither warning was hidden or “fixed” with a forced package upgrade. Audit results concern reported dependency vulnerabilities, not all security risks. No physical Chromebook, WebKit or formal assistive-technology certification was performed.

## Owner deployment checklist

1. Choose and authorize the intended Vercel, Netlify or equivalent static project. No provider credentials or project link were found in this checkout during Part L; a CLI's presence alone is not authorization. Never place tokens in Git or evidence logs.
2. Import the GitHub repository/main into the authorized project. Select Node 24, build `npm ci && npm run build` (or host install `npm ci` followed by `npm run build`), output `dist`, root base and the appropriate SPA fallback. Apply the security headers above; review host access logs and retention.
3. Publish, record the actual URL/deployed commit, then verify Home and direct `/missions/m01`, `/lab`, `/settings` loads and browser refresh. Confirm JS/CSS/fonts, favicon and Blockly media have correct MIME/status, not rewritten HTML.
4. Execute prediction → real trace → investigation → experiment → transfer → save → reload → Progress. Test alias scope, export/import and erase. Review console, failed requests, all request origins and delivered security headers.
5. Record results and only then change hosting status to verified. Judge/source access must use the actual URL or reproducible repository instructions; localhost is not a public URL.

No hosting account was created, no login was initiated, no public URL was invented and no deployment occurred in Part L.

## Official contest sources rechecked 2026-10-24

The [official 2026 rulebook](https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf) gives October 26, 2026 at noon EDT; [official registration](https://www.congressionalappchallenge.us/students/student-registration/) gives 9 p.m. ET that day. Until organizer clarification, use **11 a.m. Central on Monday October 26** as the internal cutoff.

The rulebook requires student technical effort/understanding, full AI disclosure, a team of at most four, eligible school/district participation and one entry per person. Prior-project/new-code rules must be checked against the actual history. Its demo is 1–3 minutes, publicly uploaded to YouTube or Vimeo, and identifies entrants, purpose, audience, tools and functionality. Judges may request app/source access. The existing [Part K guide](CONGRESSIONAL_APP_CHALLENGE_2026.md) maps prepared drafts to these requirements; actual private portal field limits were not inspected or assumed.

**Material unresolved issue:** [SOURCE_OWNERSHIP_REVIEW](SOURCE_OWNERSHIP_REVIEW.md) documents extensive AI-assisted implementation without verified significant independent student-written technical contributions. Honest disclosure alone does not resolve eligibility. Owner/student review and any organizer clarification must occur before attestation. Do not manufacture contribution percentages, student commits or personal reflections.

## Prepared versus owner-required

Prepared and technically inspectable: README/app description; architecture/algorithm explanation; source access/startup instructions; fresh test evidence; [narration](DEMO_VIDEO_SCRIPT.md), [storyboard](DEMO_STORYBOARD.md) and recording checklist; [AI inventory](SOURCE_OWNERSHIP_REVIEW.md), disclosure draft, [student workbook](STUDENT_TECHNICAL_REVIEW.md) and submission-answer drafts. These are materials, not completed human actions.

- [ ] Privately confirm entrants, district, school/age eligibility, contribution roles, one-entry/new-code rules and parent/guardian information required by the official process.
- [ ] Personally explain and meaningfully implement or revise/test source where justified; preserve real dated files/commits/test outcomes in the ownership ledger. Small cosmetic edits or memorized explanations must not be presented as proof of significant technical development.
- [ ] Review every collaborator and AI-assisted subsystem, approve accurate disclosure, and resolve organizer questions about the actual development history. Do not assume later revisions automatically cure it.
- [ ] Rehearse the student's own accurate narration; record real app footage, inspect audio/content/duration, upload a public video, and verify the real URL. No video file/upload is provided by screenshots or a script.
- [ ] Conduct voluntary usability sessions only if appropriate and permitted; preserve blank results until real observations exist. No fabricated learning claims.
- [ ] Inspect current portal fields/limits privately, adapt answers, resolve the deadline discrepancy and confirm judge access/district instructions.
- [ ] Owner reviews final answers/video/disclosure, authorizes submission and submits through the official portal. Retain the actual submission confirmation privately; redact identifying details from any repository evidence.

These boxes remain unchecked. No registration, final form attestation, email to organizers or contest submission was performed. The next audit/account-sync/logo proposals in [POST_L_AUDIT_PLAN](POST_L_AUDIT_PLAN.md) require separate authorization and do not resolve these human obligations.
