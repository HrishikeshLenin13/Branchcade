import type { Attempt, Mission, Program, World } from '../domain/types'
import { WorldSchema } from '../domain/schemas'
import {
  assess,
  missionBranchObservation,
  missionObservation,
  predict,
  probeObservation,
  relevantHypotheses,
  selectNextProbe,
  type DiagnosisState,
  type Observation,
  type ProbeChoice,
} from './diagnosis'
import { applyEdit, searchCounterexamples, type CxField, type CxSearch } from './counterexamples'
import { findTransfer } from './transfer'
import { ALL_PROBE_IDS, buildProbe } from './probe-templates'
import { TAXONOMY } from './taxonomy'
import type { QuestionKind } from './mental-models'
import { HYPOTHESIS_CODES, type HypothesisCode } from './taxonomy'

/** Glue between stored attempts and the pure G engines. Everything is re-derived from the
 * immutable attempt record: mission prediction, probe answers, experiment answers and
 * transfer answers. Pre-G (legacy, engine v1) attempts keep their history but are not
 * re-diagnosed, because the mental models run on the current engine only. */
const usable = (attempt: Attempt): World | null => {
  if (attempt.engineVersion !== 2) return null
  const w = WorldSchema.safeParse(attempt.world)
  return w.success ? w.data : null
}
export const attemptKey = (attempt: Pick<Attempt, 'id'>) => `attempt:${attempt.id}`

export function attemptObservations(attempt: Attempt, mission?: Mission): Observation[] {
  const world = usable(attempt)
  if (!world) return []
  const out: Observation[] = []
  const first = missionObservation({
    answerId: `${attempt.id}-mission`,
    missionId: attempt.missionId,
    key: attemptKey(attempt),
    world,
    program: attempt.program,
    predictedAction: attempt.prediction.action,
    uncertain: attempt.prediction.uncertain || attempt.assessmentSkipped,
  })
  if (first) out.push(first)
  const branch = missionBranchObservation({
    answerId: `${attempt.id}-mission-branch`,
    missionId: attempt.missionId,
    key: attemptKey(attempt),
    world,
    program: attempt.program,
    predictedBranch: attempt.prediction.branch,
    uncertain: attempt.prediction.uncertain || attempt.assessmentSkipped,
  })
  if (branch) out.push(branch)
  for (const r of attempt.diagnosticResponses) {
    if (!r.probeId.startsWith('g.')) continue
    const o = probeObservation(`${attempt.id}-${r.probeId}`, r.probeId, r.choiceId)
    if (o) out.push(o)
  }
  const models = relevantHypotheses(world, attempt.program)
  ;(attempt.experimentResponses ?? []).forEach((r, i) => {
    const base = r.baseProbeId ? buildProbe(r.baseProbeId) : { world, program: attempt.program }
    if (!base) return
    const scenario = applyEdit(base.world, base.program, {
      field: r.field as CxField,
      target: r.target,
      value: r.value,
    })
    if (!scenario) return
    const key = `${r.baseProbeId ?? attemptKey(attempt)}|cx|${r.field}.${r.target}.${r.value}`
    const p = predict(key, scenario.world, scenario.program, r.question as QuestionKind, models)
    if (!p || p.truth !== r.actual) return
    out.push({
      answerId: `${attempt.id}-experiment-${i}`,
      source: 'experiment',
      independenceKey: `experiment:${r.field}`,
      scenarioKey: key,
      question: r.question as QuestionKind,
      situation: 'your experiment prediction',
      learnerAnswer: r.predicted,
      truth: p.truth,
      predictions: p.predictions,
    })
  })
  if (mission)
    [
      ...(attempt.reassessment ? [attempt.reassessment] : []),
      ...(attempt.transferRetries ?? []),
    ].forEach((t, i) => {
      const scenario = findTransfer(mission, t.scenarioId)
      if (!scenario) return
      const key = `transfer:${mission.id}:${scenario.id}`
      const p = predict(key, scenario.world, scenario.program, 'first-action', models)
      if (!p || p.truth !== t.actualAction) return
      out.push({
        answerId: `${attempt.id}-transfer-${i}`,
        source: 'transfer',
        independenceKey: `transfer:${scenario.id}`,
        scenarioKey: key,
        question: 'first-action',
        situation: 'the new-numbers challenge',
        learnerAnswer: t.predictedAction,
        truth: p.truth,
        predictions: p.predictions,
      })
    })
  return out
}

export function attemptDiagnosis(attempt: Attempt, mission?: Mission): DiagnosisState {
  const world = usable(attempt)
  const candidates = world ? relevantHypotheses(world, attempt.program) : []
  return assess(candidates, attemptObservations(attempt, mission))
}

export function nextProbe(
  attempt: Attempt,
  state: DiagnosisState,
  skipped: readonly string[] = [],
  preferLike?: string,
  voluntary = false,
): ProbeChoice | null {
  if (!usable(attempt) || attempt.prediction.uncertain) return null
  const asked = attempt.diagnosticResponses
    .map((r) => r.probeId)
    .filter((id) => id.startsWith('g.'))
  return selectNextProbe(state, { asked, skipped, preferLike, voluntary })
}

/** Hypotheses the experiment should target: the supported/active ones, most likely first. */
export function experimentTargets(state: DiagnosisState): HypothesisCode[] {
  const supported = state.ranked.filter((a) => a.status === 'evidence_for').map((a) => a.code)
  return supported.length ? supported : state.active
}
export interface ExperimentPlan {
  base: { key: string; world: World; program: Program; probeId?: string }
  search: CxSearch
  targets: HypothesisCode[]
}
/** G4 plan: search one-change edits of the learner's OWN mission first. If none can separate
 * the ideas, fall back to the targeted idea's verified probe scenarios (still executed and
 * checked, never a canned answer). If nothing works, the typed no-candidate result stands. */
export function experimentPlan(attempt: Attempt, state: DiagnosisState): ExperimentPlan | null {
  const world = usable(attempt)
  if (!world) return null
  const targets = experimentTargets(state).filter((c) =>
    (HYPOTHESIS_CODES as readonly string[]).includes(c),
  )
  const base = { key: attemptKey(attempt), world, program: attempt.program }
  const search = searchCounterexamples(base, targets)
  if (search.ranked.length || !targets.length) return { base, search, targets }
  for (const t of targets)
    for (const template of TAXONOMY[t].probes)
      for (const id of ALL_PROBE_IDS.filter((x) => x.startsWith(`g.${template}.`))) {
        const probe = buildProbe(id)
        if (!probe) continue
        const probeBase = { key: id, world: probe.world, program: probe.program, probeId: id }
        const fallback = searchCounterexamples(probeBase, targets)
        if (fallback.ranked.length) return { base: probeBase, search: fallback, targets }
      }
  return { base, search, targets }
}
export function experimentSearch(attempt: Attempt, state: DiagnosisState): CxSearch | null {
  return experimentPlan(attempt, state)?.search ?? null
}
