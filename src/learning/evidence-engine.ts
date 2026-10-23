import type { EvidenceItem, Hypothesis, Probe } from '../domain/types'
import { immutable, opaqueId } from '../domain/invariants'
/** Evidence weights are explanatory heuristics, never probabilities about a child's mind. */
export function updateEvidence(
  hypotheses: Hypothesis[],
  probe: Probe,
  choiceId: string,
  reference: { answerId: string; traceHash: string; scenarioHash: string },
): Hypothesis[] {
  if (!probe.choices.some((c) => c.id === choiceId)) throw new Error('Unknown probe choice')
  return hypotheses.map((h) => {
    if (!probe.targetHypotheses.includes(h.code)) return h
    if (
      [...h.evidence, ...h.contradictions].some(
        (e) => e.scenarioHash === reference.scenarioHash && e.answerId === reference.answerId,
      )
    )
      return h
    const supports = probe.discrimination.some(
      (d) => d.hypothesisId === h.code && d.choiceId === choiceId,
    )
    const item: EvidenceItem = {
      schemaVersion: 1,
      id: opaqueId(),
      ...reference,
      hypothesisId: h.code,
      direction: supports ? 'supports' : 'contradicts',
      weight: 0.5,
      ruleReason: `${probe.id}: selected ${choiceId}; ${probe.rationale}`,
    }
    const evidence = supports ? [...h.evidence, item] : h.evidence,
      contradictions = supports ? h.contradictions : [...h.contradictions, item]
    // Repeating the same scenario can add observations, but not independent support weight.
    const weight = (items: EvidenceItem[]) =>
      [...new Map(items.map((e) => [e.scenarioHash, e.weight])).values()].reduce(
        (sum, n) => sum + n,
        0,
      )
    const score = Math.max(0, Math.min(1, weight(evidence) - weight(contradictions)))
    return immutable({
      ...h,
      evidence,
      contradictions,
      supportScore: score,
      status:
        score >= 0.5 ? 'evidence_for' : contradictions.length ? 'evidence_against' : 'possible',
    }) as Hypothesis
  })
}
export function possibleFromWrongAnswer(hypotheses: Hypothesis[]): Hypothesis[] {
  return hypotheses.map((h) => ({ ...h, status: 'possible' }))
}
