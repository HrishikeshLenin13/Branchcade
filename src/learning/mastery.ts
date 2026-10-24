import type { Attempt, Mission } from '../domain/types'
import { CONCEPTS, CONCEPT_IDS, missionConcepts, type ConceptId } from './concepts'
import { attemptDiagnosis } from './investigation'
import { buildProbe, PROBE_TEMPLATES } from './probe-templates'
import { probeObservation } from './diagnosis'
import { TAXONOMY } from './taxonomy'
import { executeRecorded } from '../interpreter/interpreter'
import { actualAction } from '../interpreter/trace'

/** Legacy storage summary kept for saved profiles (A–F). New UI uses conceptEvidence(). */
export function conceptStatus(
  distinctScenarioHashes: readonly string[],
): 'not_started' | 'practicing' | 'developing' {
  const n = new Set(distinctScenarioHashes).size
  return n === 0 ? 'not_started' : n < 2 ? 'practicing' : 'developing'
}

/** Part G5 concept mastery evidence, derived only from saved attempts (never from a flag).
 *
 * Status rules (bounded, deterministic heuristics — not grades and not probabilities):
 *  - Not explored: no committed answer touches the concept.
 *  - Evidence of understanding: at least two DISTINCT scenarios predicted correctly without
 *    hints or a revealed experiment, at least one correct unseen transfer, at least one
 *    written reason, the most recent transfer correct, and no idea in this concept currently
 *    marked "Might be".
 *  - Needs another example: the most recent transfer or answer in the concept was different
 *    from the real run, or an idea in this concept is currently "Might be".
 *  - Working on it: anything else. */
export type ConceptStatus =
  'not_explored' | 'working_on_it' | 'evidence_of_understanding' | 'needs_another_example'
export const CONCEPT_STATUS_LABEL: Record<ConceptStatus, string> = {
  not_explored: 'Not explored',
  working_on_it: 'Working on it',
  evidence_of_understanding: 'Evidence of understanding',
  needs_another_example: 'Needs another example',
}
export interface ConceptEvidence {
  concept: ConceptId
  status: ConceptStatus
  label: string
  attempts: number
  scenarios: number
  correctIndependent: number
  correctAssisted: number
  incorrect: number
  reasons: number
  hints: number
  transfersCorrect: number
  transfersIncorrect: number
  supportedIdeas: string[]
  lastPracticed: string | null
  /** Plain-language explanation of which rule produced the status. */
  rule: string
}

const templateConcept = new Map<string, ConceptId>(
  PROBE_TEMPLATES.map((t) => [t.id, TAXONOMY[t.designedFor[0]!].concept]),
)

export function conceptEvidence(
  attempts: readonly Attempt[],
  missions: readonly Mission[],
): ConceptEvidence[] {
  type Acc = {
    scenarios: Set<string>
    independent: Set<string>
    assisted: Set<string>
    incorrect: number
    reasons: number
    hints: number
    attempts: Set<string>
    transfers: { at: string; correct: boolean }[]
    answers: { at: string; correct: boolean }[]
    supported: Set<string>
    last: string | null
  }
  const acc = new Map<ConceptId, Acc>(
    CONCEPT_IDS.map((c) => [
      c,
      {
        scenarios: new Set(),
        independent: new Set(),
        assisted: new Set(),
        incorrect: 0,
        reasons: 0,
        hints: 0,
        attempts: new Set(),
        transfers: [],
        answers: [],
        supported: new Set(),
        last: null,
      },
    ]),
  )
  const sorted = [...attempts].sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const latestByMission = new Map<string, Attempt>()
  for (const a of sorted) latestByMission.set(a.missionId, a)
  for (const a of sorted) {
    const mission = missions.find((m) => m.id === a.missionId)
    if (!mission) continue
    const concepts = missionConcepts(mission)
    const assisted = Boolean(a.hintIds?.length || a.experimentUsed)
    const scenario = `${a.prediction.worldHash}:${a.prediction.programHash}`
    const correct =
      !a.prediction.uncertain &&
      a.prediction.action ===
        actualAction(executeRecorded(a.world, a.program, a.engineVersion).events)
    for (const c of concepts) {
      const x = acc.get(c)!
      x.attempts.add(a.id)
      x.last = a.completedAt
      x.hints += a.hintIds?.length ?? 0
      if (!a.prediction.uncertain) {
        x.scenarios.add(scenario)
        x.answers.push({ at: a.prediction.recordedAt, correct })
        if (correct) (assisted ? x.assisted : x.independent).add(scenario)
        else x.incorrect++
        if (correct && a.prediction.reasoning?.trim()) x.reasons++
      }
      for (const t of [...(a.reassessment ? [a.reassessment] : []), ...(a.transferRetries ?? [])]) {
        if (t.worldHash === a.prediction.worldHash) continue
        x.transfers.push({ at: t.recordedAt, correct: t.correct })
        x.answers.push({ at: t.recordedAt, correct: t.correct })
      }
    }
    // Probe answers are committed predictions about new scenarios in a probe's own concept.
    for (const r of a.diagnosticResponses) {
      if (!r.probeId.startsWith('g.')) continue
      const probe = buildProbe(r.probeId)
      const o = probeObservation(`${a.id}-${r.probeId}`, r.probeId, r.choiceId)
      const c = probe ? templateConcept.get(probe.template) : undefined
      if (!probe || !o || !c) continue
      const x = acc.get(c)!
      x.attempts.add(a.id)
      x.last = r.recordedAt
      x.scenarios.add(probe.id)
      x.answers.push({ at: r.recordedAt, correct: o.learnerAnswer === o.truth })
      if (o.learnerAnswer === o.truth)
        (a.hintIds?.length ? x.assisted : x.independent).add(probe.id)
      else x.incorrect++
    }
  }
  for (const a of latestByMission.values()) {
    const mission = missions.find((m) => m.id === a.missionId)
    for (const h of attemptDiagnosis(a, mission).ranked)
      if (h.status === 'evidence_for') acc.get(h.entry.concept)!.supported.add(h.entry.title)
  }
  return CONCEPTS.map(({ id }) => {
    const x = acc.get(id)!
    const answers = x.answers.sort((p, q) => p.at.localeCompare(q.at))
    const transfers = x.transfers.sort((p, q) => p.at.localeCompare(q.at))
    const latestTransfer = transfers.at(-1)
    const latest = answers.at(-1)
    const tc = transfers.filter((t) => t.correct).length
    let status: ConceptStatus
    let rule: string
    if (!x.attempts.size) {
      status = 'not_explored'
      rule = 'No saved answer has used this concept yet.'
    } else if (x.supported.size || latestTransfer?.correct === false || latest?.correct === false) {
      status = 'needs_another_example'
      rule = x.supported.size
        ? `Your latest answers fit a possible mix-up (${[...x.supported].join(', ')}). A targeted example comes next.`
        : 'Your most recent answer here was different from what the robot really did.'
    } else if (x.independent.size >= 2 && tc >= 1 && x.reasons >= 1 && latestTransfer?.correct) {
      status = 'evidence_of_understanding'
      rule = `${x.independent.size} different scenarios predicted correctly without help, ${tc} correct new-numbers challenge${tc === 1 ? '' : 's'}, and a reason in your own words.`
    } else {
      status = 'working_on_it'
      const missing = [
        x.independent.size < 2
          ? `${2 - x.independent.size} more correct prediction${x.independent.size === 1 ? '' : 's'} without hints`
          : '',
        tc < 1 ? 'a correct new-numbers challenge' : '',
        x.reasons < 1 ? 'one prediction with a written reason' : '',
      ].filter(Boolean)
      rule = missing.length
        ? `Still needed: ${missing.join(', ')}.`
        : 'Keep practicing with new numbers.'
    }
    return {
      concept: id,
      status,
      label: CONCEPT_STATUS_LABEL[status],
      attempts: x.attempts.size,
      scenarios: x.scenarios.size,
      correctIndependent: x.independent.size,
      correctAssisted: x.assisted.size,
      incorrect: x.incorrect,
      reasons: x.reasons,
      hints: x.hints,
      transfersCorrect: tc,
      transfersIncorrect: transfers.length - tc,
      supportedIdeas: [...x.supported],
      lastPracticed: x.last,
      rule,
    }
  })
}
