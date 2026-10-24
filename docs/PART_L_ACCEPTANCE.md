# Part L acceptance — verified engineering, pending human release

Date: 2026-10-24 (America/Chicago). Authorized scope: L1–L4 on the updated A–K application, main only. Fetched baseline: `3d8b5f5c3fbc4a076c30d1c17bd03181dd306d1e`; baseline [CI 40133267764](https://github.com/HrishikeshLenin13/Branchcade/actions/runs/40133267764) independently confirmed completed/success. Current L checkpoint CI is recorded in TEST_REPORT when observed; the baseline is not a substitute for it.

## Acceptance evidence

| Criterion                | Actual evidence / state                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1 startup/sync          | Printed actual path/status/branch/remotes, fetched all/pruned, compared SHAs, clean ff-only from abd9d0a to 3d8b5f5; preserved collaborator K commits                                                                                        |
| Runtime/current source   | macOS 27.0.1 arm64, Node 24.22.1 via existing runtime, npm 11.6.2; fresh locked install and fresh build. Existing dist was not accepted as current proof                                                                                     |
| Master L1–L4             | Read exact startup, L2 fields and L3 format; updated current invocation and AGENTS to explicit L authorization; preserved original SPEC SHA and frozen mission v1                                                                            |
| Full local checks        | npm ci/check (396 tests/29 files, lint, strict TS, build), 105 Chromium E2E, retries 0; format/secrets/spec/audit/document checks recorded in TEST_REPORT                                                                                    |
| Local Firefox            | Actual launch attempt fails before application code: “Could not find profile folder.” No local Firefox pass claimed; final remote CI must verify all 105 Firefox cases                                                                       |
| Real UI smoke            | Existing rehearsal extended with isolated L output, trace, console/network/response and layout observations; M01 → wrong STOP → actual 24<20 false → probes → generated wall30/12 → new transfer → finish/save/reload/Progress passed        |
| Visual/a11y/privacy      | Four actual desktop/Chromebook-sized JPEGs opened and inspected; no global overflow at captured states; smoke has 0 page/console errors or warnings, 0 failed requests/HTTP errors, local origin only; automated axe/keyboard cases in suite |
| Static deployment        | Fresh preview direct routes/assets return 200 and expected MIME; root base, fonts/Blockly, SPA fallbacks, provider-specific headers and no runtime secrets reviewed. Public hosting unperformed; exact owner checklist in RELEASE_READINESS  |
| Contest source review    | Official PDF and registration rechecked; deadline discrepancy persists; earlier Oct26 11am Central used. Source-ownership/AI issue explicitly unresolved; no form submitted                                                                  |
| Complete L2 handoff      | HANDOFF current block contains every operational field, exact next actions and evidence boundaries. It records a preceding verified SHA; actual containing commit comes from git/CI, avoiding a fabricated self-reference                    |
| Status and evidence      | STATUS separates local, remote, human and proposed work; TEST_REPORT records actual failures and command outcomes; AI_ASSISTANCE_LOG updated                                                                                                 |
| Future independent audit | POST_L_AUDIT_PLAN has independent findings/reconciliation protocol, full feature matrix and severity-driven repair gates; audit not launched                                                                                                 |
| Accounts/sync and logo   | Product, data/consent/security/offline/ops requirements and existing-brand integration checklist prepared; no accounts/backend/provider/logo changes implemented                                                                             |
| Main-only push/final CI  | Must be checked on the actual L commit and recorded in TEST_REPORT/currentCheckpoint; no branch, PR or rewritten history used                                                                                                                |

## Engineering findings

No new release-blocking application defect was established. No runtime source, packages, lockfile, engine/mission versions or frozen snapshots were changed. The documentation guard formerly asserted Part L could never start; it now checks consistency against the separately authorized Part L status while retaining every pending-human-action assertion. The demo runner supports a new output directory so this session's real captures do not overwrite Part K's evidence.

The first focused Firefox command used an anchored grep that matched no full test title; that invocation was corrected and an actual selected test then reproduced the known browser-profile startup failure. It is an environment failure, not a passing/ignored app test. The local Chromium suite passed all 105 cases with retries disabled. No browser assertion was skipped or loosened.

The first L CI on `1b39b33` was green overall but had one retry-recovered Firefox navigation test. Its Save→Home transition asserted an optimistic Resume link before persistence had completed. The test now waits for explicit Save completion and the durable-save indicator before reloading Home, preserving every original link/route/menu assertion. The run, missing-Resume timeout and subsequent verification are recorded in TEST_REPORT. L remains in progress until a clean pushed run verifies this repair; overall green alone is insufficient evidence of zero observed flakes.

## Boundaries and next step

Human student technical review, significant independent implementation/contribution evidence, disclosure/eligibility approval, real participant sessions, video recording/public upload, public hosting and contest submission remain pending. ENGINEERING COMPLETE requires the final successful pushed CI in TEST_REPORT; RELEASE COMPLETE and CONTEST SUBMITTED are not claimed. The proposed independent two-reviewer audit comes next only after separate authorization. There is no new Part M in SPEC.

Reproduction, screenshots and raw observations: [evidence/l](evidence/l); [release decision and owner checklist](RELEASE_READINESS.md); [proposed next-phase requirements](POST_L_AUDIT_PLAN.md). The local synthetic walkthrough trace is `../l-smoke-trace.zip` relative to the checkout, outside Git; its actions are not a recorded submission video.
