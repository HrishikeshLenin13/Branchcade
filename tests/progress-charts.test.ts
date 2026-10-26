/** Progress charts must count only what the saved attempts show. */
import { describe, expect, it } from 'vitest'
import type { Attempt, Mission } from '../src/domain/types'
import { MISSION_CATALOG, findMission } from '../src/missions/catalog'
import { recordPrediction } from '../src/learning/predictions'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { stableHash } from '../src/domain/invariants'
import { judgeMission } from '../src/missions/judge'
import { predictionOutcome, progressChartData } from '../src/learning/progress-charts'

let time = Date.parse('2026-10-26T12:00:00Z')
const tick = () => new Date((time += 1000)).toISOString()
type Guess = 'actual' | 'other' | 'unsure'
async function attempt(m: Mission, guess: Guess): Promise<Attempt> {
  const startedAt = tick(),
    run = execute(m.world, m.starterProgram),
    actual = actualAction(run.events) as 'move' | 'stop'
  const action = guess === 'other' ? (actual === 'move' ? 'stop' : 'move') : actual
  const prediction = await recordPrediction('qa-local', m.world, m.starterProgram, action, 3, '')
  return {
    schemaVersion: 1,
    id: `qa-${time}`,
    learnerId: 'qa-local',
    missionId: m.id,
    missionVersion: m.version,
    engineVersion: 2,
    attemptIndex: 1,
    startedAt,
    prediction: {
      ...prediction,
      ...(guess === 'unsure' ? { uncertain: true } : {}),
      recordedAt: tick(),
    },
    completedAt: tick(),
    world: m.world,
    program: m.starterProgram,
    traceHash: await stableHash(run.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeMission(m, m.world, m.starterProgram, run),
  }
}

describe('progress chart data', () => {
  it('is empty for an empty notebook', () => {
    expect(progressChartData([], MISSION_CATALOG)).toEqual({
      byMission: [],
      timeline: [],
      totals: { attempts: 0, matched: 0, different: 0, unsure: 0 },
      transfers: { correct: 0, total: 0 },
    })
  })

  it('counts matched, different and not-sure predictions from re-executed runs', async () => {
    const m01 = findMission('m01')!,
      m02 = findMission('m02')!
    const a = await attempt(m02, 'actual'),
      b = await attempt(m01, 'other'),
      c = await attempt(m01, 'unsure'),
      d = await attempt(m01, 'actual')
    expect([a, b, c, d].map(predictionOutcome)).toEqual([
      'matched',
      'different',
      'unsure',
      'matched',
    ])
    // Input order does not matter: the timeline follows completion time.
    const data = progressChartData([d, c, b, a], MISSION_CATALOG)
    expect(data.totals).toEqual({ attempts: 4, matched: 2, different: 1, unsure: 1 })
    expect(data.byMission.map((r) => [r.label, r.matched, r.different, r.unsure])).toEqual([
      ['M01', 1, 1, 1],
      ['M02', 1, 0, 0],
    ])
    expect(data.timeline.map((p) => [p.attempt, p.missionId, p.matched])).toEqual([
      [1, 'm02', 1],
      [2, 'm01', 1],
      [3, 'm01', 1],
      [4, 'm01', 2],
    ])
  })
})
