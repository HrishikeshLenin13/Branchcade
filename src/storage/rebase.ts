import type { AppExport, Attempt, LearnerProfile } from '../domain/types'
import { ExportSchema } from '../domain/schemas'
import { reconcileConceptProgress } from './progress-records'

/** Several tabs of one browser share one stored envelope, but each tab edits its own
 * in-memory copy. A blind write from a stale tab would erase records another tab saved
 * meanwhile (OPUS-001). Instead each write replays this tab's own changes, measured
 * against the envelope it last loaded or saved (`base`), onto what is stored now
 * (`theirs`). Records only another tab touched are kept; this tab's deliberate deletions
 * still apply; concurrent edits of one record keep the append-only superset. */
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Learning annotations only ever grow, so the record with more of them is the newer one. */
const annotations = (a: Attempt) =>
  a.diagnosticResponses.length +
  (a.transferRetries?.length ?? 0) +
  (a.hintIds?.length ?? 0) +
  (a.experimentResponses?.length ?? 0) +
  (a.reassessment ? 1 : 0) +
  (a.experimentUsed ? 1 : 0)
const newerAttempt = (ours: Attempt, theirs: Attempt) =>
  annotations(theirs) > annotations(ours) ? theirs : ours

const unionBy = <T>(a: T[], b: T[], key: (x: T) => string) => [
  ...a,
  ...b.filter((x) => !a.some((y) => key(y) === key(x))),
]
/** Both tabs changed one learner: keep this tab's settings/name and every recorded item. */
function bothProfiles(ours: LearnerProfile, theirs: LearnerProfile): LearnerProfile {
  return {
    ...ours,
    completedMissions: [...new Set([...ours.completedMissions, ...theirs.completedMissions])],
    responses: unionBy(ours.responses, theirs.responses, (r) => r.id),
    evidence: unionBy(ours.evidence, theirs.evidence, (e) => e.id),
    conceptProgress: ours.conceptProgress
      .map((p) => {
        const other = theirs.conceptProgress.find((q) => q.concept === p.concept)
        if (!other) return p
        const hashes = [...new Set([...p.distinctScenarioHashes, ...other.distinctScenarioHashes])]
        return { ...p, distinctScenarioHashes: hashes, independentSuccesses: hashes.length }
      })
      .concat(
        theirs.conceptProgress.filter(
          (q) => !ours.conceptProgress.some((p) => p.concept === q.concept),
        ),
      ),
  }
}

function rebaseList<T extends { id: string }>(
  base: T[],
  ours: T[],
  theirs: T[],
  both: (ours: T, theirs: T) => T = (o) => o,
): T[] {
  const find = (list: T[], id: string) => list.find((x) => x.id === id)
  const out: T[] = []
  for (const t of theirs) {
    const b = find(base, t.id),
      o = find(ours, t.id)
    if (!o) {
      // Absent here: either this tab deleted it (drop) or another tab added it (keep).
      if (!b) out.push(t)
      continue
    }
    if (!b) out.push(same(o, t) ? t : both(o, t))
    else if (same(o, b)) out.push(t)
    else out.push(same(t, b) ? o : both(o, t))
  }
  // Added here and not yet stored. Records this tab still had unchanged but another tab
  // deleted stay deleted.
  for (const o of ours) if (!find(theirs, o.id) && !find(base, o.id)) out.push(o)
  return out
}

export function rebaseEnvelope(
  base: AppExport | null,
  ours: AppExport,
  theirs: AppExport | null,
): AppExport {
  // Nothing else wrote since this tab's last load/save: ours is already authoritative.
  if (!base || (theirs ? theirs.exportedAt === base.exportedAt : false)) return ours
  const stored = theirs ?? {
    ...base,
    profile: null,
    profiles: [],
    attempts: [],
    teams: [],
    savedLabs: [],
    drafts: [],
    assignments: [],
  }
  const people = (d: AppExport) => [...(d.profile ? [d.profile] : []), ...d.profiles]
  const learners = rebaseList(people(base), people(ours), people(stored), bothProfiles)
  const active =
    learners.find((p) => p.id === ours.profile?.id) ??
    learners.find((p) => p.id === stored.profile?.id) ??
    null
  return ExportSchema.parse(
    reconcileConceptProgress({
      ...ours,
      profile: active,
      profiles: learners.filter((p) => p.id !== active?.id),
      attempts: rebaseList(base.attempts, ours.attempts, stored.attempts, newerAttempt),
      teams: rebaseList(base.teams, ours.teams, stored.teams),
      savedLabs: rebaseList(base.savedLabs, ours.savedLabs, stored.savedLabs),
      drafts: rebaseList(base.drafts, ours.drafts, stored.drafts),
      assignments: rebaseList(base.assignments, ours.assignments, stored.assignments),
    }),
  )
}
