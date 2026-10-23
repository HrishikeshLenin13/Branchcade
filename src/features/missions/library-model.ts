import type { AppExport, Mission } from '../../domain/types'
import { MISSION_CATALOG } from '../../missions/catalog'

export const CONCEPT_FILTERS = [
  'Sensors',
  'Comparisons',
  'Conditionals',
  'Loops',
  'Functions',
  'Debugging',
] as const
export type ConceptFilter = (typeof CONCEPT_FILTERS)[number]
export const conceptLabel = (concept: string) => {
  if (/sensor|color|distance/.test(concept)) return 'Sensors'
  if (/compar|threshold/.test(concept)) return 'Comparisons'
  if (/condition|branch|boolean/.test(concept)) return 'Conditionals'
  if (/loop|repeat|while/.test(concept)) return 'Loops'
  if (/function|procedure/.test(concept)) return 'Functions'
  return 'Debugging'
}
export function missionActivity(data: AppExport, mission: Mission) {
  const attempts = data.attempts
    .filter((a) => a.missionId === mission.id && a.learnerId === data.profile?.id)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id))
  const draft = data.drafts
    .filter((d) => d.missionId === mission.id && d.learnerId === data.profile?.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const completed = data.profile?.completedMissions.includes(mission.id) ?? false
  const missingPrerequisites = mission.prerequisiteIds.filter(
    (id) => !data.profile?.completedMissions.includes(id),
  )
  return {
    attempts,
    draft,
    completed,
    missingPrerequisites,
    status: completed ? 'Completed' : draft || attempts.length ? 'In progress' : 'Not started',
    latestAt: draft?.updatedAt ?? attempts.at(-1)?.completedAt ?? '',
    verifiedOutcome: attempts.some((a) => a.goalOutcome.passed)
      ? 'Mission goal verified'
      : attempts.length
        ? 'Still investigating'
        : 'No run yet',
  }
}
export function resumableDraft(data: AppExport) {
  return data.drafts
    .filter(
      (draft) =>
        draft.learnerId === data.profile?.id &&
        draft.stage !== 'complete' &&
        (draft.missionId === 'lab' ||
          MISSION_CATALOG.some((mission) => mission.id === draft.missionId)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}
export const draftRoute = (missionId: string) =>
  missionId === 'lab' ? '/lab' : `/missions/${missionId}`
