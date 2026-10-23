import type { AppExport, Attempt, LearnerProfile } from '../domain/types'
import { MISSION_CATALOG } from '../missions/catalog'
import { execute } from '../interpreter/interpreter'
import { actualAction } from '../interpreter/trace'
/** Necessary recorded evidence for independent credit; hashes are never accepted merely from a label. */
export function supportedConceptHashes(
  attempts: Attempt[],
  learnerId: string,
  concept: string,
): Set<string> {
  return new Set(
    attempts.flatMap((a) => {
      const mission = MISSION_CATALOG.find((m) => m.id === a.missionId)
      if (
        a.learnerId !== learnerId ||
        !mission?.conceptGoals.includes(concept) ||
        a.prediction.uncertain ||
        a.hintIds?.length ||
        a.experimentUsed ||
        a.prediction.action !== actualAction(execute(a.world, a.program).events)
      )
        return []
      return [...(a.reassessment ? [a.reassessment] : []), ...(a.transferRetries ?? [])]
        .filter((r) => r.correct)
        .map((r) => r.worldHash)
    }),
  )
}
export function trimConceptProgress(
  profile: LearnerProfile,
  attempts: Attempt[],
): LearnerProfile['conceptProgress'] {
  return profile.conceptProgress.flatMap((p) => {
    const related = attempts.some(
      (a) =>
        a.learnerId === profile.id &&
        MISSION_CATALOG.find((m) => m.id === a.missionId)?.conceptGoals.includes(p.concept),
    )
    if (!related) return []
    const allowed = supportedConceptHashes(attempts, profile.id, p.concept),
      hashes = [...new Set(p.distinctScenarioHashes)].filter((hash) => allowed.has(hash))
    return [
      {
        ...p,
        distinctScenarioHashes: hashes,
        independentSuccesses: hashes.length,
        status: hashes.length >= 2 ? ('developing' as const) : ('practicing' as const),
      },
    ]
  })
}
export function reconcileConceptProgress(data: AppExport): AppExport {
  const trim = (p: LearnerProfile) => ({
    ...p,
    conceptProgress: trimConceptProgress(p, data.attempts),
  })
  return {
    ...data,
    profile: data.profile ? trim(data.profile) : null,
    profiles: data.profiles.map(trim),
  }
}
