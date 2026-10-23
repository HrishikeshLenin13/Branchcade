import { TeamSessionSchema } from '../domain/schemas'
import type { TeamSession, Prediction } from '../domain/types'
import { opaqueId } from '../domain/invariants'
import { ROLES } from './roles'
export function createTeam(aliases: string[]): TeamSession {
  return TeamSessionSchema.parse({
    schemaVersion: 1,
    id: opaqueId(),
    members: aliases.map((alias, i) => ({ learnerId: opaqueId(), alias, role: ROLES[i % 6] })),
    rotationIndex: 0,
    currentMission: 'm01',
    evidenceBoard: [],
    predictions: [],
    actions: [],
    status: 'active',
  })
}
export function addTeamPrediction(team: TeamSession, prediction: Prediction): TeamSession {
  if (team.predictions.some((p) => p.learnerId === prediction.learnerId))
    throw new Error('This member already predicted this round')
  return TeamSessionSchema.parse({
    ...team,
    predictions: [...team.predictions, prediction],
    actions: [
      ...team.actions,
      { learnerId: prediction.learnerId, kind: 'predict', recordedAt: prediction.recordedAt },
    ],
  })
}
