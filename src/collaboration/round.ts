import type { Program, TeamSession } from '../domain/types'
import { TeamSessionSchema } from '../domain/schemas'
import { immutable, stableHash } from '../domain/invariants'
import { findMission } from '../missions/catalog'
import { judgeMission } from '../missions/judge'
import { execute } from '../interpreter/interpreter'
import { validateProgram } from '../interpreter/validate'
import { branchFacts } from '../interpreter/trace'
import { contributionsReady } from './session'
import { rotateRoles } from './rotation'
export function editTeamProgram(team: TeamSession, program: Program): TeamSession {
  if (
    team.status !== 'active' ||
    (team.phase && team.phase !== 'collecting') ||
    team.predictions.length
  )
    throw new Error('The shared program is locked until the next round after everyone predicts')
  validateProgram(program)
  return TeamSessionSchema.parse({ ...team, program })
}
export async function runTeamRound(team: TeamSession) {
  if (
    team.status !== 'active' ||
    team.phase !== 'huddle' ||
    !team.teamHypothesis.trim() ||
    !contributionsReady(team)
  )
    throw new Error('Record every contribution and the team hypothesis before running')
  if (team.results.some((r) => r.round === team.rotationIndex))
    throw new Error('This round has already run; rotate roles for a fresh round')
  const mission = findMission(team.currentMission)
  if (!mission)
    throw new Error(
      'This team’s mission is unavailable; export the session and choose a current mission',
    )
  const program = team.program ?? mission.starterProgram
  validateProgram(program)
  const [worldHash, programHash] = await Promise.all([
    stableHash(mission.world),
    stableHash(program),
  ])
  if (team.predictions.some((p) => p.worldHash !== worldHash || p.programHash !== programHash))
    throw new Error('The program or world changed after a locked prediction; start a fresh round')
  const result = execute(mission.world, program),
    goal = judgeMission(mission, mission.world, program, result),
    traceHash = await stableHash(result.events),
    recordedAt = new Date().toISOString()
  const next = immutable(
    TeamSessionSchema.parse({
      ...team,
      status: goal.passed ? 'completed' : 'active',
      phase: 'result',
      evidenceBoard: [
        ...team.evidenceBoard,
        `Round ${team.rotationIndex + 1}: ${branchFacts(result.events)}. Actual goals ${goal.passed ? 'met' : 'not met'}.`,
      ],
      results: [
        ...team.results,
        {
          round: team.rotationIndex,
          engineVersion: 2,
          missionVersion: mission.version,
          traceHash,
          goalPassed: goal.passed,
          recordedAt,
          hypothesis: team.teamHypothesis,
          assistanceIds: team.assistance
            .filter((h) => h.round === team.rotationIndex && !h.afterRun)
            .map((h) => h.id),
          world: mission.world,
          program,
        },
      ],
      actions: [
        ...team.actions,
        { learnerId: team.members[0]!.learnerId, kind: 'run', recordedAt },
      ],
    }),
  )
  return { team: next, result }
}
/** UI round advancement is gated; rotateRoles itself remains the pure schedule helper. */
export function advanceTeamRound(team: TeamSession, skipReason?: string): TeamSession {
  if (
    team.phase !== 'result' ||
    !team.results.some((r) => r.round === team.rotationIndex) ||
    !['active', 'completed'].includes(team.status)
  )
    throw new Error('Finish the actual shared run before advancing the round')
  return TeamSessionSchema.parse(rotateRoles(team, skipReason))
}
