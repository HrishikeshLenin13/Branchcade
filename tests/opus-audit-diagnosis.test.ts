/** Opus post-L audit: independent synthetic learner journeys through the evidence engine.
 * Learners A and B make the same wrong M01 prediction, then answer the engine's own chosen
 * follow-up differently. Learner C repeats one answer twice; learner D contradicts. */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findMission } from '../src/missions/catalog'
import {
  assess,
  missionObservation,
  probeObservation,
  relevantHypotheses,
  selectNextProbe,
  type Observation,
} from '../src/learning/diagnosis'

const m01 = findMission('m01')!
const candidates = relevantHypotheses(m01.world, m01.starterProgram)
const first = missionObservation({
  answerId: 'a-mission',
  missionId: 'm01',
  key: 'opus:m01',
  world: m01.world,
  program: m01.starterProgram,
  predictedAction: 'stop',
})!
const lines: string[] = []
const show = (name: string, obs: Observation[]) => {
  const s = assess(candidates, obs)
  lines.push(
    `${name}: summary=${s.summary} slip=${s.slipPossible} wrong=${s.wrongAnswers} headline="${s.headline}"`,
    ...s.ranked
      .filter((a) => a.status !== 'unverified')
      .map(
        (a) =>
          `    ${a.code} ${a.status} label="${a.label}" support=${a.independentSupport} score=${a.supportScore.toFixed(2)}`,
      ),
  )
  return s
}

describe('Opus synthetic diagnosis journeys (M01, wrong STOP at 24 cm)', () => {
  it('one wrong answer is not a diagnosis', () => {
    expect(first.learnerAnswer).toBe('stop')
    expect(first.truth).not.toBe('stop')
    const s = show('after first wrong answer', [first])
    expect(['investigating', 'several-possible', 'might-be']).toContain(s.summary)
    expect(s.ranked.every((a) => a.status !== 'evidence_for')).toBe(true)
  })
  it('same first error, different follow-ups → different leading ideas', () => {
    const s0 = assess(candidates, [first])
    const choice = selectNextProbe(s0, { asked: [], skipped: [] })!
    expect(choice).not.toBeNull()
    lines.push(
      `chosen probe ${choice.probe.id}: groups ${JSON.stringify(choice.groups)}`,
      `why: ${choice.why}`,
    )
    const wrongGroups = choice.groups.filter((g) => g.answer !== choice.probe.truth)
    expect(wrongGroups.length).toBeGreaterThanOrEqual(1)
    const answerFor = (g: { answer: string }) => g.answer.replace(/[^\w.-]/g, '_')
    const a = probeObservation(
      'a-p1',
      choice.probe.id,
      answerFor(choice.groups.find((g) => g.answer === choice.probe.truth)!),
    )!
    const b = probeObservation('b-p1', choice.probe.id, answerFor(wrongGroups[0]!))!
    const sa = show('learner A (correct follow-up)', [first, a])
    const sb = show('learner B (wrong follow-up)', [first, b])
    const lead = (s: typeof sa) =>
      s.ranked
        .filter((x) => x.status === 'evidence_for' || x.status === 'possible')
        .map((x) => x.code)
        .join(',')
    expect(lead(sa)).not.toBe(lead(sb))
  })
  it('repeating the same answer to the same scenario is not double counted', () => {
    const s0 = assess(candidates, [first])
    const choice = selectNextProbe(s0, { asked: [], skipped: [] })!
    const wrong = choice.groups.find((g) => g.answer !== choice.probe.truth)!
    const id = wrong.answer.replace(/[^\w.-]/g, '_')
    const once = assess(candidates, [first, probeObservation('c1', choice.probe.id, id)!])
    const twice = show('learner C (same answer twice)', [
      first,
      probeObservation('c1', choice.probe.id, id)!,
      probeObservation('c2', choice.probe.id, id)!,
    ])
    for (const x of twice.ranked) {
      const y = once.ranked.find((r) => r.code === x.code)!
      expect(x.independentSupport).toBe(y.independentSupport)
    }
  })
  it('writes the journey record', () => {
    if (process.env.OPUS_AUDIT_OUT)
      writeFileSync(`${process.env.OPUS_AUDIT_OUT}/diagnosis-journeys.txt`, lines.join('\n') + '\n')
  })
})
