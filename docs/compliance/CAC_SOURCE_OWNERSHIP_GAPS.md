# Source ownership gaps (CAC 2026 §3)

Facts are taken from `git log` on 2026-10-25 at `ae22d2e`. This document records what the history shows. It does not judge anyone's character or decide eligibility.

## What the history shows

| Fact                                                            | Value                                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First commit                                                    | `0d003fb`, 2026-10-22, Hrishikesh Lenin                                                                                                                                        |
| Commits by identity                                             | Akshaj Devara 82 · Mukesh Bokam 28 · Hrishikesh Lenin 13 (total 123 at `ae22d2e`)                                                                                              |
| Akshaj Devara commits                                           | Made by Claude Code sessions (Claude Opus 5.5), with `Co-Authored-By: Claude` and `Claude-Session` trailers. Parts F, G and H, the Opus audit and its repairs. **AI-authored** |
| Mukesh Bokam commits                                            | Parts I/J and L engineering and records. HANDOFF/AI_ASSISTANCE_LOG describe Codex agent sessions run on that computer. **AI-authored per project records**                     |
| Hrishikesh Lenin commits                                        | Scaffolding, Part K materials, the Astra audit and its fixes. AI_ASSISTANCE_LOG and the audit docs describe these as agent-produced (Codex / GPT Astra)                        |
| Commits with an AI co-author/session trailer                    | 164 trailer lines across the history                                                                                                                                           |
| Student-written code, tests or revisions identified in the repo | **None identified.** [SOURCE_OWNERSHIP_REVIEW](../SOURCE_OWNERSHIP_REVIEW.md) and [STUDENT_TECHNICAL_REVIEW](../STUDENT_TECHNICAL_REVIEW.md) are prepared but not filled in    |

## Why it matters

As recorded from the official rulebook, §3 allows AI to support _specific aspects_. It must not constitute the entirety of the technical development, and every use of AI must be disclosed. Being able to explain AI-written code is not the same as having written it. Git identities also do not prove who typed the code: an agent committing under a student's name is still AI authorship.

## Gaps and what would close them (owner actions, not engineering)

1. **Identify the actual registered entrants** (at most 4) and record, privately, which of the three Git identities are entrants. A collaborator who is not an entrant cannot contribute code that is credited to an entrant.
2. **Substantial student technical work, done by the student and dated.** For example, design and implement a new feature or a real fix and its tests by hand, then commit it under the student's own account with no AI co-author trailer. Record it in SOURCE_OWNERSHIP_REVIEW with commit SHAs. A one-line cosmetic edit does not meet the bar.
3. **Full AI disclosure.** State plainly in the submission that AI coding agents (OpenAI Codex, Anthropic Claude Code, GPT Astra) wrote most of the code, tests and documents, and list exactly what the student did.
4. **Organizer clarification.** If item 2 is not substantial, ask the participating district office or the organizers in writing, before the deadline, whether the project is eligible. Keep the reply.
5. **Do not** rewrite Git history, change author names, remove AI trailers or produce invented contribution statistics.

**Status: BLOCKED pending owner action.** Engineering cannot resolve this.
