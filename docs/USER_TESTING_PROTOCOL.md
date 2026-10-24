# Optional learner usability and instructor review protocol

**NOT YET CONDUCTED — AWAITING ACTUAL PARTICIPANTS.** This prepared protocol is not a study result. Session length: approximately 8–10 minutes, adjustable or stopped at any time. Aim: find usability and explanation problems, not prove educational effectiveness.

## Permission and setup

A responsible adult/instructor confirms appropriate participation and parent/guardian permission where needed under the setting's rules. Participation is voluntary; skipping a question, taking a break or stopping has no penalty and does not affect instruction. Do not recruit through the app or ask children to send data to the developer.

Read aloud: “We are checking whether this robot activity is clear, not testing you. You can skip anything or stop. Please use a made-up lab name and do not enter personal details. Tell us when a screen or explanation is confusing.” Ask for assent and stop if it is absent or withdrawn.

Use an isolated browser profile and a generated alias. Do not import existing learner data. Record only an unrelated session code such as L01, app commit, browser/viewport, broad role (learner/instructor), permission-confirmed checkbox and observations. No names, birthdays, contact details, school IDs, addresses, diagnoses or identifying classroom anecdotes. Keep permission paperwork outside the repository under the adult's control. No face/voice/screen recording by default; separate appropriate consent would be needed for recording or public footage.

The facilitator chooses a short retention period before the session (default: delete private raw sheets within 30 days after review), storage location and who can access them. Do not commit participant exports or verbatim quotes without separate review/permission. Use the [blank forms](USER_TESTING_FORM.md). The in-app alias is not a guarantee of anonymous research data.

## Learner session

| Time       | Prompt/task                                                                                                                                                                               | Record, without coaching the answer                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00  | Explain voluntary activity and confirm permission/assent                                                                                                                                  | Confirmed / declined; no identity                                                                                                 |
| 1:00–2:00  | Before opening results: “The distance sensor reads 24 cm. The code is `if distance < 20: stop; else: move 10 cm; stop`. What happens first? Why?”                                         | Exact nonidentifying choice, explanation and uncertainty; do not reveal key yet                                                   |
| 2:00–4:00  | Open M01. Ask the learner to find the stage, initial sensor reading and Blockly comparison; predict, then lock/run                                                                        | Independent / assisted / not attempted for each; task wording, hesitations, mistaken affordances, technical errors                |
| 4:00–5:00  | Ask “Which trace row explains what happened? What values does it compare?”                                                                                                                | Whether they find the comparison and distinguish initial 24 from final 14 cm; help supplied                                       |
| 5:00–7:00  | If a probe is offered, inspect its rationale and answer voluntarily. Otherwise choose optional Investigate why. Generate an experiment; change only its offered parameter and predict/run | Actual probe ID/wording, response, one changed parameter, observed outcome; never force a wrong answer to manufacture a diagnosis |
| 7:00–8:00  | Independent transfer: “Now the reading is 32 cm and the condition is `distance < 35`, with the same stop/else-move structure. What happens first? Why?”                                   | Choice/reason before feedback; different numbers, same concept, assistance separately                                             |
| 8:00–10:00 | Ask the open questions below; explain the factual answers afterward                                                                                                                       | Observations, participant suggestions and errors; no efficacy verdict                                                             |

If the generated experiment uses a different concept or parameter, follow the actual UI and record it. A facilitator may demonstrate the controls using an explicitly labeled demo example; do not score that assisted answer as independent. Optional extra transfer: `20 < 20` versus `20 <= 20`; mark it additional, not interchangeable with the planned pre/post pair.

Ask without suggesting praise: What was confusing? Which step helped you figure out the result? What was unexpectedly difficult? What would make it easier to use? Did any feedback seem incorrect? Was there anything you expected to happen that did not?

## Instructor track (about 10 minutes)

Use a separate code T01 and the instructor section of the form. Review M01 and one selected later mission, the mission briefing/teacher note, a real trace, an ambiguous investigation, experiment and transfer. Inspect the local-only report and deletion scope. Rate accuracy, clarity, objectives, appropriateness for the intended learner group, usability, curriculum fit and risk of creating new misconceptions. Ask for the exact screen/text/source of any correction; disagreement is valuable feedback, not an endorsement request.

## Facilitator key — keep separate until answers are committed

- Pre: `24 < 20` is false; else moves 10 cm, then stops. The sensor alone does not stop motion.
- Transfer: `32 < 35` is true; first action is stop, then branch. Equality extension: strict `<` is false at 20, inclusive `<=` is true.
- Separate branch choice, explanation and navigation skill. An answer may be correct by guessing; an accurate explanation is not inferred from a click. Do not diagnose cognition or score personality.

## Analysis, debrief and care of data

1. Preserve original nonidentifying observations; distinguish observed fact, participant words, facilitator inference and actual runtime defect. Record help, skips and incomplete tasks rather than treating them as wrong.
2. Summarize descriptive counts only when real: numerator/denominator, task, independent vs assisted, missing answers and app version. For tiny convenience samples use a task table, not improvement percentages or significance tests. No causal learning claim or generalization to children overall.
3. Group recurring confusion by screen and severity; reproduce technical defects on synthetic data, make a focused fix/test and retest when consent permits. Instructor feedback is expert opinion, not a clinical or curricular certification.
4. Debrief the answers, offer deletion of observations and erase the isolated app dataset/export copies as agreed. Put only reviewed, de-identified summaries in [results](USER_TESTING_RESULTS.md); record actual collection date and limitations. Leave it unfilled until sessions happen.
