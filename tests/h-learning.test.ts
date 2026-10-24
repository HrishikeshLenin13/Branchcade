/** Part H ↔ Part G integration: the mission second question feeds the evidence engine. */
import { describe, expect, it } from 'vitest'
import type { Attempt } from '../src/domain/types'
import { findMission } from '../src/missions/catalog'
import { detailChoices } from '../src/learning/diagnosis'
import { attemptDiagnosis, nextProbe } from '../src/learning/investigation'
import { recordPrediction } from '../src/learning/predictions'
import { execute } from '../src/interpreter/interpreter'
import { stableHash } from '../src/domain/invariants'
import { judgeMission } from '../src/missions/judge'

async function m04Attempt(turns: string): Promise<Attempt> {
  const m = findMission('m04')!
  const run = execute(m.world, m.starterProgram)
  const startedAt = new Date().toISOString()
  const p = await recordPrediction('h-learner', m.world, m.starterProgram, 'move', 3)
  return {
    schemaVersion: 1,
    engineVersion: 2,
    missionVersion: m.version,
    id: `m04-${turns}`,
    learnerId: 'h-learner',
    missionId: 'm04',
    attemptIndex: 1,
    startedAt,
    prediction: { ...p, detail: { question: 'turn-count', answer: turns } },
    completedAt: new Date().toISOString(),
    world: m.world,
    program: m.starterProgram,
    traceHash: await stableHash(run.events),
    diagnosticResponses: [],
    reassessment: null,
    goalOutcome: judgeMission(m, m.world, m.starterProgram, run),
  }
}

describe('mission second question', () => {
  it('offers the real answer among model answers without giving it away', () => {
    const m = findMission('m04')!
    const choices = detailChoices('h-choices', m.world, m.starterProgram, 'turn-count')
    expect(choices.map((c) => c.id)).toEqual(['3', '4', '5'])
  })
  it('a correct first action but an off-by-one turn count now opens the LOOP_COUNT question', async () => {
    const wrong = await m04Attempt('5')
    const state = attemptDiagnosis(wrong, findMission('m04'))
    expect(state.observations.map((o) => o.question)).toEqual(['first-action', 'turn-count'])
    expect(state.active).toContain('LOOP_COUNT')
    expect(nextProbe(wrong, state)?.probe.template).toMatch(/^repeat-/)
    const right = await m04Attempt('4')
    expect(attemptDiagnosis(right, findMission('m04')).summary).toBe('no-mix-up-seen')
  })
})
