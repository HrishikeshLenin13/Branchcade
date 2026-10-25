# Production readiness — bounded engineering conclusion

This audit hardens the existing static, local-first application. It does not establish a public launch or competition acceptance.

## Release gates

- Engineering verification: final exact-SHA CI and local gates must be read in FINAL_VERIFICATION. Nine reproduced issue groups receive targeted repairs; immutable historical engine/mission data are unchanged.
- Browser tested: Chromium/Firefox maintained suites; supplementary WebKit production smoke and actual browser-process restart. Six responsive viewport sizes, axe and keyboard checks. These are synthetic QA sessions, not physical Chromebook/Safari device certification.
- Deployment prepared: fresh dist, bundled fonts/Blockly media, SPA deep-link fallback in Vercel/Netlify config. Production preview direct paths and refresh are exercised by browser tests.
- Public deployment: NOT PERFORMED. No hosting account/project/public origin was created. Vite preview does not prove deployed TLS, CDN cache policy, fallback or headers.
- Operational ownership: pending. Browser/device clearing, private mode or school policy can erase local data; exports are the user's responsibility. There is no remote recovery service.

## Storage conflict policy

Ordinary mutations rebase against the per-request starting snapshot inside one transaction. Immutable attempt facts cannot change. Compatible ordered evidence extends; incompatible concurrent answers/teams show a conflict and preserve committed state. Mutable draft/lab/assignment edits use last-writer wins. Profile settings/name use the writer's values while recorded evidence unions.

Import, scoped clear and full erase are destructive boundaries. A replacement requires the reviewed dataset still match storage, commits atomically and advances a non-identifying reset stamp. Stale tabs stop saving and prompt export/reload; Retry never restores the deleted dataset. A newly opened/reloaded tab can save again. This is conservative: even clearing another scope asks other live tabs to reload, rather than trying to prove their stale closures harmless. No old learner payload is kept in the reset key.

One envelope holds at most200-attempts. Imports still cap500KB/20,000-nodes; local envelopes use a separate1,000,000-node bound applied before commit and load. A large full export may exceed import limits: use learner-scoped exports or smaller datasets. This is a documented backup limitation, not unlimited restoration. Same-browser user access is not cryptographic isolation. Older already-open builds should be closed/reloaded when deploying the new storage writer; an old application version cannot enforce a new reset barrier.

## Deployment checklist for the owner

1. Select/authorize a static provider and project. Build on pinned Node24.22.1 with locked npm ci. Keep local learner data out of deployment files.
2. Publish dist only; verify `/`, `/missions/m01`, `/lab`, `/progress`, unknown routes and refresh on the actual public origin.
3. Verify every asset/font/Blockly media resolves locally without redirects to a login or HTML fallback. Check console/network on the public site.
4. Verify HTTPS, nosniff, no-referrer, camera/microphone/geolocation denial and desired frame/CSP policy in actual response headers. Vercel config supplies three headers; Netlify redirect alone does not supply headers. A strict CSP needs a separate tested configuration because Blockly uses inline presentation.
5. Re-test persistence/reload/reset/import/export on the deployed origin. Data from localhost does not silently transfer to a new origin. Test real target devices and assistive technology.
6. Designate an owner for release rollback, incident reporting, dependency maintenance and browser compatibility. No error telemetry or analytics has been introduced.
7. Complete actual student contribution review, eligibility/disclosure approval, human research (before efficacy claims), recording/upload and private submission separately. Prepared documentation does not certify those actions.

Approved logo: BLOCKED; no explicitly approved owner asset was found. Existing favicon/navigation mark retained.
