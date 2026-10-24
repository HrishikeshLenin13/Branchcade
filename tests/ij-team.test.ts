/** Synthetic team protocol tests for Parts I/J. No fixtures represent real learners. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamSessionSchema } from '../src/domain/schemas'
import type { TeamSession } from '../src/domain/types'
import {
  createTeam,
  submitTurn,
  startHuddle,
  chooseHypothesis,
  pauseTeam,
  resumeTeam,
} from '../src/collaboration/session'
import { editTeamProgram, runTeamRound, advanceTeamRound } from '../src/collaboration/round'
import {
  recordTeamAssistance,
  teamDetailOptions,
  teamDetailTruth,
  validateTeamLearning,
} from '../src/collaboration/learning'
import { rotateRoles } from '../src/collaboration/rotation'
import { ROLES } from '../src/collaboration/roles'
import { recordPrediction } from '../src/learning/predictions'
import { MISSION_CATALOG, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { curriculumFor } from '../src/missions/curriculum'
import { actualAction } from '../src/interpreter/trace'
import { execute, executeRecorded } from '../src/interpreter/interpreter'
import { stableHash } from '../src/domain/invariants'
import { exportJson, scopedData, validateImport } from '../src/storage/import-export'
import { emptyData } from '../src/storage/migrations'
import { teamRoleVariety } from '../src/learning/achievements'
afterEach(() => vi.useRealTimers())
async function collect(team: TeamSession, details = false) {
  const mission = MISSION_CATALOG.find((m) => m.id === team.currentMission)!,
    program = team.program ?? mission.starterProgram
  const action = actualAction(execute(mission.world, program).events),
    detail = curriculumFor(mission.id)?.detail
  for (const member of team.members) {
    const p = await recordPrediction(
      member.learnerId,
      mission.world,
      program,
      action,
      3,
      'Synthetic test observation: check the actual condition and trace.',
    )
    const choice = details ? teamDetailOptions(team).at(-1) : undefined
    team = submitTurn(
      team,
      choice && detail ? { ...p, detail: { question: detail.question, answer: choice.id } } : p,
      'Synthetic test role contribution: inspect one recorded value.',
    )
  }
  return chooseHypothesis(
    startHuddle(team),
    'Synthetic test group hypothesis based on the program and measured reading.',
  )
}
describe('all-size local team acceptance', () => {
  it.each([2, 3, 4, 5, 6])(
    '%s people complete six real rounds and experience every role without losing records',
    async (size) => {
      let team = editTeamProgram(
        createTeam(Array.from({ length: size }, (_, i) => `Test alias ${i + 1}`)),
        REFERENCE_PROGRAMS.m01!,
      )
      for (let round = 0; round < 6; round++) {
        team = await collect(team)
        const outcome = await runTeamRound(team)
        expect(outcome.team.results[round]!.goalPassed).toBe(true)
        expect(outcome.team.results[round]!.hypothesis).toBe(team.teamHypothesis)
        expect(outcome.team.results[round]!.traceHash).toBe(await stableHash(outcome.result.events))
        expect(Object.isFrozen(outcome.team.results[round])).toBe(true)
        team = advanceTeamRound(outcome.team)
      }
      expect(team.results).toHaveLength(6)
      expect(team.predictionHistory).toHaveLength(size * 6)
      expect(team.contributions).toHaveLength(size * 6)
      for (const member of team.members)
        expect(
          new Set(
            team.roleHistory
              .filter((h) => h.learnerId === member.learnerId && h.round < 6)
              .map((h) => h.role),
          ),
        ).toEqual(new Set(ROLES))
      expect(teamRoleVariety(team).every((m) => m.earned)).toBe(true)
      const exported = exportJson(scopedData({ ...emptyData(), teams: [team] }, [], [], [team.id]))
      const restored = await validateImport(exported)
      expect(restored.teams[0]!.results).toEqual(team.results)
      expect(restored.attempts).toEqual([])
      expect(restored.profile).toBeNull()
    },
  )
  it('enforces editing, huddle, run and next-round gates and retains edited result snapshots', async () => {
    let team = createTeam(['Test Amber', 'Test Cedar'])
    await expect(runTeamRound(team)).rejects.toThrow('every contribution')
    expect(() => advanceTeamRound(team)).toThrow('Finish the actual shared run')
    team = editTeamProgram(team, REFERENCE_PROGRAMS.m04!)
    team = await collect(team)
    expect(() => editTeamProgram(team, REFERENCE_PROGRAMS.m01!)).toThrow('locked')
    await expect(runTeamRound({ ...team, program: REFERENCE_PROGRAMS.m01! })).rejects.toThrow(
      'changed after a locked prediction',
    )
    const outcome = await runTeamRound(team),
      historical = outcome.team.results[0]!
    expect(historical.program).toEqual(REFERENCE_PROGRAMS.m04)
    expect(historical.traceHash).toBe(
      await stableHash(
        executeRecorded(historical.world!, historical.program!, historical.engineVersion).events,
      ),
    )
    await expect(runTeamRound(outcome.team)).rejects.toThrow()
    const next = editTeamProgram(advanceTeamRound(outcome.team), REFERENCE_PROGRAMS.m01!)
    expect(next.results[0]).toEqual(historical)
    expect(next.predictionHistory).toHaveLength(2)
    expect(() => advanceTeamRound(next, 'Instructor accommodation')).toThrow('Finish')
  })
  it('keeps private predictions and contributions intact through pause, resume and authorized rotation exception', async () => {
    const collected = await collect(createTeam(['Test One', 'Test Two']))
    const paused = pauseTeam(collected)
    await expect(runTeamRound(paused)).rejects.toThrow()
    expect(resumeTeam(paused).predictions).toEqual(collected.predictions)
    const complete = (await runTeamRound(resumeTeam(paused))).team
    const restored = resumeTeam(pauseTeam(complete))
    expect(restored.status).toBe(complete.status)
    expect(restored.results).toEqual(complete.results)
    expect(() => advanceTeamRound(restored, ' ')).toThrow('reason')
    const kept = advanceTeamRound(restored, 'Teacher is helping read one unfamiliar role.')
    expect(kept.members).toEqual(restored.members)
    expect(kept.rotationSkips[0]!.reason).toContain('helping read')
    expect(kept.predictionHistory).toEqual(restored.predictionHistory)
  })
  it('archives old prediction-only sessions when starting a new protocol round', async () => {
    const base = createTeam(['Test One', 'Test Two']),
      mission = MISSION_CATALOG[0]!
    const p = await recordPrediction(
      base.members[0]!.learnerId,
      mission.world,
      mission.starterProgram,
      'move',
      3,
    )
    const raw = JSON.parse(
      JSON.stringify({ ...base, predictions: [p], predictionHistory: [], phase: undefined }),
    ) as Record<string, unknown>
    delete raw.assistance
    const historical = TeamSessionSchema.parse(raw)
    expect(historical.assistance).toEqual([])
    const next = rotateRoles(historical)
    expect(next.predictions).toEqual([])
    expect(next.predictionHistory[0]!.prediction).toEqual(p)
  })
})
describe('truthful shared curriculum assistance and second answers', () => {
  it('records hints in order once, requires confirmation step for solution, and snapshots only help seen before run', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-24T12:00:00Z'))
    let team = createTeam(['Test One', 'Test Two'])
    expect(() => recordTeamAssistance(team, 'hint-3')).toThrow('in order')
    team = recordTeamAssistance(team, 'hint-1')
    expect(recordTeamAssistance(team, 'hint-1')).toBe(team)
    expect(team.assistance[0]!.afterPredictionIds).toEqual([])
    vi.setSystemTime(new Date('2026-10-24T12:00:01Z'))
    team = await collect(team)
    vi.setSystemTime(new Date('2026-10-24T12:00:02Z'))
    team = recordTeamAssistance(team, 'hint-2')
    team = recordTeamAssistance(team, 'hint-3')
    team = recordTeamAssistance(team, 'show-solution')
    expect(team.assistance.at(-1)!.afterPredictionIds).toHaveLength(2)
    vi.setSystemTime(new Date('2026-10-24T12:00:03Z'))
    const outcome = await runTeamRound(team)
    expect(outcome.team.results[0]!.assistanceIds).toHaveLength(4)
    expect(outcome.team.predictions).toEqual(team.predictions)
    expect(() => validateTeamLearning(outcome.team)).not.toThrow()
    const parsed = await validateImport(exportJson({ ...emptyData(), teams: [outcome.team] }))
    expect(parsed.teams[0]!.assistance).toHaveLength(4)
    const tampered = structuredClone(outcome.team)
    tampered.results[0]!.assistanceIds = []
    await expect(validateImport(exportJson({ ...emptyData(), teams: [tampered] }))).rejects.toThrow(
      'omitted assistance',
    )
  })
  it('does not retroactively classify a completed result when a hint is viewed afterwards', async () => {
    let team = (await runTeamRound(await collect(createTeam(['Test One', 'Test Two'])))).team
    team = recordTeamAssistance(team, 'hint-1')
    expect(team.assistance[0]!.afterRun).toBe(true)
    const forged = structuredClone(team)
    forged.assistance[0]!.afterRun = false
    expect(() => validateTeamLearning(forged)).toThrow(/after its run|omitted assistance/)
    expect(team.results[0]!.assistanceIds).toEqual([])
    expect(() => validateTeamLearning(team)).not.toThrow()
    expect(
      (await validateImport(exportJson({ ...emptyData(), teams: [team] }))).teams[0]!.assistance[0]!
        .afterRun,
    ).toBe(true)
  })
  it('validates optional per-learner questions and compares them with real edited-program execution', async () => {
    let team = editTeamProgram(createTeam(['Test One', 'Test Two'], 'm04'), REFERENCE_PROGRAMS.m04!)
    team = await collect(team, true)
    const locked = structuredClone(team.predictions)
    team = (await runTeamRound(team)).team
    const truth = teamDetailTruth(team)!
    expect(truth.answer).toBe('3')
    expect(truth.label).toContain('3')
    expect(team.predictions).toEqual(locked)
    expect(() => validateTeamLearning(team)).not.toThrow()
    expect(
      (
        await validateImport(exportJson({ ...emptyData(), teams: [team] }))
      ).teams[0]!.predictions.every((p) => p.detail),
    ).toBe(true)
    const tampered = structuredClone(team)
    tampered.predictions[0]!.detail = { question: 'not-a-mission-question', answer: '999' }
    tampered.predictionHistory[0]!.prediction = tampered.predictions[0]!
    await expect(validateImport(exportJson({ ...emptyData(), teams: [tampered] }))).rejects.toThrow(
      'optional team prediction',
    )
  })
  it('rejects fabricated help chronology and future curriculum versions without mutating current records', async () => {
    let team = recordTeamAssistance(createTeam(['Test One', 'Test Two']), 'hint-1')
    team = await collect(team)
    const future = structuredClone(team)
    future.assistance[0]!.missionVersion = 999
    expect(() => validateTeamLearning(future)).toThrow('Unsupported')
    const forged = structuredClone(team)
    forged.assistance[0]!.afterPredictionIds = ['not-a-recorded-answer']
    expect(TeamSessionSchema.safeParse(forged).success).toBe(false)
    expect(team.assistance[0]!.afterPredictionIds).toEqual([])
  })
})
