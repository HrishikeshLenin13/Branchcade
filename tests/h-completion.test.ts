import { describe, expect, it } from 'vitest'
import type { Attempt } from '../src/domain/types'
import { findMission } from '../src/missions/catalog'
import { completionChecks, missionComplete } from '../src/missions/completion'

const base = (over: Partial<Attempt> = {}): Attempt =>
  ({
    missionVersion: 2,
    goalOutcome: { passed: true, facts: [] },
    reassessment: { correct: true },
    prediction: { uncertain: false, reasoning: '' },
    experimentResponses: [],
    ...over,
  }) as unknown as Attempt

describe('Part H completion rule', () => {
  it('needs goals and a correct transfer for every mission', () => {
    const m01 = findMission('m01')!
    expect(missionComplete(base(), m01)).toBe(true)
    expect(missionComplete(base({ goalOutcome: { passed: false, facts: [] } }), m01)).toBe(false)
    expect(missionComplete(base({ reassessment: null }), m01)).toBe(false)
    expect(
      missionComplete(base({ prediction: { uncertain: true } } as Partial<Attempt>), m01),
    ).toBe(false)
  })
  it('the capstone also needs a written reason and an experiment answer', () => {
    const m08 = findMission('m08')!
    expect(completionChecks(base(), m08).map((c) => c.id)).toEqual([
      'goal',
      'transfer',
      'committed',
      'reason',
      'experiment',
    ])
    expect(missionComplete(base(), m08)).toBe(false)
    const done = base({
      prediction: { uncertain: false, reasoning: 'safeDistance 20 is smaller than 32' },
      experimentResponses: [{}],
    } as Partial<Attempt>)
    expect(missionComplete(done, m08)).toBe(true)
  })
  it('version-1 records keep the original rule (goal + transfer)', () => {
    const v1 = base({
      missionVersion: undefined,
      prediction: { uncertain: true },
    } as Partial<Attempt>)
    expect(missionComplete(v1, findMission('m08')!)).toBe(true)
  })
})
