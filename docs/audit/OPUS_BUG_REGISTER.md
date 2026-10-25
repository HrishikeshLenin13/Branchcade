# Opus independent audit — bug register

Baseline (read-only round): `617b83daf96c136bd4105df7b0c015dc043f737a` on `main`, 2026-10-25.
Browser: Chromium 153.0.8010.12 (Playwright library, headless, Linux container). Firefox was not available locally.
All data is synthetic (generated `Robot XXXX` aliases on clean browser profiles).

This register was written before any production source was changed. The **Repair** columns are filled later by [OPUS_REPAIR_REPORT](OPUS_REPAIR_REPORT.md). The original findings text is not edited.

| ID       | Sev | Status at baseline | Area                    | Title                                                                                           |
| -------- | --- | ------------------ | ----------------------- | ----------------------------------------------------------------------------------------------- |
| OPUS-001 | P0  | CONFIRMED          | Storage / multiple tabs | A second open tab silently deletes attempts recorded in another tab                             |
| OPUS-002 | P1  | CONFIRMED          | Missions (M03)          | M03 can be completed by a program that never drives forward                                     |
| OPUS-003 | P2  | CONFIRMED          | Accessibility (phone)   | Learning-cycle strip scrolls horizontally but can't be reached by keyboard (axe serious)        |
| OPUS-004 | P3  | CONFIRMED          | Accessibility           | Stage zoom/pan buttons are 20–22 px wide, below the 24 px target minimum                        |
| OPUS-005 | P3  | CONFIRMED          | Visual                  | Workstation toolbar wraps at 1366/1440 px and leaves "Keyboard shortcuts" alone on a second row |
| OPUS-006 | P3  | CONFIRMED          | Copy / affordance       | Unknown mission page says "Investigation not found"; its recovery link has no link styling      |
| OPUS-007 | P3  | UNCERTAIN          | Learning engine         | Model-run cache trusts caller keys; a key collision silently returns another scenario's result  |
| OPUS-008 | P3  | CONFIRMED          | Missions (M05)          | M05 accepts the fragile `while distance != 12`, which passes only because both starts align     |
| OPUS-009 | P3  | UNCERTAIN          | Navigation              | A "leave page?" guard can fire when leaving a just-opened, unedited mission within ~0.5 s       |

## OPUS-001 — P0 — a second tab silently deletes recorded attempts

- **Requirement:** C4 invariants (immutable attempt evidence), E14 storage, POST_L_AUDIT_PLAN "Persistence", audit area 11 "Multiple tabs", "No silent history replacement".
- **Route:** any; reproduced with `/missions/m01` and `/missions/m03`.
- **Expected:** an attempt recorded in tab A stays saved when tab B (same browser) later saves anything.
- **Actual:** tab B holds the whole envelope it loaded earlier, and its next ordinary save overwrites the stored envelope, so tab A's attempt disappears. A fresh tab then shows 0 attempts.
- **Reproduction (script `scripts/opus-audit-multitab.mjs`, log `evidence/baseline-617b83d/multitab.log`):**
  1. Tab A: open `/missions/m01?new=1` and choose "Move forward".
  2. Tab B: open `/missions/m03?new=1` (it loads the envelope).
  3. Tab A: "Lock prediction & run". IndexedDB now has `attempts: 1`.
  4. Tab B: press "Save". IndexedDB now has `attempts: 0`.
  5. New tab on `/progress`: `attempts: 0` (screenshot `multitab-progress-after.png`).
- **Console/network:** no errors and no warnings. The loss is silent.
- **Suspected source:** `src/app/session.ts` `replace()` → `src/storage/repositories.ts` `saveData()` performs a blind `put` of the in-memory envelope. There is no cross-tab coordination anywhere in `src/`; grep for `BroadcastChannel`, `storage` events and `navigator.locks` finds nothing.
- **Recommended minimal fix:** make the save read-modify-write inside one IndexedDB transaction, rebasing this tab's changes (relative to the envelope it last loaded or saved) onto whatever is stored now. Append-only records from other tabs are kept, and explicit deletions still win. Broadcast commits so other tabs refresh. No schema change.
- **Regression test:** unit test of the three-way rebase (concurrent appends, annotations and deletions), plus a two-tab browser E2E.

## OPUS-002 — P1 — M03 completes with a program that never drives

- **Requirement:** H "flawed program cannot incorrectly receive mission completion"; `PART_H_ACCEPTANCE.md` says M03 "drives on with the wall exactly 20 cm and 30 cm away".
- **Expected:** a program whose else branch only stops (the robot never moves forward in any world) fails M03.
- **Actual:** `if distance < 20 { stop } else { stop }` passes every M03 goal and both scenarios. The scenarios check only `branch=false` and `programmed-stop`. They don't check that the robot moves.
- **Evidence:** mutation probe `tests/opus-audit-mutation.test.ts` and `evidence/baseline-617b83d/mutation-survivors.txt` (152 single-point mutants across M01–M08). Judge facts for the mutant are recorded in the audit report.
- **Other survivors reviewed:** M01 `<=`, 19 or 21 and M07 thresholds are legitimate solutions. M04 without the final stop is a legitimate solution. The M08 else-move deletion is legitimate, because M08 only requires "no escape". M05 `!=` is OPUS-008.
- **Recommended fix:** follow the established versioning. Bump M03 to mission data version 3, adding a "drove at least 9.9 cm" goal to both scenarios. Keep the exact v2 scenario goals frozen, so saved v2 attempts are judged as before. Don't touch `v1.json`.
- **Regression test:** the mutant fails v3; the reference passes; a recorded v2 attempt still re-judges with the v2 rules; import accepts v2 and v3 M03 records.

## OPUS-003 — P2 — phone learning-cycle strip unreachable by keyboard

- **Route:** `/missions/:id`, `/lab` at 390×844. axe `scrollable-region-focusable` (serious) on `ol.cycle[aria-label="Learning cycle"]`.
- **Actual:** at phone width the seven-step strip overflows horizontally (steps 5–7 are cut off in `390x844_missions_m01.png`), and the list has no focusable content, so keyboard-only users can't scroll it.
- **Fix:** make the scroll container focusable (`tabIndex=0`) with its existing accessible name. **Test:** axe on the phone viewport has no violations.

## OPUS-004 — P3 — small stage buttons

Measured at 1366×768: Zoom out/in are 20×32 px; Pan up/down are 22×32 px (`scripts/opus-audit-probe.mjs`). WCAG 2.5.8 has a spacing exception, so this isn't certain to be a failure, but the targets are small for touch Chromebooks. Recommend a 24 px minimum width.

## OPUS-005 — P3 — toolbar wrap

`1366x768_missions_m01.png`: the 15 toolbar controls wrap, leaving "Keyboard shortcuts" alone on a second row. The header shows both "Saved locally." and "Saved on this device". This is cosmetic; no action is lost.

## OPUS-006 — P3 — unknown mission copy

`/missions/zz-nope` shows the heading "Investigation not found" and a "Back to missions" link that looks like plain text (`journey-unknown-mission.png`). Recovery works. Recommend "Mission not found" with a visible link style.

## OPUS-007 — P3 (uncertain) — model cache key trust

`src/learning/mental-models.ts` `runModel(key, …)` memoizes by caller key only. The audit's own first recheck reused a key across missions and got M01's result for M03, which shows the failure mode. The application's keys (`attempt:<uuid>`, probe ids, `<base>|cx|<edit>`) appear unique, so no app path was found that collides. Recommend including a content hash in the key if this code is touched again.

## OPUS-008 — P3 — fragile M05 solution accepted

`while distance != 12 { move 2 }` passes, because 44 and 60 both reach exactly 12 in 2 cm steps. With a 3 cm step it would never end. This is a curriculum-coverage observation only. Fixing it needs a mission version bump, so it is deferred and not repaired in this audit.

## OPUS-009 — P3 (uncertain) — early beforeunload guard

Going back from `/missions/m02` right after a reload logged Chromium's "Blocked attempt to show a 'beforeunload' confirmation panel". The guard is conditional on a dirty draft or pending writes (`LabLesson.tsx`, `App.tsx`), so it likely reflects the 450 ms initial draft autosave. Not repaired; recorded for the next reviewer.
