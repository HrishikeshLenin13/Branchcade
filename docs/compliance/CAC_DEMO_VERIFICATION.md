# Demo video verification (CAC 2026 §4)

| Requirement                           | Status                                                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A real, human-recorded video exists   | **NOT VERIFIED.** No video file or URL is in the repository or was provided to this session                                                                                                                         |
| Length 1–3 minutes                    | Script ([DEMO_VIDEO_SCRIPT](../DEMO_VIDEO_SCRIPT.md)) plans about 2:48. The real length must be checked on the recording                                                                                            |
| Names every entrant                   | Owner must say the real names on camera                                                                                                                                                                             |
| States app name, purpose, audience    | In the script                                                                                                                                                                                                       |
| Describes tools and coding languages  | In the script. Should also state the AI agents used, consistent with the disclosure                                                                                                                                 |
| Shows real functionality              | Every scripted step (M01 prediction → 24 < 20 false → investigation → experiment → transfer → Progress) was exercised in the production build during final acceptance. See docs/production/REAL_BROWSER_JOURNEYS.md |
| Uploaded publicly to YouTube or Vimeo | **NOT DONE / not verified.** No URL exists. Do not invent one                                                                                                                                                       |

Recording tips that keep claims true: record the local production build (`npm run build && npm run preview`), use a fresh synthetic profile, and don't claim classroom results or a hosted URL that doesn't exist.
