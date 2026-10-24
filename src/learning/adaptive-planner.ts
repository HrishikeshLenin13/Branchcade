import type { Attempt, Mission } from '../domain/types'
import { CONCEPTS, conceptTitle, missionConcepts, type ConceptId } from './concepts'
import { conceptEvidence, type ConceptEvidence } from './mastery'
import { attemptDiagnosis } from './investigation'

/** Part G5 individualized activity selection. Deterministic rules, in priority order:
 *  1. No attempts yet → the first foundations mission.
 *  2. The latest attempt's evidence marks an idea "Might be" → targeted practice on a mission
 *     that exercises that idea's concept.
 *  3. A concept "Needs another example" → practice it again with new numbers.
 *  4. The earliest concept (in prerequisite order) without evidence of understanding:
 *     if one of its prerequisites is unexplored, go back to that prerequisite first;
 *     otherwise advance to the first mission covering it.
 *  5. Everything shows evidence → revisit the concept practiced longest ago.
 * Each recommendation carries a "Why this next?" reason built from the actual evidence. */
export interface Recommendation {
  missionId: string
  kind: 'start' | 'targeted' | 'practice' | 'prerequisite' | 'advance' | 'review'
  concept: ConceptId
  reason: string
}

const covering = (missions: readonly Mission[], concept: ConceptId) =>
  missions.filter((m) => missionConcepts(m).includes(concept))
/** Prefers a mission not completed yet, then the one played least recently. */
function pick(
  missions: readonly Mission[],
  attempts: readonly Attempt[],
  completed: readonly string[],
) {
  const last = (id: string) =>
    attempts
      .filter((a) => a.missionId === id)
      .map((a) => a.completedAt)
      .sort()
      .at(-1) ?? ''
  return [...missions].sort(
    (a, b) =>
      Number(completed.includes(a.id)) - Number(completed.includes(b.id)) ||
      last(a.id).localeCompare(last(b.id)) ||
      missions.indexOf(a) - missions.indexOf(b),
  )[0]
}

export function recommend(
  attempts: readonly Attempt[],
  missions: readonly Mission[],
  completed: readonly string[] = [],
  evidence: ConceptEvidence[] = conceptEvidence(attempts, missions),
): Recommendation {
  const scored = attempts.filter((a) => a.missionId !== 'lab')
  const first = missions[0]!
  if (!scored.length)
    return {
      missionId: first.id,
      kind: 'start',
      concept: missionConcepts(first)[0] ?? 'sensor-readings',
      reason: `Start with “${first.title}”: every later mission builds on reading a sensor and comparing numbers.`,
    }
  const latest = [...scored].sort((a, b) => a.completedAt.localeCompare(b.completedAt)).at(-1)!
  const latestMission = missions.find((m) => m.id === latest.missionId)
  const diagnosis = attemptDiagnosis(latest, latestMission)
  const idea = diagnosis.ranked.find((h) => h.status === 'evidence_for')
  if (idea) {
    const options = covering(missions, idea.entry.concept)
    const mission = pick(options.length ? options : [latestMission ?? first], scored, completed)!
    return {
      missionId: mission.id,
      kind: 'targeted',
      concept: idea.entry.concept,
      reason: `In “${latestMission?.title ?? 'your last mission'}”, your answers suggested ${idea.entry.learnerText.replace(/^You might be /, 'you might be ').replace(/\.$/, '')}. “${mission.title}” practices ${conceptTitle(idea.entry.concept).toLowerCase()} with new numbers. It’s a possibility to test, not a label.`,
    }
  }
  const order = CONCEPTS.map((c) => c.id)
  const byId = new Map(evidence.map((e) => [e.concept, e]))
  const needs = order.find((c) => byId.get(c)?.status === 'needs_another_example')
  if (needs) {
    const mission = pick(covering(missions, needs), scored, completed) ?? first
    return {
      missionId: mission.id,
      kind: 'practice',
      concept: needs,
      reason: `${conceptTitle(needs)}: ${byId.get(needs)!.rule} “${mission.title}” gives you a fresh example.`,
    }
  }
  const next = order.find((c) => byId.get(c)?.status !== 'evidence_of_understanding')
  if (next) {
    const prereq = CONCEPTS.find((c) => c.id === next)!.prerequisites.find(
      (p) => byId.get(p as ConceptId)?.status === 'not_explored',
    ) as ConceptId | undefined
    if (prereq) {
      const mission = pick(covering(missions, prereq), scored, completed) ?? first
      return {
        missionId: mission.id,
        kind: 'prerequisite',
        concept: prereq,
        reason: `${conceptTitle(next)} builds on ${conceptTitle(prereq).toLowerCase()}, which you haven’t explored yet. Start with “${mission.title}”.`,
      }
    }
    const mission = pick(covering(missions, next), scored, completed) ?? first
    const status = byId.get(next)!
    return {
      missionId: mission.id,
      kind: status.status === 'not_explored' ? 'advance' : 'practice',
      concept: next,
      reason:
        status.status === 'not_explored'
          ? `You’ve shown evidence for the concepts before ${conceptTitle(next).toLowerCase()}. “${mission.title}” is the next step.`
          : `${conceptTitle(next)}: ${status.rule} Try “${mission.title}”.`,
    }
  }
  const stale = [...evidence].sort((a, b) =>
    (a.lastPracticed ?? '').localeCompare(b.lastPracticed ?? ''),
  )[0]!
  const mission = pick(covering(missions, stale.concept), scored, completed) ?? first
  return {
    missionId: mission.id,
    kind: 'review',
    concept: stale.concept,
    reason: `Every concept shows evidence of understanding. ${conceptTitle(stale.concept)} was practiced longest ago, so a quick revisit keeps it fresh.`,
  }
}

/** @deprecated Temporary bridge for the pre-G workstation; removed with the static probes. */
export function nextHypothesis(hypotheses: import('../domain/types').Hypothesis[]): string {
  return (
    [...hypotheses].sort(
      (a, b) => b.supportScore - a.supportScore || a.code.localeCompare(b.code, 'en'),
    )[0]?.code ?? 'reversed-comparison'
  )
}
