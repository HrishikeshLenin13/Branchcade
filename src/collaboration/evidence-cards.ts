import type { TeamSession } from '../domain/types'
export function roundReady(team: TeamSession) {
  return team.members.every((m) => team.predictions.some((p) => p.learnerId === m.learnerId))
}
