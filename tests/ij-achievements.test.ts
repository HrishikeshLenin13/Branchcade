/** Synthetic local records: stamps must follow saved evidence and disappear with it. */
import { describe, expect, it } from 'vitest'
import type { Attempt, Mission, TeamSession, World } from '../src/domain/types'
import { MISSION_CATALOG, findMission } from '../src/missions/catalog'
import { recordPrediction } from '../src/learning/predictions'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { stableHash } from '../src/domain/invariants'
import { judgeMission } from '../src/missions/judge'
import { soloAchievements, teamRoleVariety } from '../src/learning/achievements'
import { ALL_PROBE_IDS, buildProbe } from '../src/learning/probe-templates'
import { transferPool } from '../src/learning/transfer'
import { createTeam, submitTurn, startHuddle, chooseHypothesis } from '../src/collaboration/session'
import { runTeamRound, advanceTeamRound } from '../src/collaboration/round'
import { rotateRoles } from '../src/collaboration/rotation'

let time = Date.parse('2026-10-24T12:00:00Z')
const tick = () => new Date((time += 1000)).toISOString()
async function attempt(m: Mission, world: World = m.world): Promise<Attempt> {
  const startedAt = tick(),
    run = execute(world, m.starterProgram)
  const prediction = await recordPrediction(
    'qa-local',
    world,
    m.starterProgram,
    actualAction(run.events) as 'move',
    3,
    'I compared the sensor reading with the threshold.',
  )
  return {
    schemaVersion: 1,
    id: `qa-${time}`,
    learnerId: 'qa-local',
    missionId: m.id,
    missionVersion: m.version,
    engineVersion: 2,
    attemptIndex: 1,
    startedAt,
    prediction: { ...prediction, recordedAt: tick() },
    completedAt: tick(),
    world,
    program: m.starterProgram,
    traceHash: await stableHash(run.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeMission(m, world, m.starterProgram, run),
  }
}
async function transfer(a: Attempt, mission: Mission): Promise<Attempt> {
  const scenario = transferPool(mission).find(
    (s) => JSON.stringify(s.world) !== JSON.stringify(a.world),
  )!
  const action = actualAction(execute(scenario.world, scenario.program).events)
  return {
    ...a,
    reassessment: {
      schemaVersion: 1,
      worldHash: await stableHash(scenario.world),
      programHash: await stableHash(scenario.program),
      scenarioId: scenario.id,
      predictedAction: action,
      actualAction: action,
      correct: true,
      recordedAt: tick(),
    },
  }
}
describe('I/J evidence stamps', () => {
  it('never awards for an empty notebook, a program run alone, or a fabricated probe id', async () => {
    const empty = { firstTrace: null, sensorDetective: null, completed: [] }
    expect(soloAchievements([], MISSION_CATALOG)).toEqual(empty)
    const a = await attempt(findMission('m01')!)
    expect(soloAchievements([a], MISSION_CATALOG)).toEqual(empty)
    expect(
      soloAchievements(
        [
          {
            ...a,
            diagnosticResponses: [{ probeId: 'g.invalid', choiceId: 'move', recordedAt: tick() }],
          },
        ],
        MISSION_CATALOG,
      ),
    ).toEqual(empty)
  })
  it('links First Trace to an actual saved investigation, even when the answer is wrong', async () => {
    const a = await attempt(findMission('m01')!),
      p = buildProbe(ALL_PROBE_IDS[0]!)!
    const investigated = {
      ...a,
      diagnosticResponses: [{ probeId: p.id, choiceId: p.choices[0]!.id, recordedAt: tick() }],
    }
    expect(soloAchievements([investigated], MISSION_CATALOG).firstTrace).toEqual({
      attemptId: a.id,
    })
    expect(soloAchievements([], MISSION_CATALOG).firstTrace).toBeNull()
  })
  it('completion requires the shared versioned goal/transfer predicate, including capstone checks', async () => {
    const m = findMission('m01')!,
      a = await transfer(await attempt(m), m)
    expect(soloAchievements([a], MISSION_CATALOG).completed.map((s) => s.missionId)).toEqual([
      'm01',
    ])
    expect(
      soloAchievements([{ ...a, goalOutcome: { passed: false, facts: [] } }], MISSION_CATALOG)
        .completed,
    ).toEqual([])
    expect(
      soloAchievements(
        [{ ...a, prediction: { ...a.prediction, uncertain: true } }],
        MISSION_CATALOG,
      ).completed,
    ).toEqual([])
    expect(
      soloAchievements(
        [{ ...a, missionId: 'm08', prediction: { ...a.prediction, reasoning: '' } }],
        MISSION_CATALOG,
      ).completed,
    ).toEqual([])
    // Historical v1 completion keeps its original goal + transfer rule.
    expect(
      soloAchievements(
        [{ ...a, missionVersion: undefined, prediction: { ...a.prediction, uncertain: true } }],
        MISSION_CATALOG,
      ).completed,
    ).toHaveLength(1)
  })
  it('Sensor Detective needs independent sensor evidence and demotes on a later wrong transfer', async () => {
    const m = findMission('m01')!,
      one = await attempt(m)
    const changed = structuredClone(m.world)
    changed.obstacles[0]!.position.xCm += 10
    const two = await transfer(await attempt(m, changed), m)
    expect(soloAchievements([one, two], MISSION_CATALOG).sensorDetective).toBeTruthy()
    expect(soloAchievements([one, one, one], MISSION_CATALOG).sensorDetective).toBeNull()
    expect(
      soloAchievements([{ ...one, hintIds: ['hint-1'] }, two], MISSION_CATALOG).sensorDetective,
    ).toBeNull()
    const failed: Attempt = {
      ...two,
      transferRetries: [
        {
          ...two.reassessment!,
          correct: false,
          predictedAction: two.reassessment!.actualAction === 'move' ? 'stop' : 'move',
          recordedAt: tick(),
        },
      ],
    }
    expect(soloAchievements([one, failed], MISSION_CATALOG).sensorDetective).toBeNull()
  })
})
async function round(team: TeamSession) {
  const m = findMission(team.currentMission)!
  for (const member of team.members)
    team = submitTurn(
      team,
      await recordPrediction(
        member.learnerId,
        m.world,
        team.program ?? m.starterProgram,
        'move',
        3,
      ),
      `My ${member.role} contribution uses the real sensor and program.`,
    )
  return (
    await runTeamRound(chooseHypothesis(startHuddle(team), '24 is not less than20, so move.'))
  ).team
}
describe('I/J team role variety', () => {
  it('requires two different roles backed by completed rounds, predictions and contributions', async () => {
    let team = createTeam(['QA Birch', 'QA Elm'])
    expect(teamRoleVariety(team).every((m) => !m.earned)).toBe(true)
    team = await round(team)
    expect(teamRoleVariety(team).every((m) => m.roles.length === 1 && !m.earned)).toBe(true)
    team = await round(advanceTeamRound(team))
    expect(teamRoleVariety(team).every((m) => m.roles.length === 2 && m.earned)).toBe(true)
    expect(teamRoleVariety({ ...team, contributions: [] }).every((m) => !m.earned)).toBe(true)
    expect(teamRoleVariety({ ...team, predictionHistory: [] }).every((m) => !m.earned)).toBe(true)
  })
  it('does not award mere rotation, repeated roles, or instructor rotation skips', async () => {
    const team = await round(createTeam(['QA Birch', 'QA Elm']))
    expect(teamRoleVariety(rotateRoles(team)).every((m) => !m.earned)).toBe(true)
    const same = await round(advanceTeamRound(team, 'Instructor kept this role for access.'))
    expect(teamRoleVariety(same).every((m) => m.roles.length === 1 && !m.earned)).toBe(true)
  })
})
