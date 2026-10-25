# Opus audit — repair report (Stage B)

Baseline findings stay unedited in [OPUS_INDEPENDENT_AUDIT](OPUS_INDEPENDENT_AUDIT.md) and [OPUS_BUG_REGISTER](OPUS_BUG_REGISTER.md) (commit `c2ba103`). This report records what changed after them. Every "fixed" row was reproduced before the fix and re-checked against the repaired build, not closed from code inspection.

| ID       | Sev | Outcome     | Commit    | Regression coverage                                                                                                                                                                                             |
| -------- | --- | ----------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OPUS-001 | P0  | FIXED       | `3638fb9` | `tests/opus-multitab.test.ts` (6: pure rebase + real IndexedDB sequence); `e2e/opus-regressions.spec.ts` two-tab test: **fails on unrepaired source** (expected 1, received 0), passes 5/5 repaired             |
| OPUS-002 | P1  | FIXED       | `5766b83` | `tests/opus-m03-v3.test.ts` (4); mutation probe re-run (`evidence/after-repairs/mutation-survivors.txt`)                                                                                                        |
| OPUS-003 | P2  | FIXED       | `e5ca1d5` | `e2e/opus-regressions.spec.ts`: axe at 390 px on mission and lab = 0 violations; region focusable; keyboard `End` scrolls it                                                                                    |
| OPUS-004 | P3  | FIXED       | `e5ca1d5` | E2E: all six zoom/pan buttons ≥ 24×24 px                                                                                                                                                                        |
| OPUS-006 | P3  | FIXED       | `e5ca1d5` | E2E: heading "Mission not found", styled link returns to `/missions`. The same unstyled `button-link` class also affected **Next mission** in the result panel; both now use the app's `Button asChild` pattern |
| OPUS-005 | P3  | NOT CHANGED | —         | Cosmetic toolbar wrap. Changing the 15-control toolbar right before the contest deadline was judged riskier than the benefit                                                                                    |
| OPUS-007 | P3  | NOT CHANGED | —         | No colliding application key was found; recorded as technical debt                                                                                                                                              |
| OPUS-008 | P3  | NOT CHANGED | —         | Needs another mission version bump; deferred to an owner decision                                                                                                                                               |
| OPUS-009 | P3  | NOT CHANGED | —         | Guard is conditional and protective; behaviour left as is                                                                                                                                                       |

## OPUS-001 — what changed and why

- **Root cause:** `session.replace()` → `saveData()` wrote this tab's whole in-memory envelope with a blind `put`. Nothing coordinated tabs.
- **Fix (`src/storage/rebase.ts`, `repositories.saveRebased`, `session.ts`):**
  - Each save runs read → rebase → write inside **one IndexedDB readwrite transaction**, so writes from different tabs serialize.
  - The rebase is a three-way merge per record id (attempts, teams, drafts, saved labs, assignments, learners). `base` is the envelope this tab last loaded or wrote; `ours` is this tab's new envelope; `theirs` is what is stored now.
  - Records only another tab touched are kept, and this tab's deliberate deletions (clear learner, clear labs, import-replace) still apply.
  - When both tabs annotated the same attempt, the append-only superset wins. When both changed the same learner, the record lists are unioned and concept progress is re-trimmed against real attempts.
  - An erase in another tab is not resurrected.
  - Write stamps are strictly increasing. When no other tab wrote (`exportedAt` matches), the fast path keeps the old behaviour exactly.
  - Committed writes are announced on a `BroadcastChannel`, so idle tabs reload the stored envelope. A tab with writes in flight skips the reload because its next save rebases anyway.
- **No schema change.** No new dependency, no network use.
- **Browser evidence:** `evidence/after-repairs/multitab.log`. Same script as the baseline: attempts stay 1 after tab B's save, a fresh tab sees 1, and over 4 s with three idle tabs the stored stamp did not change, so there is no cross-tab write loop.
- **Existing test touched:** `tests/local-records.test.ts` mocked `saveData` to simulate a quota failure during import. Import now writes through `saveRebased`, so the mock moved to that function. The assertions are unchanged.
- **Residual risk:** a tab whose JavaScript is suspended for a long time still holds an old `base`, but its next save rebases correctly. Two learners editing _the same draft_ in two tabs keep the later tab's draft (drafts are not append-only). Same-browser tabs are still not a privacy boundary.

## OPUS-002 — what changed and why

- **Root cause:** M03's far-wall scenarios required `branch=false` and `programmed-stop` only.
- **Fix:** M03 is now **mission data version 3**. Both scenarios add `{ kind: 'distance', minCm: 9.9 }`, the rule M01 already uses for its 10 cm move.
- **Versioning:** the exact v2 goals and scenarios are frozen in `src/missions/mission-data/v2-revised.json`, generated from the v2 catalog before the change and validated by `legacy-v2.ts`.
  - `judgeRecorded` judges records saved under v2 with those frozen rules.
  - Team-assistance validation accepts v2 for M03 through `supportedMissionVersion`.
  - Unknown versions are still rejected. `mission-data/v1.json` is untouched. The other seven missions stay at v2.
- **Existing test touched:** `tests/h-curriculum.test.ts` asserted every mission is version 2. It now asserts M03 = 3 and the rest = 2.
- **After the fix**, the mutation probe leaves 2 M03 survivors, both legitimate solutions: threshold 19, and a move of 11 cm.
- **Behaviour note for reviewers:** a learner program whose else branch moves less than 9.9 cm now fails the far-wall scenarios, matching M01's rule.

## OPUS-003 / 004 / 006 — UI changes

- **OPUS-003:** the learning-cycle `<ol>` is wrapped in `div.cycle-scroll[role=region][aria-label="Learning cycle"][tabindex=0]`, which now holds the horizontal scroll. This is the WAI pattern for a keyboard-scrollable region. The lint rule against `tabIndex` on non-interactive elements is disabled for that single line, with a comment explaining why.
- **OPUS-004:** stage toolbar buttons get `min-width: 32px`, matching their existing 32 px height (both duplicated stylesheet blocks).
- **OPUS-006:** "Investigation not found" became "Mission not found", and the two `Link className="button-link"` uses (a class with no CSS) became `Button asChild` links.

## Verification of the repaired tree

Commands, counts and CI links are in [OPUS_FINAL_VERIFICATION](OPUS_FINAL_VERIFICATION.md).
