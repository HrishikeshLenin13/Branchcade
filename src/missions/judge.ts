import type { Goal, Mission, Program, World } from '../domain/types'
import { execute, executeRecorded, type RunResult } from '../interpreter/interpreter'
import { describeGoal, judgeGoals } from './goals'
import { legacyV2Rules } from './legacy-v2'
import { legacyMission } from './legacy-v1'

/** Goals that check the concept a mission teaches rather than where the robot ended up. */
const conceptGoal = (g: Goal) =>
  g.kind === 'branch' ||
  (g.kind === 'event' && ['call', 'repeat_iteration', 'branch'].includes(g.eventKind))

/** Part H mission judge. The learner's program must meet the mission goals in the
 * attempted world AND in every authored success scenario. When the robot gets there
 * physically but skips the concept (e.g. hand-copied moves instead of calling the
 * helper), the facts say so plainly instead of silently failing. */
export function judgeMission(mission: Mission, world: World, program: Program, run: RunResult) {
  const main = judgeGoals(world, run, mission.successPredicate)
  const facts = [...main.facts]
  let passed = main.passed
  const outcomes = mission.successPredicate.map((_, i) => main.facts[i]!.endsWith(': met'))
  const physicalOk = mission.successPredicate.every((g, i) => conceptGoal(g) || outcomes[i])
  const missedConcept = mission.successPredicate.find((g, i) => conceptGoal(g) && !outcomes[i])
  if (physicalOk && missedConcept && !run.error && !run.robot.collision)
    facts.push(
      `Concept check: the robot got there, but ${describeGoal(missedConcept).replace(/\.$/, '').toLowerCase()} did not happen. This mission practices that idea, so the program must use it.`,
    )
  for (const scenario of mission.successScenarios ?? []) {
    const result = judgeGoals(scenario.world, execute(scenario.world, program), scenario.goals)
    passed &&= result.passed
    const missed = result.facts.filter((f) => f.endsWith('not met')).length
    facts.push(
      `Scenario “${scenario.label}”: ${result.passed ? 'met' : `not met (${missed} goal${missed === 1 ? '' : 's'} missed)`}`,
    )
  }
  return { passed, facts: facts.slice(0, 20) }
}

/** Judges a saved record with the mission data version it was made with. */
export function judgeRecorded(
  mission: Mission,
  missionVersion: number | undefined,
  world: World,
  program: Program,
  engineVersion: 1 | 2 | undefined,
) {
  const run = executeRecorded(world, program, engineVersion)
  if (!missionVersion || missionVersion === 1) {
    const legacy = legacyMission(mission.id)
    return judgeGoals(world, run, legacy?.successPredicate ?? mission.successPredicate)
  }
  if (missionVersion !== mission.version) {
    const v2 = missionVersion === 2 ? legacyV2Rules(mission.id) : undefined
    if (!v2) throw new Error(`Unsupported mission version ${missionVersion} for ${mission.id}`)
    return judgeMission({ ...mission, ...v2, version: 2 }, world, program, run)
  }
  return judgeMission(mission, world, program, run)
}
