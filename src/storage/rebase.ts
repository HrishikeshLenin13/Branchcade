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

/** Only annotations may grow. Conflicting answers are not silently chosen or rewritten. */
function mergeAttempt(ours: Attempt, theirs: Attempt): Attempt {
  const facts = (a: Attempt) => {
    const copy = { ...a }
    for (const key of [
      'diagnosticResponses',
      'reassessment',
      'transferRetries',
      'hintIds',
      'experimentUsed',
      'experimentResponses',
    ] as const)
      Reflect.deleteProperty(copy, key)
    return copy
  }
  if (!same(facts(ours), facts(theirs)))
    throw new Error('Immutable attempt evidence conflict; export this session and reload.')
  // Ordered answers must be prefix-compatible. Divergent answers require explicit recovery,
  // rather than manufacturing a learning history that neither tab actually experienced.
  const extend = <T>(a: T[], b: T[]): T[] => {
    if (!a.slice(0, Math.min(a.length, b.length)).every((v, i) => same(v, b[i])))
      throw new Error('Learning answer conflict; export this session and reload.')
    return a.length >= b.length ? a : b
  }
  if (ours.reassessment && theirs.reassessment && !same(ours.reassessment, theirs.reassessment))
    throw new Error('Revealed transfer answer conflict; export this session and reload.')
  return {
    ...theirs,
    diagnosticResponses: extend(ours.diagnosticResponses, theirs.diagnosticResponses),
    reassessment: theirs.reassessment ?? ours.reassessment,
    transferRetries: extend(ours.transferRetries ?? [], theirs.transferRetries ?? []),
    experimentResponses: extend(ours.experimentResponses ?? [], theirs.experimentResponses ?? []),
    hintIds: [...new Set([...(theirs.hintIds ?? []), ...(ours.hintIds ?? [])])],
    experimentUsed: Boolean(ours.experimentUsed || theirs.experimentUsed),
  }
}

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
  // Immutable execution facts must agree with the writer's starting snapshot, even
  // if only that writer changed this record.
  for (const a of ours.attempts) {
    const original = base?.attempts.find((b) => b.id === a.id)
    if (original) {
      mergeAttempt(a, original)
      if (
        a.diagnosticResponses.length < original.diagnosticResponses.length ||
        (a.transferRetries?.length ?? 0) < (original.transferRetries?.length ?? 0) ||
        (a.experimentResponses?.length ?? 0) < (original.experimentResponses?.length ?? 0) ||
        original.hintIds?.some((id) => !a.hintIds?.includes(id)) ||
        (original.reassessment && !a.reassessment) ||
        (original.experimentUsed && !a.experimentUsed)
      )
        throw new Error('Learning annotations are append-only; export this session and reload.')
    }
  }
  if (base && theirs && same(base, theirs)) return ours
  if (!base && !theirs) return ours
  base ??= {
    ...ours,
    profile: null,
    profiles: [],
    attempts: [],
    teams: [],
    savedLabs: [],
    drafts: [],
    assignments: [],
  }
  // A timestamp alone is not evidence that optimistic in-memory snapshots are identical.
  // In particular queued writes may share a stamp but contain different records.
  if (
    !theirs &&
    !base.profile &&
    !base.profiles.length &&
    !base.attempts.length &&
    !base.drafts.length &&
    !base.teams.length &&
    !base.savedLabs.length &&
    !base.assignments.length
  )
    return ours
  if (!theirs)
    return {
      ...base,
      profile: null,
      profiles: [],
      attempts: [],
      teams: [],
      savedLabs: [],
      drafts: [],
      assignments: [],
    }
  const stored = theirs
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
      attempts: rebaseList(base.attempts, ours.attempts, stored.attempts, mergeAttempt),
      teams: rebaseList(base.teams, ours.teams, stored.teams, () => {
        throw new Error(
          'Team edited in another tab. Export this session and reload before continuing.',
        )
      }),
      savedLabs: rebaseList(base.savedLabs, ours.savedLabs, stored.savedLabs),
      drafts: rebaseList(base.drafts, ours.drafts, stored.drafts),
      assignments: rebaseList(base.assignments, ours.assignments, stored.assignments),
    }),
  )
}
