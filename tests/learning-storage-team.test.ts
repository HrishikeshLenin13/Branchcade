import { describe, it, expect, beforeEach } from 'vitest'
import { assess, probeObservation } from '../src/learning/diagnosis'
import { buildProbe } from '../src/learning/probe-templates'
import { searchCounterexamples, toCounterexample } from '../src/learning/counterexamples'
import { conceptStatus } from '../src/learning/mastery'
import { recordPrediction } from '../src/learning/predictions'
import { learningCredit } from '../src/missions/scoring'
import { makeWorld } from '../src/engine/world'
import { execute } from '../src/interpreter/interpreter'
import { thresholdProgram, FIRST_MISSION } from '../src/missions/catalog'
import { judgeGoals } from '../src/missions/goals'
import { stableHash, opaqueId } from '../src/domain/invariants'
import { emptyData, migrateData } from '../src/storage/migrations'
import {
  loadData,
  saveData,
  clearData,
  appendAttempt,
  annotateAttempt,
} from '../src/storage/repositories'
import { exportJson, parseImport, validateImport, exportCsv } from '../src/storage/import-export'
import { createTeam, addTeamPrediction } from '../src/collaboration/session'
import { rotateRoles } from '../src/collaboration/rotation'
import { roundReady } from '../src/collaboration/evidence-cards'
import { fixtureProfile } from '../src/test/fixtures'
import * as S from '../src/domain/schemas'
import type { Attempt } from '../src/domain/types'
async function sampleAttempt(): Promise<Attempt> {
  const world = makeWorld(),
    program = thresholdProgram(),
    startedAt = new Date().toISOString(),
    prediction = await recordPrediction('test-learner', world, program, 'move', 4)
  const result = execute(world, program)
  return {
    schemaVersion: 1,
    id: opaqueId(),
    learnerId: 'test-learner',
    missionId: 'm01',
    attemptIndex: 1,
    startedAt,
    prediction,
    completedAt: new Date().toISOString(),
    world,
    program,
    engineVersion: 2,
    traceHash: await stableHash(result.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeGoals(world, result, FIRST_MISSION.successPredicate),
  }
}
describe('transparent learning evidence', () => {
  const obs = (answerId: string, learnerAnswer: string, scenarioKey = answerId) => ({
    answerId,
    source: 'probe' as const,
    independenceKey: scenarioKey,
    scenarioKey,
    question: 'first-action' as const,
    situation: 'a test example',
    learnerAnswer,
    truth: 'move',
    predictions: { COMPARATOR_DIRECTION: 'stop', SENSOR_IS_ACTION: 'stop' } as const,
  })
  it('the same initial wrong answer remains ambiguous', () => {
    const s = assess(['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION'], [obs('first', 'stop')])
    expect(s.ranked.every((h) => h.status === 'possible')).toBe(true)
    expect(s.active).toHaveLength(2)
  })
  it('different probe responses distinguish the same wrong first answer', () => {
    const a = buildProbe('g.branch-at.10-lt')!,
      b = buildProbe('g.move-only.24')!
    const base = [obs('first', 'stop')]
    const fromProbe = (id: string, answer: string) =>
      probeObservation(`x-${id}-${answer}`, id, answer)!
    const comparator = assess(
      ['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION'],
      [...base, fromProbe(a.id, a.predictions.COMPARATOR_DIRECTION)],
    )
    const sensor = assess(
      ['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION'],
      [...base, fromProbe(a.id, a.truth), fromProbe(b.id, b.predictions.SENSOR_IS_ACTION)],
    )
    expect(comparator.ranked[0]!.code).toBe('COMPARATOR_DIRECTION')
    expect(sensor.ranked[0]!.code).toBe('SENSOR_IS_ACTION')
  })
  it('contradictory evidence downgrades; repeated exact evidence is not counted', () => {
    const once = assess(['COMPARATOR_DIRECTION'], [obs('a', 'stop', 's1')])
    expect(
      assess(['COMPARATOR_DIRECTION'], [obs('a', 'stop', 's1'), obs('b', 'stop', 's1')]).ranked,
    ).toEqual(once.ranked)
    const contradicted = assess(
      ['COMPARATOR_DIRECTION'],
      [obs('a', 'stop', 's1'), obs('b', 'move', 's2'), obs('c', 'move', 's3')],
    )
    expect(contradicted.ranked[0]!.status).toBe('evidence_against')
    expect(contradicted.ranked[0]!.supportScore).toBe(0)
  })
  it('caps heuristic weights and rejects unknown answers', () => {
    expect(probeObservation('x', 'g.branch-at.10-lt', 'not-a-choice')).toBeNull()
    const many = assess(
      ['COMPARATOR_DIRECTION'],
      Array.from({ length: 6 }, (_, i) => obs(`a${i}`, 'stop', `s${i}`)),
    )
    expect(many.ranked[0]!.supportScore).toBe(1)
  })
  it('validates counterexample traces against actual engine checksums', async () => {
    for (const target of ['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION'] as const) {
      const base = { key: `legacy-${target}`, world: makeWorld(), program: thresholdProgram() }
      const search = searchCounterexamples(base, [target])
      const c = await toCounterexample(base, search, [target])
      expect(S.CounterexampleSchema.safeParse(c).success).toBe(true)
      expect(c.noCandidateReason).toBeNull()
      expect(c.validationChecksum).toBe(
        await stableHash({ baseline: c.baselineTrace, changed: c.changedTrace }),
      )
      expect(c.baselineTrace).toEqual(execute(makeWorld(), thresholdProgram()).events)
      expect(c.changedTrace).toEqual(
        execute(search.ranked[0]!.world, search.ranked[0]!.program).events,
      )
    }
  })
  it('returns explicit no-candidate rather than an invented experiment', async () => {
    const base = { key: 'legacy-none', world: makeWorld(), program: thresholdProgram() }
    const search = searchCounterexamples(base, ['WHILE_PRETEST'])
    expect((await toCounterexample(base, search, ['WHILE_PRETEST'])).noCandidateReason).toContain(
      'No single-change experiment',
    )
  })
  it('one answer is not mastery and identical transfer is deduplicated', () => {
    expect(conceptStatus([])).toBe('not_started')
    expect(conceptStatus(['same', 'same'])).toBe('practicing')
    expect(conceptStatus(['a', 'b'])).toBe('developing')
    expect(learningCredit(true, true, true, true)).toBe('practice')
    expect(learningCredit(false, true, true, false)).toBe('practice')
  })
  it('predictions are immutable and tied to world/program before reveal', async () => {
    const p = await recordPrediction('test-learner', makeWorld(), thresholdProgram(), 'move', 4)
    expect(Object.isFrozen(p)).toBe(true)
    expect(p.programHash).toBe(await stableHash(thresholdProgram()))
    expect(S.PredictionSchema.safeParse(p).success).toBe(true)
  })
})
describe('validated local persistence', () => {
  beforeEach(async () => {
    await clearData()
  })
  it('roundtrips actual data through IndexedDB and erase-all', async () => {
    const d = { ...emptyData(), profile: fixtureProfile }
    await saveData(d)
    expect((await loadData()).profile).toEqual(fixtureProfile)
    await clearData()
    expect((await loadData()).profile).toBeNull()
  })
  it('replays and validates full export/import consistency', async () => {
    const a = await sampleAttempt(),
      d = appendAttempt({ ...emptyData(), profile: fixtureProfile }, a),
      raw = exportJson(d)
    const parsed = await validateImport(raw)
    expect(parsed.attempts).toEqual(d.attempts)
    expect(exportCsv(parsed)).toContain('"m01","move","true"')
    expect(() => appendAttempt(d, a)).toThrow('already exists')
  })
  it('rejects corrupt, duplicate, oversize, future and tampered imports', async () => {
    expect(() => parseImport('{')).toThrow()
    expect(() => parseImport('x'.repeat(500001))).toThrow('500 KB')
    expect(() => parseImport('{"schemaVersion":999}')).toThrow()
    const a = await sampleAttempt(),
      d = { ...emptyData(), profile: fixtureProfile, attempts: [a, a] }
    expect(() => parseImport(JSON.stringify(d))).toThrow('Duplicate')
    a.goalOutcome.passed = false
    await expect(validateImport(JSON.stringify({ ...d, attempts: [a] }))).rejects.toThrow(
      'Goal outcome',
    )
    a.traceHash = '0'.repeat(64)
    await expect(validateImport(JSON.stringify({ ...d, attempts: [a] }))).rejects.toThrow(
      'trace checksum',
    )
  })
  it('keeps core execution immutable while appending learning evidence', async () => {
    const a = await sampleAttempt(),
      d = appendAttempt({ ...emptyData(), profile: fixtureProfile }, a),
      next = annotateAttempt(d, a.id, {
        diagnosticResponses: [
          { probeId: 'compare-rule', choiceId: 'false', recordedAt: new Date().toISOString() },
        ],
        reassessment: null,
      })
    expect(next.attempts[0]!.prediction).toEqual(a.prediction)
    expect(next.attempts[0]!.goalOutcome).toEqual(a.goalOutcome)
    expect(() =>
      annotateAttempt(next, a.id, { diagnosticResponses: [], reassessment: null }),
    ).toThrow('cannot be edited')
  })
  it('rejects predictions timestamped after reveal', async () => {
    const a = await sampleAttempt()
    a.prediction = { ...a.prediction, recordedAt: '2099-01-01T00:00:00.000Z' }
    expect(S.AttemptSchema.safeParse(a).success).toBe(false)
  })
  it('deterministically migrates legacy schema and rejects unknown keys', () => {
    expect(migrateData({ schemaVersion: 0, alias: 'Robot' }).profile).toEqual(
      migrateData({ schemaVersion: 0, alias: 'Robot' }).profile,
    )
    expect(() => migrateData({ schemaVersion: 0, alias: 'Robot', secret: 'x' })).toThrow()
  })
})
describe('local role rotation and private predictions', () => {
  it.each([2, 3, 4, 5, 6])('supports exactly %s local aliases', (n) => {
    const team = createTeam(Array.from({ length: n }, (_, i) => `Robot ${i + 1}`))
    expect(S.TeamSessionSchema.safeParse(team).success).toBe(true)
    expect(team.members).toHaveLength(n)
    const next = rotateRoles(team)
    expect(next.members.every((m, i) => m.role !== team.members[i]!.role)).toBe(true)
    expect(
      rotateRoles(rotateRoles(rotateRoles(rotateRoles(rotateRoles(next))))).members.map(
        (m) => m.role,
      ),
    ).toEqual(team.members.map((m) => m.role))
  })
  it('enforces 2–6 capacity and duplicate identities', () => {
    expect(() => createTeam(['one'])).toThrow()
    expect(() => createTeam(Array(7).fill('Robot') as string[])).toThrow()
    const t = createTeam(['one', 'two'])
    t.members[1]!.learnerId = t.members[0]!.learnerId
    expect(S.TeamSessionSchema.safeParse(t).success).toBe(false)
  })
  it('requires every individual prediction and rejects second answers', async () => {
    let t = createTeam(['one', 'two'])
    expect(roundReady(t)).toBe(false)
    const p = await recordPrediction(
      t.members[0]!.learnerId,
      makeWorld(),
      thresholdProgram(),
      'move',
      3,
    )
    t = addTeamPrediction(t, p)
    expect(() => addTeamPrediction(t, p)).toThrow('already')
    t = addTeamPrediction(
      t,
      await recordPrediction(t.members[1]!.learnerId, makeWorld(), thresholdProgram(), 'stop', 3),
    )
    expect(roundReady(t)).toBe(true)
    expect(rotateRoles(t).predictions).toHaveLength(0)
  })
})
it('repeating the same example adds no independent support weight', () => {
  const p = buildProbe('g.branch-at.10-lt')!
  const first = probeObservation('a', p.id, p.predictions.COMPARATOR_DIRECTION)!
  const again = probeObservation('a-new-attempt', p.id, p.predictions.COMPARATOR_DIRECTION)!
  const a = assess(['COMPARATOR_DIRECTION'], [first])
  const b = assess(['COMPARATOR_DIRECTION'], [first, again])
  expect(b.ranked[0]!.supports).toHaveLength(1)
  expect(b.ranked[0]!.supportScore).toBe(a.ranked[0]!.supportScore)
})
it('imported completion and transfer claims need actual evidence', async () => {
  const a = await sampleAttempt()
  const data = {
    ...emptyData(),
    profile: { ...fixtureProfile, completedMissions: ['m01'] },
    attempts: [a],
  }
  await expect(validateImport(JSON.stringify(data))).rejects.toThrow('Completion claim')
  data.profile.completedMissions = []
  a.reassessment = {
    schemaVersion: 1,
    worldHash: 'a'.repeat(64),
    programHash: 'b'.repeat(64),
    predictedAction: 'stop',
    actualAction: 'stop',
    correct: true,
    recordedAt: new Date().toISOString(),
  }
  await expect(validateImport(JSON.stringify(data))).rejects.toThrow('Transfer result')
})
