import type { TeamSession } from '../domain/types'
import { ROLES } from './roles'
export function rotateRoles(team: TeamSession, skipReason?: string): TeamSession {
  if (skipReason !== undefined && !skipReason.trim())
    throw new Error('An instructor reason is required to skip rotation')
  const index = team.rotationIndex + 1,
    recordedAt = new Date().toISOString()
  const members = team.members.map((m, i) => ({
    ...m,
    role: skipReason === undefined ? ROLES[(i + index) % ROLES.length]! : m.role,
  }))
  return {
    ...team,
    rotationIndex: index,
    members,
    status: 'active',
    phase: 'collecting',
    predictions: [],
    predictionHistory: [
      ...team.predictionHistory,
      ...team.predictions
        .filter((p) => !team.predictionHistory.some((h) => h.prediction.id === p.id))
        .map((prediction) => ({ round: team.rotationIndex, prediction })),
    ],
    teamHypothesis: '',
    roleHistory: [
      ...team.roleHistory,
      ...members.map((m) => ({ learnerId: m.learnerId, role: m.role, round: index })),
    ],
    rotationSkips:
      skipReason === undefined
        ? team.rotationSkips
        : [...team.rotationSkips, { round: index, reason: skipReason.trim(), recordedAt }],
    actions: [
      ...team.actions,
      {
        learnerId: team.members[0]!.learnerId,
        kind: skipReason === undefined ? 'rotate' : 'skip-rotation',
        recordedAt,
      },
    ],
  }
}
