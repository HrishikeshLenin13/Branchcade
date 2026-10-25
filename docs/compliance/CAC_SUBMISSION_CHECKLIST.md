# CAC 2026 submission checklist (owner)

Nothing on this list has been done _for_ the owner. Tick items only when you have done them yourself.

## Before 11:00 AM Central, Oct 26 (earliest published cutoff)

- [ ] Re-read the official rulebook PDF and registration page; note the deadline discrepancy and ask your district office if unsure.
- [ ] Confirm every entrant's eligibility privately: school level, district, at most 4 people, at least half in the district, one entry each.
- [ ] Resolve the authorship question in [CAC_SOURCE_OWNERSHIP_GAPS](CAC_SOURCE_OWNERSHIP_GAPS.md). Do real, dated student work and/or get written organizer clarification.
- [ ] Finalize the AI disclosure from [AI_DISCLOSURE_DRAFT](../AI_DISCLOSURE_DRAFT.md) in your own words. It must be complete and honest.
- [ ] Record the 1–3 minute video (names, app name, purpose, audience, tools/languages, real demo). Upload publicly to YouTube or Vimeo and check the link works logged out.
- [ ] Write the portal answers yourself (title, purpose, inspiration, technical challenge, lessons, v2). Drafts are in [CONGRESSIONAL_APP_CHALLENGE_2026](../CONGRESSIONAL_APP_CHALLENGE_2026.md); first-person sections must be your real experience.
- [ ] Enter parent/guardian details only in the official portal, never in this repo.
- [ ] Submit in the official portal and save the confirmation.

## Judge access guide

1. Source: https://github.com/HrishikeshLenin13/Branchcade (branch `main`).
2. Run locally with Node 24 (see `.nvmrc`): `npm ci`, then `npm run build`, then `npm run preview`, and open the printed URL. No account, key or internet service is needed after install.
3. Suggested 3-minute path: Missions → M01 "The Wall Problem" → predict → **Lock prediction & run** → read "24 < 20 is false" → open the investigation → try the experiment → transfer challenge → Progress.
4. No public hosted URL exists unless the owner deploys one. Don't list localhost as a hosted app.

## How the app maps to the published judging dimensions (evidence, not a prediction of results)

| Dimension                                | Evidence                                                                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality, creativity, originality of idea | Prediction-first robotics debugging with evidence-based misconception probes and single-change experiments, rather than a block-coding clone. See README "Why it exists"            |
| Implementation, UX and design            | 8 missions, Free Lab, team pass-and-play, instructor tools. Responsive at 6 viewports, axe-clean core routes. [FINAL_RELEASE_ACCEPTANCE](../production/FINAL_RELEASE_ACCEPTANCE.md) |
| Coding excellence                        | Deterministic engine with independent physics oracles, bounded interpreter, versioned data, 478+ unit tests and cross-browser E2E in CI. **Note: largely AI-authored; disclose**    |
