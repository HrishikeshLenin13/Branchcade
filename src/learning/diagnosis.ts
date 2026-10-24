import type { Program, Statement, Expression, World } from '../domain/types'
import {
  ALL_PROBE_IDS,
  answerLabel,
  buildProbe,
  quote,
  type GeneratedProbe,
} from './probe-templates'
import { runModel, observe, truthIsClean, type QuestionKind } from './mental-models'
import {
  HYPOTHESIS_CODES,
  NO_MISCONCEPTION,
  TAXONOMY,
  type HypothesisCode,
  type ModelCode,
  type TaxonomyEntry,
} from './taxonomy'

/** Part G2/G3 transparent evidence engine.
 *
 * An Observation is one answer the learner committed BEFORE seeing the result, plus what
 * actually happened and what each candidate mental model predicts for that same scenario.
 * Everything below is a pure function of the stored answers, so the same answers always
 * produce the same ranking, and nothing is persisted that could be edited to fake one.
 *
 * Rules (all weights are explanatory heuristics, never probabilities):
 *  - learner right, model wrong            → contradicts, weight 1 ("you got right what this idea gets wrong")
 *  - learner wrong, model predicts exactly → supports,    weight 1
 *  - learner wrong, model predicts truth   → contradicts, weight 0.5 ("this idea does not explain it")
 *  - learner wrong, model predicts another wrong answer → contradicts, weight 1
 *  - learner right, model right            → no evidence (the example cannot tell them apart)
 *  - the same scenario counts once per hypothesis (no double counting).
 * Status needs INDEPENDENT support: two supporting answers from different question
 * templates. One answer can never make an idea "Might be". */
export interface Observation {
  answerId: string
  source: 'mission' | 'probe' | 'experiment' | 'transfer'
  independenceKey: string
  scenarioKey: string
  question: QuestionKind
  situation: string
  learnerAnswer: string
  truth: string
  predictions: Partial<Record<ModelCode, string>>
  labels?: Record<string, string>
}
export interface EvidenceNote {
  answerId: string
  direction: 'supports' | 'contradicts'
  weight: number
  reason: string
}
export type Status = 'unverified' | 'possible' | 'evidence_for' | 'evidence_against'
export const STATUS_LABEL: Record<Status, string> = {
  unverified: 'Need more examples',
  possible: 'Need more examples',
  evidence_for: 'Might be',
  evidence_against: 'No longer supported',
}
export interface Assessment {
  code: HypothesisCode
  entry: TaxonomyEntry
  supports: EvidenceNote[]
  contradictions: EvidenceNote[]
  independentSupport: number
  contradictionWeight: number
  /** Bounded heuristic in [0,1] for the technical inspector. NOT a probability. */
  supportScore: number
  status: Status
  label: string
  conflicting: boolean
  active: boolean
}
export type Summary =
  | 'no-evidence'
  | 'no-mix-up-seen'
  | 'investigating'
  | 'conflicting'
  | 'might-be'
  | 'several-possible'
  | 'none-supported'
export interface DiagnosisState {
  candidates: HypothesisCode[]
  observations: Observation[]
  ranked: Assessment[]
  active: HypothesisCode[]
  wrongAnswers: number
  /** True while the answers are still consistent with a one-off slip. */
  slipPossible: boolean
  summary: Summary
  headline: string
}

const say = (o: Pick<Observation, 'question' | 'labels'>, a: string) =>
  quote(answerLabel(o.question, a, o.labels))

/** Pure ranking of the candidate hypotheses from committed observations. */
export function assess(candidates: HypothesisCode[], observations: Observation[]): DiagnosisState {
  const ranked = candidates.map((code) => {
    const supports: EvidenceNote[] = [],
      contradictions: EvidenceNote[] = []
    const seen = new Set<string>()
    const supportKeys = new Set<string>()
    for (const o of observations) {
      const p = o.predictions[code]
      if (p === undefined || seen.has(o.scenarioKey)) continue
      seen.add(o.scenarioKey)
      const right = o.learnerAnswer === o.truth
      if (right && p !== o.truth)
        contradictions.push({
          answerId: o.answerId,
          direction: 'contradicts',
          weight: 1,
          reason: `In ${o.situation} you chose ${say(o, o.learnerAnswer)}, which is what really happened. Someone with this idea would have expected ${say(o, p)}.`,
        })
      else if (!right && p === o.learnerAnswer) {
        supports.push({
          answerId: o.answerId,
          direction: 'supports',
          weight: 1,
          reason: `In ${o.situation} you chose ${say(o, o.learnerAnswer)}. This idea predicts exactly that, but the robot really did ${say(o, o.truth)}.`,
        })
        supportKeys.add(o.independenceKey)
      } else if (!right)
        contradictions.push({
          answerId: o.answerId,
          direction: 'contradicts',
          weight: p === o.truth ? 0.5 : 1,
          reason:
            p === o.truth
              ? `In ${o.situation} you chose ${say(o, o.learnerAnswer)}. This idea does not explain that answer (it predicts ${say(o, p)}).`
              : `In ${o.situation} you chose ${say(o, o.learnerAnswer)}, but this idea predicts ${say(o, p)}.`,
        })
    }
    const S = supports.length,
      I = supportKeys.size,
      C = contradictions.reduce((sum, c) => sum + c.weight, 0)
    const status: Status =
      S === 0 && C === 0
        ? 'unverified'
        : C >= 1 && C >= S
          ? 'evidence_against'
          : I >= 2 && S - C >= 1.5
            ? 'evidence_for'
            : 'possible'
    return {
      code,
      entry: TAXONOMY[code],
      supports,
      contradictions,
      independentSupport: I,
      contradictionWeight: C,
      supportScore: Math.round(Math.max(0, Math.min(1, (S - C) / 3)) * 100) / 100,
      status,
      label: STATUS_LABEL[status],
      conflicting: S >= 1 && C >= 1,
      active: status !== 'evidence_against' && S >= 1,
    } satisfies Assessment
  })
  const rank = (a: Assessment) =>
    a.status === 'evidence_for'
      ? 0
      : a.active
        ? 1
        : a.status === 'possible'
          ? 2
          : a.status === 'unverified'
            ? 3
            : 4
  ranked.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.supports.length - a.supports.length ||
      a.contradictionWeight - b.contradictionWeight ||
      HYPOTHESIS_CODES.indexOf(a.code) - HYPOTHESIS_CODES.indexOf(b.code),
  )
  const active = ranked.filter((a) => a.active).map((a) => a.code)
  const wrongAnswers = observations.filter((o) => o.learnerAnswer !== o.truth).length
  const supported = ranked.filter((a) => a.status === 'evidence_for')
  const summary: Summary = !observations.length
    ? 'no-evidence'
    : wrongAnswers === 0
      ? 'no-mix-up-seen'
      : supported.length === 1
        ? 'might-be'
        : supported.length > 1
          ? 'several-possible'
          : active.length && ranked.some((a) => a.active && a.conflicting)
            ? 'conflicting'
            : active.length
              ? 'investigating'
              : 'none-supported'
  return {
    candidates,
    observations,
    ranked,
    active,
    wrongAnswers,
    slipPossible: wrongAnswers <= 1,
    summary,
    headline: headline(summary, ranked, active.length),
  }
}

/** G6 headline written for 9–13 year olds; always acknowledges uncertainty. */
function headline(summary: Summary, ranked: Assessment[], activeCount: number) {
  const top = ranked[0]
  switch (summary) {
    case 'no-evidence':
      return 'No answers yet, so there is nothing to explain.'
    case 'no-mix-up-seen':
      return 'Every answer so far matched the real robot, so there is no mix-up to look for.'
    case 'might-be':
      return `Your answers point to one possible mix-up: ${top!.entry.title.toLowerCase()}. It is still only a possibility. The experiment will test it.`
    case 'several-possible':
      return 'Your answers fit more than one possible mix-up. The next experiment can help tell them apart.'
    case 'conflicting':
      return 'Still investigating: some of your answers point in different directions. Let’s try an example that is quite different.'
    case 'investigating':
      return activeCount > 1
        ? `Your answers suggest ${activeCount} possible mix-ups. This next question can help us tell them apart.`
        : 'One idea fits so far, but one answer is not enough. Let’s check with a different example.'
    case 'none-supported':
      return 'None of the mix-ups we know about explains your answers. Maybe it was a slip! We need another example.'
  }
}

/* ---------- which hypotheses are relevant to a scenario (G3 step 2) ---------- */
function walk(program: Program) {
  const f = {
    orderCompare: false,
    distance: false,
    color: false,
    ifElse: false,
    repeat: false,
    whileLoop: false,
    fn: false,
    set: false,
    move: false,
  }
  const expr = (e: Expression) => {
    if (e.kind === 'compare' && ['<', '<=', '>', '>='].includes(e.op)) f.orderCompare = true
    if (e.kind === 'sensor') f[e.sensor === 'distance' ? 'distance' : 'color'] = true
    if ('left' in e) {
      expr(e.left)
      expr(e.right)
    }
    if (e.kind === 'not' || e.kind === 'detected') expr(e.operand)
  }
  const stmts = (body: Statement[]) => {
    for (const s of body) {
      if (s.kind === 'move') f.move = true
      if (s.kind === 'if') {
        expr(s.condition)
        if (s.else.length) f.ifElse = true
        stmts(s.then)
        stmts(s.else)
      }
      if (s.kind === 'repeat') {
        f.repeat = true
        stmts(s.body)
      }
      if (s.kind === 'while') {
        f.whileLoop = true
        expr(s.condition)
        stmts(s.body)
      }
      if (s.kind === 'function') {
        f.fn = true
        stmts(s.body)
      }
      if (s.kind === 'set') {
        f.set = true
        expr(s.value)
      }
      if (s.kind === 'inspect') expr(s.expression)
    }
  }
  stmts(program.body)
  return f
}
/** Only hypotheses whose concept actually appears in this world/program are candidates. */
export function relevantHypotheses(world: World, program: Program): HypothesisCode[] {
  const f = walk(program)
  const obstacle = world.obstacles.some((o) => o.solid)
  const on: Record<HypothesisCode, boolean> = {
    SENSOR_IS_ACTION: f.move && (f.distance || obstacle),
    SENSOR_RANGE_REVERSED: f.distance && f.move,
    COMPARATOR_DIRECTION: f.orderCompare,
    STRICT_VS_INCLUSIVE: f.orderCompare,
    ELSE_EXECUTES_TOO: f.ifElse,
    ELSE_NEVER: f.ifElse,
    SENSOR_NULL_ZERO: f.distance,
    COLOR_LOCATION: f.color,
    LOOP_COUNT: f.repeat,
    WHILE_PRETEST: f.whileLoop,
    FUNCTION_DEFINITION_EXECUTES: f.fn,
    FUNCTION_CALL_SKIPPED: f.fn,
    VARIABLE_STALE_VALUE: f.set,
    MOVEMENT_VS_SENSOR_REFRESH: (f.distance || f.color) && (f.whileLoop || f.repeat),
  }
  return HYPOTHESIS_CODES.filter((c) => on[c])
}

/** Every model's answer for one scenario, computed by execution. */
export function predict(
  key: string,
  world: World,
  program: Program,
  question: QuestionKind,
  models: readonly ModelCode[],
  variable?: string,
): { truth: string; predictions: Partial<Record<ModelCode, string>> } | null {
  const truthRun = runModel(key, world, program, NO_MISCONCEPTION)
  if (!truthIsClean(truthRun)) return null
  const predictions: Partial<Record<ModelCode, string>> = {}
  for (const m of models)
    predictions[m] = observe(question, runModel(key, world, program, m), variable)
  return { truth: observe(question, truthRun, variable), predictions }
}

/* ---------------------------- probe selection (G3 step 4) ---------------------------- */
export interface ProbeChoice {
  probe: GeneratedProbe
  groups: { answer: string; models: ModelCode[] }[]
  separatedPairs: number
  score: number
  /** G6: why this question, in kid language (full sentence and structured parts). */
  why: string
  whyParts: { lead: string; ideas: { ideas: string[]; expect: string }[]; truth: string }
}
export const MAX_PROBES = 3
const partition = (probe: GeneratedProbe, models: ModelCode[]) => {
  const groups = new Map<string, ModelCode[]>()
  for (const m of models) {
    const a = probe.predictions[m]
    groups.set(a, [...(groups.get(a) ?? []), m])
  }
  return [...groups.entries()].map(([answer, ms]) => ({ answer, models: ms }))
}
const signature = (g: { models: ModelCode[] }[]) =>
  g
    .map((x) => [...x.models].sort().join('+'))
    .sort()
    .join('|')

/** Picks the probe whose predicted answers best split the still-plausible ideas
 * (plus "it was just a slip"). Deterministic: ties break on simplicity, then id. */
export function selectNextProbe(
  state: DiagnosisState,
  opts: {
    asked: readonly string[]
    skipped?: readonly string[]
    preferLike?: string
    voluntary?: boolean
  } = {
    asked: [],
  },
): ProbeChoice | null {
  // Never quiz a learner whose committed answers all matched the real robot, unless they
  // chose to investigate (a first-action prediction cannot reveal every idea, e.g. loop counts).
  if (state.wrongAnswers === 0 && !opts.voluntary) return null
  const asked = new Set(opts.asked)
  // One extra question is allowed only to untangle conflicting or tied evidence.
  const limit =
    state.summary === 'conflicting' || state.summary === 'several-possible'
      ? MAX_PROBES + 1
      : MAX_PROBES
  if (asked.size >= limit) return null
  const supported = state.ranked.filter((a) => a.status === 'evidence_for')
  if (supported.length === 1 && state.active.length === 1 && !state.slipPossible) return null
  let focus = state.active
  if (!focus.length)
    focus = state.ranked.filter((a) => a.status !== 'evidence_against').map((a) => a.code)
  if (!focus.length) return null
  const models: ModelCode[] = [...focus, NO_MISCONCEPTION]
  const top = focus[0]!
  const usedTemplates = new Set(state.observations.map((o) => o.independenceKey))
  const needsIndependent = new Set(
    state.ranked.filter((a) => a.active && a.independentSupport === 1).map((a) => a.code),
  )
  const liked = opts.preferLike ? buildProbe(opts.preferLike) : null
  const likedSignature = liked ? signature(partition(liked, models)) : null
  let best: ProbeChoice | null = null
  for (const id of ALL_PROBE_IDS) {
    if (asked.has(id) || opts.skipped?.includes(id)) continue
    const probe = buildProbe(id)
    if (!probe) continue
    const groups = partition(probe, models)
    if (groups.length < 2) continue
    let separated = 0
    for (let i = 0; i < models.length; i++)
      for (let j = i + 1; j < models.length; j++) {
        const a = models[i]!,
          b = models[j]!
        if (probe.predictions[a] === probe.predictions[b]) continue
        separated +=
          a === top || b === top ? 2 : a === NO_MISCONCEPTION || b === NO_MISCONCEPTION ? 1.5 : 1
      }
    let score = separated * 10 - probe.choices.length + 2 - PROBE_SIMPLICITY(probe)
    if (!usedTemplates.has(probe.template)) {
      score += 3
      if (state.summary === 'conflicting') score += 4
    }
    if ([...needsIndependent].some((h) => probe.predictions[h] !== probe.truth)) score += 3
    if (likedSignature && signature(groups) === likedSignature) score += 1000
    if (!best || score > best.score || (score === best.score && id < best.probe.id))
      best = {
        probe,
        groups,
        separatedPairs: separated,
        score,
        why: '',
        whyParts: { lead: '', ideas: [], truth: '' },
      }
  }
  if (!best) return null
  best.whyParts = whyParts(best, state)
  best.why = `${best.whyParts.lead} This question gives different answers for different ideas: ${best.whyParts.ideas.map((i) => `if the mix-up were ${i.ideas.join(' or ')}, you would expect ${i.expect}`).join('; ')}. Someone who understands it would expect ${best.whyParts.truth}. Whatever you pick, it’s evidence, not a grade.`
  return best
}
const PROBE_SIMPLICITY = (p: GeneratedProbe) =>
  ({
    'first-action': 0,
    compare: 0,
    'reading-change': 0,
    'color-read': 0,
    'distance-read': 0,
    variable: 0,
    'turn-count': 1,
    'distance-travelled': 1,
    'move-count': 1,
    branch: 1,
    ending: 2,
  })[p.question]

/** G6 "Why are you asking?" — names the ideas this question separates and what each
 * would answer, using the computed predictions. */
function whyParts(choice: ProbeChoice, state: DiagnosisState): ProbeChoice['whyParts'] {
  const p = choice.probe
  const ideas = choice.groups
    .filter((g) => g.models.some((m) => m !== NO_MISCONCEPTION))
    .map((g) => ({
      ideas: g.models
        .filter((m): m is HypothesisCode => m !== NO_MISCONCEPTION)
        .map((m) => TAXONOMY[m].title.toLowerCase()),
      expect: say(p, g.answer),
    }))
  const lead =
    state.active.length > 1
      ? `Your earlier answer fits ${state.active.length} different ideas.`
      : state.active.length === 1
        ? 'One idea fits your earlier answer, but one answer is not enough to be sure.'
        : 'We don’t have a good explanation yet, so we’re trying a different kind of example.'
  return { lead, ideas, truth: say(p, p.truth) }
}

/* --------------------------- observations from stored data --------------------------- */
export function probeObservation(
  answerId: string,
  probeId: string,
  choiceId: string,
): Observation | null {
  const probe = buildProbe(probeId)
  if (!probe) return null
  const answer =
    [...new Set(Object.values(probe.predictions))].find(
      (a) => a.replace(/[^\w.-]/g, '_') === choiceId,
    ) ?? (probe.choices.some((c) => c.id === choiceId) ? choiceId : null)
  if (answer === null) return null
  return {
    answerId,
    source: 'probe',
    independenceKey: probe.template,
    scenarioKey: probe.id,
    question: probe.question,
    situation: probe.situation,
    learnerAnswer: answer,
    truth: probe.truth,
    predictions: probe.predictions,
    labels: probe.labels,
  }
}
/** The learner's committed mission prediction as the first observation. */
export function missionObservation(input: {
  answerId: string
  missionId: string
  key: string
  world: World
  program: Program
  predictedAction: string
  uncertain?: boolean
}): Observation | null {
  if (input.uncertain) return null
  const models = [...relevantHypotheses(input.world, input.program)]
  const p = predict(input.key, input.world, input.program, 'first-action', models)
  if (!p) return null
  return {
    answerId: input.answerId,
    source: 'mission',
    independenceKey: `mission:${input.missionId}`,
    scenarioKey: input.key,
    question: 'first-action',
    situation: 'your mission prediction',
    learnerAnswer: input.predictedAction,
    truth: p.truth,
    predictions: p.predictions,
  }
}
/** The optional "will the condition be true or false?" part of the same prediction. It shares
 * the mission's independence key: two answers given at one moment are not independent. */
export function missionBranchObservation(input: {
  answerId: string
  missionId: string
  key: string
  world: World
  program: Program
  predictedBranch: 'then' | 'else' | null
  uncertain?: boolean
}): Observation | null {
  if (input.uncertain || !input.predictedBranch) return null
  if (!input.program.body.some((s) => s.kind === 'if')) return null
  const models = relevantHypotheses(input.world, input.program)
  const p = predict(input.key, input.world, input.program, 'branch', models)
  if (!p || (p.truth !== 'then' && p.truth !== 'else')) return null
  return {
    answerId: input.answerId,
    source: 'mission',
    independenceKey: `mission:${input.missionId}`,
    scenarioKey: `${input.key}#branch`,
    question: 'branch',
    situation: 'your branch prediction',
    learnerAnswer: input.predictedBranch,
    truth: p.truth,
    predictions: p.predictions,
  }
}

/** Converts a ranked assessment into the C3 `Hypothesis` contract with hashed provenance
 * (EvidenceItem.answerId points at the exact stored answer). */
export async function hypothesisRecords(
  state: DiagnosisState,
): Promise<import('../domain/types').Hypothesis[]> {
  const { stableHash, opaqueId } = await import('../domain/invariants')
  const byId = new Map(state.observations.map((o) => [o.answerId, o]))
  const item = async (code: HypothesisCode, n: EvidenceNote) => {
    const o = byId.get(n.answerId)!
    return {
      schemaVersion: 1 as const,
      id: opaqueId(),
      answerId: n.answerId,
      traceHash: await stableHash({ scenario: o.scenarioKey, truth: o.truth }),
      scenarioHash: await stableHash(o.scenarioKey),
      hypothesisId: code,
      direction: n.direction,
      weight: n.weight,
      ruleReason: n.reason,
    }
  }
  return Promise.all(
    state.ranked.map(async (a) => ({
      schemaVersion: 1 as const,
      code: a.code,
      title: a.entry.title,
      learnerText: a.entry.learnerText,
      evidence: await Promise.all(a.supports.map((n) => item(a.code, n))),
      contradictions: await Promise.all(a.contradictions.map((n) => item(a.code, n))),
      status: a.status,
      supportScore: a.supportScore,
      nextProbeId: null,
    })),
  )
}

/** Part H mission-specific second question (e.g. "how many turns?") committed with the
 * prediction. Same moment as the first answer, so it shares the mission independence key. */
export function missionDetailObservation(input: {
  answerId: string
  missionId: string
  key: string
  world: World
  program: Program
  detail: { question: string; answer: string } | undefined
  prompt: string
  uncertain?: boolean
}): Observation | null {
  if (input.uncertain || !input.detail) return null
  const question = input.detail.question as QuestionKind
  const p = predict(
    input.key,
    input.world,
    input.program,
    question,
    relevantHypotheses(input.world, input.program),
  )
  if (!p || p.truth === 'none') return null
  return {
    answerId: input.answerId,
    source: 'mission',
    independenceKey: `mission:${input.missionId}`,
    scenarioKey: `${input.key}#detail`,
    question,
    situation: `your answer to “${input.prompt}”`,
    learnerAnswer: input.detail.answer,
    truth: p.truth,
    predictions: p.predictions,
  }
}

/** Answer options for a second question: the real answer mixed with what every idea would
 * predict (plus neighbours for counts), so the option list never gives the answer away. */
export function detailChoices(key: string, world: World, program: Program, question: QuestionKind) {
  const p = predict(key, world, program, question, HYPOTHESIS_CODES)
  if (!p || p.truth === 'none') return []
  const answers = new Set(
    [p.truth, ...Object.values(p.predictions)].filter((a) => a !== 'error' && a !== 'none'),
  )
  const numeric = [...answers].every((a) => /^\d+(\.\d+)?$/.test(a))
  if (numeric) {
    const n = Number(p.truth)
    for (const extra of [n - 1, n + 1]) if (extra >= 0) answers.add(String(extra))
  }
  return [...answers]
    .sort((a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b)))
    .map((a) => ({ id: a, label: answerLabel(question, a) }))
}
