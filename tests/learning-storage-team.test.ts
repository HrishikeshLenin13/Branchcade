import { describe, it, expect, beforeEach } from 'vitest'
import { initialHypotheses } from '../src/learning/hypothesis-library'
import { updateEvidence, possibleFromWrongAnswer } from '../src/learning/evidence-engine'
import { PROBES } from '../src/learning/probes'
import { generateCounterexample } from '../src/learning/counterexamples'
import { conceptStatus } from '../src/learning/mastery'
import { recordPrediction } from '../src/learning/predictions'
import { nextHypothesis } from '../src/learning/adaptive-planner'
import { learningCredit } from '../src/missions/scoring'
import { makeWorld } from '../src/engine/world'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
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
const ref = { answerId: 'answer', traceHash: 'a'.repeat(64), scenarioHash: 'b'.repeat(64) }
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
    traceHash: await stableHash(result.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeGoals(world, result, FIRST_MISSION.successPredicate),
  }
}
describe('transparent learning evidence', () => {
  it('the same initial wrong answer remains ambiguous', () => {
    const hs = possibleFromWrongAnswer(initialHypotheses())
    expect(hs.every((h) => h.status === 'possible' && h.supportScore === 0)).toBe(true)
  })
  it('different probe responses distinguish the same wrong first answer', () => {
    const hs = possibleFromWrongAnswer(initialHypotheses())
    const a = updateEvidence(hs, PROBES[0]!, 'true', ref)
    let b = updateEvidence(hs, PROBES[0]!, 'false', ref)
    b = updateEvidence(b, PROBES[1]!, 'automatic', { ...ref, answerId: 'answer2' })
    expect(nextHypothesis(a)).toBe('reversed-comparison')
    expect(nextHypothesis(b)).toBe('sensor-stops')
  })
  it('contradictory evidence downgrades; repeated exact evidence is not counted', () => {
    const a = updateEvidence(initialHypotheses(), PROBES[0]!, 'true', ref)
    expect(updateEvidence(a, PROBES[0]!, 'true', ref)).toEqual(a)
    const b = updateEvidence(a, PROBES[0]!, 'false', { ...ref, answerId: 'different' })
    expect(b[0]!.supportScore).toBe(0)
    expect(b[0]!.status).toBe('evidence_against')
  })
  it('caps heuristic weights and rejects unknown answers', () => {
    expect(() => updateEvidence(initialHypotheses(), PROBES[0]!, 'unknown', ref)).toThrow()
    let h = initialHypotheses()
    for (let i = 0; i < 5; i++)
      h = updateEvidence(h, PROBES[0]!, 'true', {
        ...ref,
        answerId: `answer${i}`,
        scenarioHash: String(i).repeat(64),
      })
    expect(h[0]!.supportScore).toBe(1)
    expect(S.HypothesisSchema.parse(h[0])).toEqual(h[0])
  })
  it('validates counterexample traces against actual engine checksums', async () => {
    for (const target of ['reversed-comparison', 'sensor-stops']) {
      const c = await generateCounterexample(target)
      expect(S.CounterexampleSchema.safeParse(c).success).toBe(true)
      expect(c.noCandidateReason).toBeNull()
      expect(actualAction(c.baselineTrace)).not.toBe(actualAction(c.changedTrace))
      expect(c.validationChecksum).toBe(
        await stableHash({ baseline: c.baselineTrace, changed: c.changedTrace }),
      )
      expect(c.baselineTrace).toEqual(execute(makeWorld(), thresholdProgram()).events)
    }
  })
  it('returns explicit no-candidate rather than an invented experiment', async () => {
    expect((await generateCounterexample('unrecognized-model')).noCandidateReason).toContain(
      'No validated candidate',
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
  const a = updateEvidence(initialHypotheses(), PROBES[0]!, 'true', ref)
  const b = updateEvidence(a, PROBES[0]!, 'true', { ...ref, answerId: 'a-new-attempt' })
  expect(b[0]!.evidence).toHaveLength(2)
  expect(b[0]!.supportScore).toBe(a[0]!.supportScore)
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
