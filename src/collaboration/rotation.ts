import type { TeamSession } from '../domain/types'
import { ROLES } from './roles'
export function rotateRoles(team: TeamSession): TeamSession {
  const index = team.rotationIndex + 1
  return {
    ...team,
    rotationIndex: index,
    members: team.members.map((m, i) => ({ ...m, role: ROLES[(i + index) % ROLES.length]! })),
    predictions: [],
    actions: [
      ...team.actions,
      {
        learnerId: team.members[0]!.learnerId,
        kind: 'rotate',
        recordedAt: new Date().toISOString(),
      },
    ],
  }
}
