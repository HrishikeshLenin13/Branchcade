# Privacy and legal review (engineering facts, not legal advice)

Prepared 2026-10-25 by an AI engineering agent. **I am not a lawyer; nothing here certifies COPPA, FERPA or other legal compliance.** Statuses: VERIFIED TECHNICAL FACT · DOCUMENTED REQUIREMENT · NEEDS OWNER CONFIRMATION · NEEDS LEGAL/PRIVACY REVIEW · NOT APPLICABLE WITH REASONS · BLOCKED.

## What the app collects and where it goes

| Item                                | Finding                                                                                                                                                   | Status                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Accounts, logins, email, real names | None. Learners get a generated alias such as "Robot 1BDE"; the optional nickname is limited to 32 characters with markup stripped (`session.ts`)          | VERIFIED TECHNICAL FACT                                       |
| Where data is stored                | IndexedDB database `branchcade-local` in the learner's browser only. No `localStorage`, `sessionStorage` or cookies are used by app code (source grep)    | VERIFIED TECHNICAL FACT                                       |
| Network requests at runtime         | Every page load in the final sweep requested only the app's own origin. The app source has no `fetch`, `XMLHttpRequest`, beacons, WebSockets or analytics | VERIFIED TECHNICAL FACT                                       |
| Third-party scripts, fonts, CDNs    | None at runtime. Fonts (Geist, IBM Plex Mono, OFL) and Blockly media are bundled                                                                          | VERIFIED TECHNICAL FACT                                       |
| Free text a child may type          | Optional prediction reasoning, team role contributions and hypothesis, instructor notes. These stay local but appear in exports                           | VERIFIED TECHNICAL FACT. Advise "don't type personal details" |
| Exports                             | JSON/CSV files the user downloads. Anyone holding the file can read them. CSV cells are formula-escaped                                                   | VERIFIED TECHNICAL FACT                                       |
| Deletion                            | Settings and Progress offer scoped clearing and full erase. Clearing browser data also erases everything; there is no server copy                         | VERIFIED TECHNICAL FACT                                       |
| Shared devices                      | Anyone using the same browser profile can see that profile's local records. This is not access control                                                    | VERIFIED TECHNICAL FACT. Documented in Settings privacy       |
| Hosting logs                        | If deployed, the static host will see IP addresses and request paths. Not deployed yet                                                                    | NEEDS OWNER CONFIRMATION when hosting                         |

## COPPA (FTC: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

The intended audience includes children under 13. As built, the app does not collect personal information _to an operator_: nothing leaves the browser, and there is no account, persistent server identifier or analytics. This reduces COPPA exposure but **does not certify compliance**. Several things could change that:

- adding hosting with logs;
- adding error telemetry;
- adding accounts or cloud sync;
- any feature that sends learner text off the device.

Each would need a fresh privacy review and possibly parental or school notice and consent. **Status: NEEDS LEGAL/PRIVACY REVIEW before any of those changes. Do not claim "COPPA compliant".**

## FERPA (https://studentprivacy.ed.gov/)

FERPA concerns schools' education records. Anonymous practice on a personal device is generally outside that relationship. If a school adopts Branchcade, the school's own policies and agreements decide how exported files are treated. **Status: NOT APPLICABLE to anonymous personal use; NEEDS SCHOOL REVIEW if a school adopts it.** Don't claim school approval.

## Intellectual property and licenses

| Item                           | Finding                                                                                                                                                                | Status                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Runtime npm dependencies       | 81 packages. Licenses: MIT 64, Apache-2.0 3 (incl. Blockly 13.4), ISC 3, BSD-2/3 4, MIT-0 2, OFL-1.1 2, BlueOak 1, CC0 1, 0BSD 1. All permissive; none copyleft        | VERIFIED TECHNICAL FACT           |
| Notices retained               | [LICENSE_NOTICES](../LICENSE_NOTICES.md); OFL texts in `public/assets/licenses/`; Blockly media notice                                                                 | VERIFIED TECHNICAL FACT           |
| Images, robot art, icons       | Robot/stage art is drawn in code (SVG). Icons are lucide-react (ISC). No LEGO/FIRST assets; the footer says "Not affiliated with LEGO or FIRST"                        | VERIFIED TECHNICAL FACT           |
| Audio                          | None                                                                                                                                                                   | NOT APPLICABLE                    |
| Logo                           | The project lead supplied it on 2026-10-25; integrated from that image (docs/production/LOGO_INTEGRATION.md). Ownership/rights of the design are the team's to confirm | NEEDS OWNER CONFIRMATION (rights) |
| Repository license             | No top-level LICENSE file for Branchcade's own code, so default copyright applies. The owner should choose whether to add one                                          | NEEDS OWNER CONFIRMATION          |
| Ownership of AI-generated code | Covered under contest originality in [CAC_SOURCE_OWNERSHIP_GAPS](CAC_SOURCE_OWNERSHIP_GAPS.md)                                                                         | NEEDS OWNER/ORGANIZER REVIEW      |

## Claims in the app and docs

The in-app and README text says data stays in the browser, that there are no accounts or ads, and that this isn't a classroom monitor. Those statements match the code. The README and How It Works explicitly avoid claiming learning effectiveness; no human study has been run. Keep it that way in the submission.
