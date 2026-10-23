import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createTeam,
  addTeamPrediction,
  submitTurn,
  contributionsReady,
  startHuddle,
  chooseHypothesis,
  pauseTeam,
  resumeTeam,
} from '../src/collaboration/session'
import { rotateRoles } from '../src/collaboration/rotation'
import { recordPrediction } from '../src/learning/predictions'
import { MISSION_CATALOG, FIRST_MISSION, thresholdProgram } from '../src/missions/catalog'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { judgeGoals } from '../src/missions/goals'
import { opaqueId, stableHash } from '../src/domain/invariants'
import { ExportSchema } from '../src/domain/schemas'
import type { Attempt, Mission } from '../src/domain/types'
import { fixtureProfile } from '../src/test/fixtures'
import { emptyData } from '../src/storage/migrations'
import {
  csvCell,
  exportJson,
  mergeData,
  parseImport,
  scopedData,
  validateImport,
} from '../src/storage/import-export'
import { annotateAttempt } from '../src/storage/repositories'
import * as repositories from '../src/storage/repositories'
import { database } from '../src/storage/db'
import { localProfiles, useSession } from '../src/app/session'
afterEach(() => vi.restoreAllMocks())
async function attempt(
  learnerId = fixtureProfile.id,
  mission: Mission = FIRST_MISSION,
): Promise<Attempt> {
  const startedAt = new Date().toISOString(),
    run = execute(mission.world, mission.starterProgram)
  const prediction = await recordPrediction(
    learnerId,
    mission.world,
    mission.starterProgram,
    actualAction(run.events),
    3,
  )
  return {
    schemaVersion: 1,
    id: opaqueId(),
    learnerId,
    missionId: mission.id,
    attemptIndex: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    prediction,
    world: mission.world,
    program: mission.starterProgram,
    engineVersion: 2,
    traceHash: await stableHash(run.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeGoals(mission.world, run, mission.successPredicate),
  }
}
describe('team contribution protocol', () => {
  it('requires a distinct role contribution from every learner before revealing the huddle', async () => {
    let team = createTeam(['Amber', 'Cedar'])
    const p = await recordPrediction(
      team.members[0]!.learnerId,
      FIRST_MISSION.world,
      FIRST_MISSION.starterProgram,
      'move',
      3,
    )
    expect(() => submitTurn(team, p, ' ')).toThrow('contribution')
    team = submitTurn(team, p, 'The sensor measures 24 cm from the front of the robot.')
    expect(contributionsReady(team)).toBe(false)
    expect(() => startHuddle(team)).toThrow('Every teammate')
    expect(() => submitTurn(team, p, 'Replace my handed-off observation')).toThrow(
      'cannot be edited',
    )
    const second = await recordPrediction(
      team.members[1]!.learnerId,
      FIRST_MISSION.world,
      FIRST_MISSION.starterProgram,
      'stop',
      3,
    )
    team = submitTurn(team, second, 'I will check the false branch in the actual trace.')
    expect(contributionsReady(team)).toBe(true)
    team = startHuddle(team)
    expect(() => chooseHypothesis(team, '')).toThrow('hypothesis')
    team = chooseHypothesis(team, '24 is not below 20, so we expect the else branch.')
    expect(team.teamHypothesis).toContain('else branch')
    expect(() => addTeamPrediction(team, p)).toThrow('not collecting')
  })
  it('preserves locked work across pause/resume and rotation and logs instructor exceptions', async () => {
    let team = createTeam(['Amber', 'Cedar'])
    const p = await recordPrediction(
      team.members[0]!.learnerId,
      FIRST_MISSION.world,
      FIRST_MISSION.starterProgram,
      'move',
      3,
    )
    team = submitTurn(team, p, 'The program contains a distance comparison.')
    const paused = pauseTeam(team)
    expect(() => addTeamPrediction(paused, p)).toThrow('not collecting')
    expect(resumeTeam(paused).predictions).toEqual(team.predictions)
    const rotated = rotateRoles(team)
    expect(rotated.contributions).toEqual(team.contributions)
    expect(rotated.predictions).toHaveLength(0)
    expect(rotated.roleHistory).toHaveLength(4)
    expect(() => rotateRoles(rotated, '  ')).toThrow('reason')
    const kept = rotateRoles(rotated, 'Continue the accessibility accommodation for this round')
    expect(kept.members.map((m) => m.role)).toEqual(rotated.members.map((m) => m.role))
    expect(kept.rotationSkips[0]!.reason).toContain('accommodation')
  })
})
describe('safe local records and scoped exports', () => {
  it('opens existing version-one envelopes with defaults for every newly added collection', () => {
    const data = emptyData(),
      old = {
        schemaVersion: 1,
        exportedAt: data.exportedAt,
        profile: fixtureProfile,
        attempts: [],
        teams: [],
      }
    const restored = parseImport(JSON.stringify(old))
    expect(restored.profile?.id).toBe(fixtureProfile.id)
    expect(restored.profiles).toEqual([])
    expect(restored.savedLabs).toEqual([])
    expect(restored.drafts).toEqual([])
    expect(restored.assignments).toEqual([])
  })
  it('keeps current immutable IDs and adds new records when merging', async () => {
    const a = await attempt(),
      b = await attempt(),
      current = { ...emptyData(), profile: fixtureProfile, attempts: [a] }
    const incoming = {
      ...emptyData(),
      profile: { ...fixtureProfile, nickname: 'Imported alias' },
      attempts: [a, b],
    }
    const merged = mergeData(current, incoming)
    expect(merged.attempts).toEqual([a, b])
    expect(merged.profile?.nickname).toBe(fixtureProfile.nickname)
    expect(localProfiles(merged)).toHaveLength(1)
    expect((await validateImport(exportJson(merged))).attempts).toHaveLength(2)
  })
  it('exports one selected learner without other solo, team or saved-lab records and roundtrips', async () => {
    const other = { ...fixtureProfile, id: 'another-learner', nickname: 'Other robot' },
      mine = await attempt(),
      theirs = await attempt(other.id)
    const data = {
      ...emptyData(),
      profile: fixtureProfile,
      profiles: [other],
      attempts: [mine, theirs],
      teams: [createTeam(['One', 'Two'])],
    }
    const scoped = scopedData(data, [mine], [fixtureProfile.id])
    expect(scoped.profile?.id).toBe(fixtureProfile.id)
    expect(scoped.profiles).toEqual([])
    expect(scoped.teams).toEqual([])
    const parsed = await validateImport(exportJson(scoped))
    expect(parsed.attempts.map((a) => a.learnerId)).toEqual([fixtureProfile.id])
  })
  it('replays transfer checks for turning missions instead of assuming move/stop', async () => {
    const mission = MISSION_CATALOG.find((m) => m.id === 'm08')!,
      a = await attempt(fixtureProfile.id, mission),
      variant = mission.variants[0]!
    const action = actualAction(execute(variant.world, variant.program).events)
    expect(action).toBe('turn')
    a.reassessment = {
      schemaVersion: 1,
      worldHash: await stableHash(variant.world),
      programHash: await stableHash(variant.program),
      predictedAction: action,
      actualAction: action,
      correct: true,
      recordedAt: new Date().toISOString(),
    }
    expect(
      (await validateImport(exportJson({ ...emptyData(), profile: fixtureProfile, attempts: [a] })))
        .attempts[0]!.reassessment?.actualAction,
    ).toBe('turn')
  })
  it('never edits revealed transfer answers, while append-only retries remain importable', async () => {
    const a = await attempt(),
      variant = FIRST_MISSION.variants[0]!,
      action = actualAction(execute(variant.world, variant.program).events)
    a.reassessment = {
      schemaVersion: 1,
      worldHash: await stableHash(variant.world),
      programHash: await stableHash(variant.program),
      predictedAction: action,
      actualAction: action,
      correct: true,
      recordedAt: new Date().toISOString(),
    }
    const data = { ...emptyData(), profile: fixtureProfile, attempts: [a] },
      retry = { ...a.reassessment, recordedAt: new Date().toISOString() }
    const annotated = annotateAttempt(data, a.id, {
      diagnosticResponses: [],
      reassessment: a.reassessment,
      transferRetries: [retry],
    })
    expect(annotated.attempts[0]!.reassessment).toEqual(a.reassessment)
    expect(() =>
      annotateAttempt(annotated, a.id, {
        diagnosticResponses: [],
        reassessment: a.reassessment,
        transferRetries: [],
      }),
    ).toThrow('cannot be edited')
    expect((await validateImport(exportJson(annotated))).attempts[0]!.transferRetries).toHaveLength(
      1,
    )
  })
  it('keeps edited team result snapshots replayable after the next round changes program', async () => {
    let team = createTeam(['Amber', 'Cedar'])
    const program = thresholdProgram(25),
      run = execute(FIRST_MISSION.world, program),
      goal = judgeGoals(FIRST_MISSION.world, run, FIRST_MISSION.successPredicate)
    team = { ...team, program }
    for (const member of team.members)
      team = submitTurn(
        team,
        await recordPrediction(member.learnerId, FIRST_MISSION.world, program, 'stop', 3),
        'I checked the changed threshold.',
      )
    team = chooseHypothesis(startHuddle(team), 'The changed threshold selects stop.')
    team = {
      ...team,
      phase: 'result',
      results: [
        {
          round: 0,
          engineVersion: 2,
          traceHash: await stableHash(run.events),
          goalPassed: goal.passed,
          recordedAt: new Date().toISOString(),
          world: FIRST_MISSION.world,
          program,
        },
      ],
    }
    team = { ...rotateRoles(team), program: FIRST_MISSION.starterProgram }
    const parsed = await validateImport(exportJson({ ...emptyData(), teams: [team] }))
    expect(parsed.teams[0]!.predictionHistory).toHaveLength(2)
    expect(parsed.teams[0]!.results[0]!.program).toEqual(program)
  })
  it('preserves previously requested hints when appending other annotations', async () => {
    const a = await attempt(),
      data = {
        ...emptyData(),
        profile: fixtureProfile,
        attempts: [{ ...a, hintIds: ['hint-observe'] }],
      }
    const updated = annotateAttempt(data, a.id, {
      diagnosticResponses: [],
      reassessment: null,
      hintIds: ['hint-observe', 'hint-compare'],
    })
    expect(updated.attempts[0]!.hintIds).toEqual(['hint-observe', 'hint-compare'])
    expect(() =>
      annotateAttempt(updated, a.id, {
        diagnosticResponses: [],
        reassessment: null,
        hintIds: ['hint-compare'],
      }),
    ).toThrow('cannot be removed')
    expect(
      annotateAttempt(updated, a.id, { diagnosticResponses: [], reassessment: null }).attempts[0]!
        .hintIds,
    ).toHaveLength(2)
  })
  it('rejects invented concept progress and omits evidence excluded by scoped exports', async () => {
    const data = {
      ...emptyData(),
      profile: {
        ...fixtureProfile,
        conceptProgress: [
          {
            concept: 'conditionals',
            independentSuccesses: 100,
            distinctScenarioHashes: ['a'.repeat(64)],
            status: 'developing' as const,
          },
        ],
      },
    }
    await expect(validateImport(exportJson(data))).rejects.toThrow('Concept progress claim')
    const scoped = scopedData(data, [], [fixtureProfile.id])
    expect(scoped.profile?.conceptProgress).toEqual([])
    await expect(validateImport(exportJson(scoped))).resolves.toBeDefined()
  })
  it('neutralizes formulas including whitespace-prefixed spreadsheet cells', () => {
    expect(csvCell('=SUM(1,2)')).toBe('"\'=SUM(1,2)"')
    expect(csvCell('\t +SUM(1,2)')).toContain("'\t +SUM")
    expect(csvCell('Robot "Cedar"')).toBe('"Robot ""Cedar"""')
  })
})
describe('durable session and learner isolation', () => {
  it('switches learner scope and clears only selected learner records', async () => {
    await useSession.getState().erase()
    const first = await useSession.getState().createLearner('Amber'),
      second = await useSession.getState().createLearner('Cedar')
    const a = await attempt(first.id),
      b = await attempt(second.id),
      team = createTeam(['Team one', 'Team two'])
    await useSession
      .getState()
      .replace({ ...useSession.getState().data, attempts: [a, b], teams: [team] })
    await useSession.getState().selectLearner(first.id)
    expect(useSession.getState().data.profile?.id).toBe(first.id)
    await useSession.getState().clearLearner(first.id)
    expect(useSession.getState().data.attempts).toEqual([b])
    expect(useSession.getState().data.teams).toEqual([team])
    expect(useSession.getState().data.profiles[0]!.id).toBe(second.id)
    await useSession.getState().erase()
  })
  it('never overwrites an unreadable saved envelope when storage retry fails', async () => {
    await useSession.getState().erase()
    const db = await database(),
      unreadable = { schemaVersion: 999, preserved: 'future application data' }
    await db.put('app', unreadable, 'state')
    useSession.setState({ ready: false, ephemeral: false })
    await useSession.getState().initialize()
    expect(useSession.getState().ephemeral).toBe(true)
    await useSession.getState().replace({ ...emptyData(), profile: fixtureProfile })
    expect(await useSession.getState().retryStorage()).toBe(false)
    expect(await db.get('app', 'state')).toEqual(unreadable)
    expect(useSession.getState().data.profile?.id).toBe(fixtureProfile.id)
    await useSession.getState().erase()
  })
  it('retains the current in-memory and persisted dataset if importing fails to save', async () => {
    await useSession.getState().erase()
    await useSession.getState().replace({ ...emptyData(), profile: fixtureProfile })
    const before = useSession.getState().data,
      replacement = ExportSchema.parse({
        ...emptyData(),
        profile: { ...fixtureProfile, nickname: 'Replacement' },
      })
    vi.spyOn(repositories, 'saveData').mockRejectedValueOnce(new Error('Quota exceeded'))
    await expect(useSession.getState().applyImport(replacement)).rejects.toThrow(
      'previous local data is unchanged',
    )
    expect(useSession.getState().data).toEqual(before)
    expect((await repositories.loadData()).profile?.nickname).toBe(fixtureProfile.nickname)
    expect(useSession.getState().pendingWrites).toBe(0)
    await useSession.getState().erase()
  })
})
