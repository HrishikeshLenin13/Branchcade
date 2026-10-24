import type { Counterexample, Expression, Program, Statement, World } from '../domain/types'
import { WorldSchema } from '../domain/schemas'
import { stableHash, opaqueId } from '../domain/invariants'
import { readSensors } from '../engine/sensors'
import { initialRobot } from '../engine/robot'
import { execute } from '../interpreter/interpreter'
import { runModel, observe, truthIsClean, type QuestionKind } from './mental-models'
import { answerLabel, quote } from './probe-templates'
import { NO_MISCONCEPTION, TAXONOMY, type HypothesisCode, type ModelCode } from './taxonomy'

/** Part G4 counterexample synthesis — a search, not a hint bank.
 *
 * Input: the learner's own mission world + program and the hypotheses still in play.
 * 1. Enumerate legal ONE-parameter edits (obstacle distance, threshold, comparator,
 *    colors, repeat count, call/definition toggle, variable value).
 * 2. Validate the edited world/program with the real schemas.
 * 3. Execute the edited scenario with the authoritative semantics and under every
 *    candidate mental model; read one observable answer from each run.
 * 4. Discard edits where the models agree, the true run errors/never ends, the outcome
 *    would look ambiguous (equal-looking readings, or a physical bump that could be
 *    mistaken for an automatic sensor stop).
 * 5. Rank by discrimination, then simple round numbers, then closeness to the original,
 *    with the candidate key as a deterministic tie-breaker.
 * If nothing survives the bounded search, a typed "no candidate" result explains why. */
export type CxField =
  | 'obstacle-distance'
  | 'threshold'
  | 'comparator'
  | 'floor-color'
  | 'loop-count'
  | 'function-call'
  | 'variable-value'
export interface Edit {
  field: CxField
  target: string
  value: string
}
export interface CxCandidate extends Edit {
  key: string
  before: string
  world: World
  program: Program
  question: QuestionKind
  truth: string
  baselineTruth: string
  predictions: Partial<Record<ModelCode, string>>
  separatedPairs: number
  score: number
}
export interface CxSearch {
  ranked: CxCandidate[]
  examined: number
  rejected: { key: string; reason: string }[]
  noCandidateReason: string | null
}
export const SEARCH_BUDGET = 80
const DISTANCES = [10, 19, 20, 21, 24, 30, 40, 60]
const ORDER_OPS = ['<', '<=', '>', '>='] as const
const COLORS_TRIED = ['white', 'black', 'red'] as const

type Visit = (s: Statement, parent: Statement[]) => void
function eachStatement(body: Statement[], visit: Visit) {
  for (const s of body) {
    visit(s, body)
    if (s.kind === 'if') {
      eachStatement(s.then, visit)
      eachStatement(s.else, visit)
    }
    if (s.kind === 'repeat' || s.kind === 'while' || s.kind === 'function')
      eachStatement(s.body, visit)
  }
}
function eachExpression(program: Program, visit: (e: Expression) => void) {
  const expr = (e: Expression) => {
    visit(e)
    if ('left' in e) {
      expr(e.left)
      expr(e.right)
    }
    if (e.kind === 'not' || e.kind === 'detected') expr(e.operand)
  }
  eachStatement(program.body, (s) => {
    if (s.kind === 'if' || s.kind === 'while') expr(s.condition)
    if (s.kind === 'repeat') expr(s.count)
    if (s.kind === 'set') expr(s.value)
    if (s.kind === 'move') expr(s.distance)
    if (s.kind === 'turn') expr(s.angle)
  })
}

/** The obstacle the front sensor sees at the start, if it is a movable solid. */
function seenObstacle(world: World) {
  const s = readSensors(world, initialRobot(world))
  const o = world.obstacles.find((x) => x.id === s.ray.hitId)
  return o && s.distanceCm !== null ? { obstacle: o, reading: s.distanceCm } : null
}

/** Enumerates candidate single-parameter edits for this scenario (bounded, ordered). */
export function candidateEdits(world: World, program: Program): (Edit & { before: string })[] {
  const out: (Edit & { before: string })[] = []
  const seen = seenObstacle(world)
  if (seen)
    for (const d of DISTANCES)
      if (Math.abs(d - seen.reading) > 0.5)
        out.push({
          field: 'obstacle-distance',
          target: seen.obstacle.id,
          value: String(d),
          before: String(Math.round(seen.reading * 10) / 10),
        })
  const reading = seen?.reading ?? null
  eachExpression(program, (e) => {
    if (e.kind !== 'compare') return
    if (e.right.kind === 'literal' && typeof e.right.value === 'number') {
      const now = e.right.value
      const centre = e.left.kind === 'sensor' && reading !== null ? Math.round(reading) : now
      for (const v of [centre, centre - 1, centre + 1, centre - 5, centre + 5])
        if (v !== now && v >= 0 && v <= 300)
          out.push({
            field: 'threshold',
            target: e.right.nodeId,
            value: String(v),
            before: String(now),
          })
    }
    if ((ORDER_OPS as readonly string[]).includes(e.op))
      for (const op of ORDER_OPS)
        if (op !== e.op)
          out.push({ field: 'comparator', target: e.nodeId, value: op, before: e.op })
    if (e.right.kind === 'literal' && e.right.type === 'color')
      for (const c of COLORS_TRIED)
        if (c !== e.right.value)
          out.push({
            field: 'floor-color',
            target: e.right.nodeId,
            value: c,
            before: String(e.right.value),
          })
  })
  for (const z of world.floorZones)
    for (const c of COLORS_TRIED)
      if (c !== z.color)
        out.push({ field: 'floor-color', target: `zone:${z.id}`, value: c, before: z.color })
  eachStatement(program.body, (s) => {
    if (s.kind === 'repeat' && s.count.kind === 'literal' && typeof s.count.value === 'number')
      for (const n of [1, 2, 3, 4, 5])
        if (n !== s.count.value)
          out.push({
            field: 'loop-count',
            target: s.count.nodeId,
            value: String(n),
            before: String(s.count.value),
          })
    if (s.kind === 'set' && s.value.kind === 'literal' && typeof s.value.value === 'number') {
      const now = s.value.value
      for (const v of [now - 10, now - 5, now + 5, now + 10])
        if (v >= 0)
          out.push({
            field: 'variable-value',
            target: s.value.nodeId,
            value: String(v),
            before: String(now),
          })
    }
  })
  const fns = program.body.filter((s) => s.kind === 'function')
  let calls = 0
  eachStatement(program.body, (s) => {
    if (s.kind === 'call') calls++
  })
  if (fns.length)
    out.push({
      field: 'function-call',
      target: fns[0]!.kind === 'function' ? fns[0]!.name : '',
      value: calls ? 'definition-only' : 'with-call',
      before: calls ? 'with-call' : 'definition-only',
    })
  return out
}

const clone = <T>(x: T): T => structuredClone(x)
/** Applies one edit and validates the result. Returns null for an illegal scenario. */
export function applyEdit(
  world: World,
  program: Program,
  edit: Edit,
): { world: World; program: Program } | null {
  const w = clone(world),
    p = clone(program)
  const num = Number(edit.value)
  switch (edit.field) {
    case 'obstacle-distance': {
      const seen = seenObstacle(w)
      if (!seen || seen.obstacle.id !== edit.target || !Number.isFinite(num) || num < 1) return null
      const r = (w.spawn.headingDeg * Math.PI) / 180,
        shift = num - seen.reading
      seen.obstacle.position = {
        xCm: Math.round((seen.obstacle.position.xCm + Math.cos(r) * shift) * 1000) / 1000,
        yCm: Math.round((seen.obstacle.position.yCm + Math.sin(r) * shift) * 1000) / 1000,
      }
      const checked = WorldSchema.safeParse(w)
      if (!checked.success) return null
      const now = readSensors(checked.data, initialRobot(checked.data))
      if (now.ray.hitId !== edit.target || Math.abs((now.distanceCm ?? -1) - num) > 0.01)
        return null
      return { world: checked.data, program: p }
    }
    case 'floor-color':
      if (edit.target.startsWith('zone:')) {
        const z = w.floorZones.find((x) => `zone:${x.id}` === edit.target)
        if (!z || !(COLORS_TRIED as readonly string[]).includes(edit.value)) return null
        z.color = edit.value as (typeof COLORS_TRIED)[number]
        const checked = WorldSchema.safeParse(w)
        return checked.success ? { world: checked.data, program: p } : null
      }
      break
    case 'function-call': {
      if (edit.value === 'definition-only') {
        const strip = (body: Statement[]): Statement[] =>
          body
            .filter((s) => s.kind !== 'call')
            .map((s) =>
              s.kind === 'if'
                ? { ...s, then: strip(s.then), else: strip(s.else) }
                : s.kind === 'repeat' || s.kind === 'while' || s.kind === 'function'
                  ? { ...s, body: strip(s.body) }
                  : s,
            )
        p.body = strip(p.body)
      } else {
        const at = p.body.findLastIndex((s) => s.kind === 'function') + 1
        p.body.splice(at, 0, { nodeId: 'cx-call', kind: 'call', name: edit.target })
      }
      return { world: w, program: p }
    }
  }
  let found = false
  const visit = (e: Expression) => {
    if (e.nodeId !== edit.target) return
    if (
      edit.field === 'comparator' &&
      e.kind === 'compare' &&
      (ORDER_OPS as readonly string[]).includes(edit.value)
    ) {
      e.op = edit.value as (typeof ORDER_OPS)[number]
      found = true
    } else if (
      (edit.field === 'threshold' ||
        edit.field === 'loop-count' ||
        edit.field === 'variable-value') &&
      e.kind === 'literal' &&
      typeof e.value === 'number' &&
      Number.isFinite(num)
    ) {
      e.value = num
      found = true
    } else if (edit.field === 'floor-color' && e.kind === 'literal' && e.type === 'color') {
      e.value = edit.value as (typeof COLORS_TRIED)[number]
      found = true
    }
  }
  eachExpression(p, visit)
  return found ? { world: w, program: p } : null
}

const QUESTIONS: QuestionKind[] = [
  'first-action',
  'branch',
  'turn-count',
  'ending',
  'distance-travelled',
]
const pairs = (
  models: ModelCode[],
  answers: Partial<Record<ModelCode, string>>,
  top?: ModelCode,
) => {
  let n = 0
  for (let i = 0; i < models.length; i++)
    for (let j = i + 1; j < models.length; j++)
      if (answers[models[i]!] !== answers[models[j]!])
        n += models[i] === top || models[j] === top ? 2 : 1
  return n
}

/** Runs the bounded search. `targets` are the hypotheses still in play (most likely first);
 * an empty list asks for a transparent generic experiment that changes the true outcome. */
export function searchCounterexamples(
  base: { key: string; world: World; program: Program },
  targets: HypothesisCode[],
  budget = SEARCH_BUDGET,
): CxSearch {
  const models: ModelCode[] = [...targets, NO_MISCONCEPTION]
  const rejected: CxSearch['rejected'] = []
  const ranked: CxCandidate[] = []
  const edits = candidateEdits(base.world, base.program).slice(0, budget)
  const baseTruthRun = runModel(base.key, base.world, base.program, NO_MISCONCEPTION)
  for (const edit of edits) {
    const key = `${edit.field}.${edit.target}.${edit.value}`
    const scenario = applyEdit(base.world, base.program, edit)
    if (!scenario) {
      rejected.push({ key, reason: 'illegal world or program after the edit' })
      continue
    }
    const runKey = `${base.key}|cx|${key}`
    const truthRun = runModel(runKey, scenario.world, scenario.program, NO_MISCONCEPTION)
    if (!truthIsClean(truthRun)) {
      rejected.push({ key, reason: 'the real program errors or never ends' })
      continue
    }
    const near = truthRun.result.events.some((e) => {
      const [a, b] = e.evaluation?.operands ?? []
      return (
        e.kind === 'compare' &&
        typeof a === 'number' &&
        typeof b === 'number' &&
        a !== b &&
        Math.abs(a - b) < 0.05
      )
    })
    if (near) {
      rejected.push({ key, reason: 'the reading and threshold would look equal on screen' })
      continue
    }
    if (
      targets.includes('SENSOR_IS_ACTION') &&
      truthRun.result.events.some((e) => e.kind === 'collision')
    ) {
      rejected.push({
        key,
        reason: 'a physical bump could be mistaken for an automatic sensor stop',
      })
      continue
    }
    let best: CxCandidate | null = null
    for (const question of QUESTIONS) {
      if (
        question === 'branch' &&
        !truthRun.result.events.some(
          (e) => e.kind === 'branch' && e.facts.some((f) => /branch selected/.test(f)),
        )
      )
        continue
      const predictions: Partial<Record<ModelCode, string>> = {}
      for (const m of models)
        predictions[m] = observe(question, runModel(runKey, scenario.world, scenario.program, m))
      const truth = predictions[NO_MISCONCEPTION]!
      const baselineTruth = observe(question, baseTruthRun)
      const informative = targets.length
        ? targets.some((t) => predictions[t] !== truth)
        : truth !== baselineTruth
      if (!informative) continue
      const separated = pairs(models, predictions, targets[0])
      const numeric = Number(edit.value)
      const simple = Number.isFinite(numeric)
        ? numeric % 10 === 0
          ? 2
          : numeric % 5 === 0
            ? 1
            : 0
        : 1
      const distanceFromOriginal =
        Number.isFinite(numeric) && Number.isFinite(Number(edit.before))
          ? Math.abs(numeric - Number(edit.before)) / 10
          : 0.5
      const score =
        separated * 10 +
        (targets[0] && predictions[targets[0]] !== truth ? 10 : 0) +
        (truth !== baselineTruth ? 3 : 0) +
        simple -
        distanceFromOriginal -
        QUESTIONS.indexOf(question) * 0.5
      if (!best || score > best.score)
        best = {
          ...edit,
          key,
          world: scenario.world,
          program: scenario.program,
          question,
          truth,
          baselineTruth,
          predictions,
          separatedPairs: separated,
          score,
        }
    }
    if (best) ranked.push(best)
    else
      rejected.push({
        key,
        reason: targets.length
          ? 'every candidate idea predicts the same result'
          : 'the true result does not change',
      })
  }
  ranked.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
  return {
    ranked,
    examined: edits.length,
    rejected,
    noCandidateReason: ranked.length
      ? null
      : `No single-change experiment within the ${edits.length}-edit search could separate these ideas (${rejected.length} edits rejected). Try a fresh example instead.`,
  }
}

const FIELD_WORDS: Record<CxField, (c: Edit & { before: string }) => string> = {
  'obstacle-distance': (c) => `move the wall from ${c.before} cm to ${c.value} cm away`,
  threshold: (c) => `change the number in the comparison from ${c.before} to ${c.value}`,
  comparator: (c) => `change the comparison from “${c.before}” to “${c.value}”`,
  'floor-color': (c) => `change a color from ${c.before} to ${c.value}`,
  'loop-count': (c) => `change the repeat count from ${c.before} to ${c.value}`,
  'function-call': (c) =>
    c.value === 'with-call'
      ? 'add a call block for the helper'
      : 'remove the call block and keep only the definition',
  'variable-value': (c) => `change the variable’s value from ${c.before} to ${c.value}`,
}
export const describeEdit = (c: Edit & { before: string }) => FIELD_WORDS[c.field](c)

/** G6 rationale: what changes, what each idea expects, and why this example was picked. */
export function explainCandidate(c: CxCandidate, targets: HypothesisCode[]) {
  const label = (a: string) => quote(answerLabel(c.question, a))
  const ideas = targets
    .filter((t) => c.predictions[t] !== undefined)
    .map(
      (t) =>
        `if the mix-up were ${TAXONOMY[t].title.toLowerCase()}, you would expect ${label(c.predictions[t]!)}`,
    )
  return `Let’s change just one thing: ${describeEdit(c)}. ${ideas.length ? `This example was picked because the ideas disagree: ${ideas.join('; ')}. ` : 'This changes what the real robot does, so you can test your rule. '}Predict first, then run it. The real simulator decides, and it’s still just one example.`
}

/** Serializable record for the attempt/experiment view (validated by CounterexampleSchema). */
export async function toCounterexample(
  base: { world: World; program: Program },
  search: CxSearch,
  targets: HypothesisCode[],
  index = 0,
): Promise<Counterexample> {
  const c = search.ranked[index]
  if (!c)
    return {
      schemaVersion: 1,
      id: opaqueId(),
      changedParameters: [],
      baselineTrace: [],
      changedTrace: [],
      targetHypotheses: targets,
      modelOutcomes: [],
      rationale: search.noCandidateReason ?? 'No experiment found.',
      validationChecksum: await stableHash([]),
      noCandidateReason: search.noCandidateReason ?? 'No experiment found.',
      question: 'first-action',
      edit: null,
    }
  const baseline = execute(base.world, base.program),
    changed = execute(c.world, c.program)
  return {
    schemaVersion: 1,
    id: opaqueId(),
    changedParameters: [{ field: c.field, target: c.target, before: c.before, after: c.value }],
    baselineTrace: baseline.events,
    changedTrace: changed.events,
    targetHypotheses: targets,
    modelOutcomes: Object.entries(c.predictions).map(([hypothesisId, answer]) => ({
      hypothesisId,
      answer: answer!,
    })),
    rationale: explainCandidate(c, targets),
    validationChecksum: await stableHash({ baseline: baseline.events, changed: changed.events }),
    noCandidateReason: null,
    question: c.question,
    edit: { field: c.field, target: c.target, value: c.value },
  }
}

/** Kept for existing callers: change the first comparison threshold of a program. */
export function changedThreshold(program: Program, value: number): Program {
  const p = structuredClone(program)
  const first = p.body[0]
  if (
    first?.kind === 'if' &&
    first.condition.kind === 'compare' &&
    first.condition.right.kind === 'literal'
  )
    first.condition.right.value = value
  return p
}
