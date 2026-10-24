import type { Program, World } from '../domain/types'
import {
  OP_WORDS,
  colorLit,
  compare,
  distance,
  floor,
  lineWorld,
  lit,
  move,
  program,
  stop,
  turn,
  wallWorld,
} from './scenarios'
import { ALL_MODELS, observe, runModel, truthIsClean, type QuestionKind } from './mental-models'
import { NO_MISCONCEPTION, type HypothesisCode, type ModelCode } from './taxonomy'

/** Part G1/G2 diagnostic probes. A probe is a tiny scenario plus one question. Its
 * correct answer and every hypothesis' expected answer are produced by executing the
 * scenario under each mental model — they are never typed in by hand. Probe ids encode
 * the template and parameters (`g.<template>.<param>`), so a saved answer can always be
 * re-checked by rebuilding the exact scenario. */
interface Built {
  world: World
  program: Program
  prompt: string
  situation: string
  labels?: Record<string, string>
  variable?: string
}
export interface ProbeTemplate {
  id: string
  question: QuestionKind
  /** Hypotheses the template was designed for (documentation; discrimination is computed). */
  designedFor: HypothesisCode[]
  /** 0 = simplest. Used only as a tie-breaker so easier questions come first. */
  simplicity: number
  params: string[]
  hint: string
  build(param: string): Built
}

const ifStopElseMove = (op: '<' | '<=' | '>' | '>=', threshold: number) =>
  program('probe-branch', [
    {
      nodeId: 'decision',
      kind: 'if',
      condition: compare('condition', op, distance(), lit('threshold', threshold)),
      then: [stop('stop-close')],
      else: [move('move-on', 10), stop('stop-done')],
    },
  ])
const turnOrMove = program('probe-else', [
  {
    nodeId: 'decision',
    kind: 'if',
    condition: compare('condition', '<', distance(), lit('threshold', 20)),
    then: [turn('then-turn', 90)],
    else: [move('else-move', 10)],
  },
])
const nullGuard = program('probe-null', [
  {
    nodeId: 'decision',
    kind: 'if',
    condition: {
      nodeId: 'guard',
      kind: 'boolean',
      type: 'boolean',
      op: 'and',
      left: { nodeId: 'detected', kind: 'detected', type: 'boolean', operand: distance() },
      right: compare('close', '<', distance('distance-2'), lit('threshold', 20)),
    },
    then: [stop('stop-close')],
    else: [move('move-on', 10)],
  },
])
const helperDefinition = (angle: number) => ({
  nodeId: 'define-helper',
  kind: 'function' as const,
  name: 'helper',
  body: [turn('helper-turn', angle), move('helper-move', 5)],
})
const limitProgram = (first: number, second: number) =>
  program('probe-variable', [
    { nodeId: 'set-first', kind: 'set', name: 'limit', value: lit('first', first) },
    { nodeId: 'set-second', kind: 'set', name: 'limit', value: lit('second', second) },
    {
      nodeId: 'decision',
      kind: 'if',
      condition: compare('condition', '<', distance(), {
        nodeId: 'limit-ref',
        kind: 'variable',
        type: 'number',
        name: 'limit',
      }),
      then: [stop('stop-close')],
      else: [move('move-on', 10)],
    },
  ])
const approach = program('probe-approach', [
  {
    nodeId: 'approach',
    kind: 'while',
    condition: compare('room', '>', distance(), lit('threshold', 20)),
    body: [move('step', 5)],
  },
  stop('stop-safe'),
])
const opText = { '<': '<', '<=': '<=', '>': '>', '>=': '>=' } as const

export const PROBE_TEMPLATES: ProbeTemplate[] = [
  {
    id: 'branch-at',
    question: 'first-action',
    designedFor: ['COMPARATOR_DIRECTION', 'SENSOR_IS_ACTION', 'ELSE_EXECUTES_TOO', 'ELSE_NEVER'],
    simplicity: 0,
    params: ['10-lt', '12-lt', '8-gt', '30-lt', '40-gt', '16-lt'],
    hint: 'Read the number first. Then ask: is the comparison true or false?',
    build(param) {
      const [d, op] = param.split('-') as [string, string]
      const o = OP_WORDS[op] as '<' | '>'
      return {
        world: wallWorld(Number(d)),
        program: ifStopElseMove(o, 20),
        situation: `the ${d} cm example with “distance ${o} 20”`,
        prompt: `The sensor reads ${d} cm. The program says: if distance ${o} 20 → stop, otherwise → move 10 cm. What does the robot do first?`,
      }
    },
  },
  {
    id: 'compare-numbers',
    question: 'compare',
    designedFor: ['COMPARATOR_DIRECTION', 'STRICT_VS_INCLUSIVE'],
    simplicity: 0,
    params: ['10-lt-20', '30-lt-20', '30-gt-20', '10-gt-20', '20-lt-20', '20-gt-20'],
    hint: 'Say it out loud: “is the left number smaller than the right number?”',
    build(param) {
      const [a, op, b] = param.split('-') as [string, string, string]
      const o = OP_WORDS[op]!
      return {
        world: wallWorld(null),
        program: program('probe-compare', [
          {
            nodeId: 'decision',
            kind: 'if',
            condition: compare('condition', o, lit('left', Number(a)), lit('right', Number(b))),
            then: [turn('then-turn', 90)],
            else: [move('else-move', 10)],
          },
        ]),
        situation: `the “${a} ${o} ${b}” question`,
        prompt: `No sensors this time, just numbers. Is “${a} ${o} ${b}” true or false?`,
      }
    },
  },
  {
    id: 'equality-sensor',
    question: 'first-action',
    designedFor: ['STRICT_VS_INCLUSIVE'],
    simplicity: 1,
    params: ['lt', 'gt'],
    hint: 'When both numbers are equal, only <= and >= are true.',
    build(param) {
      const o = OP_WORDS[param] as '<' | '>'
      return {
        world: wallWorld(20),
        program: ifStopElseMove(o, 20),
        situation: `the “20 ${opText[o]} 20” example`,
        prompt: `The sensor reads exactly 20 cm. If distance ${o} 20 → stop, otherwise → move 10 cm. What does the robot do first?`,
      }
    },
  },
  {
    id: 'move-only',
    question: 'first-action',
    designedFor: ['SENSOR_IS_ACTION'],
    simplicity: 0,
    params: ['24', '28'],
    hint: 'Look for a stop block. Is there one?',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: program('probe-move-only', [move('only-move', 10)]),
        situation: `the move-only program with a wall ${param} cm away`,
        prompt: `A wall is ${param} cm away. The whole program is one block: move forward 10 cm. There is no stop block. What does the robot do first?`,
      }
    },
  },
  {
    id: 'drive-to-wall',
    question: 'ending',
    designedFor: ['SENSOR_IS_ACTION'],
    simplicity: 2,
    params: ['20', '25'],
    hint: 'A sensor measures. Only a block or a physical bump can stop the robot.',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: program('probe-drive', [move('long-move', 40)]),
        situation: `the “move 40 cm toward a wall ${param} cm away” example`,
        prompt: `A wall is ${param} cm away. The program only says: move forward 40 cm. How does this run end?`,
        labels: {
          collision: 'It drives until it bumps into the wall',
          stop: 'The sensor stops it before the wall',
          finished: 'It finishes all 40 cm',
        },
      }
    },
  },
  {
    id: 'which-branch',
    question: 'branch',
    designedFor: ['ELSE_EXECUTES_TOO', 'ELSE_NEVER', 'COMPARATOR_DIRECTION'],
    simplicity: 1,
    params: ['40', '10', '60'],
    hint: 'An if/else is a fork in the road: the robot takes exactly one path.',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: turnOrMove,
        situation: `the ${param} cm turn-or-move example`,
        prompt: `The sensor reads ${param} cm. If distance < 20 → turn 90°, otherwise → move 10 cm. Which part of the program runs?`,
        labels: {
          then: 'Only the “if” part (turn)',
          else: 'Only the “otherwise” part (move)',
          both: 'Both parts',
          neither: 'Neither part',
        },
      }
    },
  },
  {
    id: 'else-path',
    question: 'first-action',
    designedFor: ['ELSE_EXECUTES_TOO', 'ELSE_NEVER'],
    simplicity: 0,
    params: ['60', '45'],
    hint: 'When the condition is false, look at the “otherwise” part.',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: turnOrMove,
        situation: `the ${param} cm “otherwise” example`,
        prompt: `The sensor reads ${param} cm. If distance < 20 → turn 90°, otherwise → move 10 cm. What does the robot do first?`,
      }
    },
  },
  {
    id: 'null-guard',
    question: 'first-action',
    designedFor: ['SENSOR_NULL_ZERO'],
    simplicity: 1,
    params: ['empty', 'far'],
    hint: '“Is detected” is false when nothing is within the sensor’s range.',
    build(param) {
      return {
        world: wallWorld(param === 'empty' ? null : 120),
        program: nullGuard,
        situation: param === 'empty' ? 'the empty-room example' : 'the wall-out-of-range example',
        prompt: `${param === 'empty' ? 'There is no wall in front of the robot at all.' : 'The only wall is 120 cm away, but the sensor can only see 100 cm.'} If (distance is detected AND distance < 20) → stop, otherwise → move 10 cm. What does the robot do first?`,
      }
    },
  },
  {
    id: 'null-reading',
    question: 'distance-read',
    designedFor: ['SENSOR_NULL_ZERO'],
    simplicity: 0,
    params: ['empty', 'far'],
    hint: 'The sensor can only see 100 cm in these rooms.',
    build(param) {
      return {
        world: wallWorld(param === 'empty' ? null : 120),
        program: program('probe-null-read', [
          {
            nodeId: 'decision',
            kind: 'if',
            condition: {
              nodeId: 'detected',
              kind: 'detected',
              type: 'boolean',
              operand: distance(),
            },
            then: [turn('then-turn', 90)],
            else: [move('else-move', 10)],
          },
        ]),
        situation: param === 'empty' ? 'the empty-room reading' : 'the 120 cm-away reading',
        prompt: `${param === 'empty' ? 'Nothing is in front of the robot.' : 'The wall is 120 cm away and the sensor only reaches 100 cm.'} What does the distance sensor report?`,
        labels: { none: 'No reading: nothing within range', '0': '0 cm' },
      }
    },
  },
  {
    id: 'color-read',
    question: 'color-read',
    designedFor: ['COLOR_LOCATION'],
    simplicity: 0,
    params: ['12', '20'],
    hint: 'The color sensor looks straight down at the floor under it.',
    build(param) {
      return {
        world: lineWorld(Number(param)),
        program: program('probe-color-read', [
          {
            nodeId: 'decision',
            kind: 'if',
            condition: compare('is-black', '==', floor(), colorLit('black', 'black')),
            then: [stop('stop-line')],
            else: [move('move-on', 5)],
          },
        ]),
        situation: `the black line ${param} cm ahead`,
        prompt: `The robot is on white floor. A black line is ${param} cm ahead of the color sensor. What color does the floor sensor report right now?`,
      }
    },
  },
  {
    id: 'color-ahead',
    question: 'first-action',
    designedFor: ['COLOR_LOCATION'],
    simplicity: 1,
    params: ['12', '20'],
    hint: 'Find the small sensor spot under the robot. What color is the floor there?',
    build(param) {
      return {
        world: lineWorld(Number(param)),
        program: program('probe-color-act', [
          {
            nodeId: 'decision',
            kind: 'if',
            condition: compare('is-black', '==', floor(), colorLit('black', 'black')),
            then: [stop('stop-line')],
            else: [move('move-on', 5)],
          },
        ]),
        situation: `the line-${param}-cm-ahead decision`,
        prompt: `A black line is ${param} cm ahead; the robot is on white. If floor color = black → stop, otherwise → move 5 cm. What does the robot do first?`,
      }
    },
  },
  {
    id: 'repeat-turns',
    question: 'turn-count',
    designedFor: ['LOOP_COUNT'],
    simplicity: 0,
    params: ['3', '2', '4'],
    hint: 'Count on your fingers: one time, two times…',
    build(param) {
      return {
        world: wallWorld(null),
        program: program('probe-repeat', [
          {
            nodeId: 'laps',
            kind: 'repeat',
            count: lit('count', Number(param)),
            body: [move('side', 5), turn('corner', 90)],
          },
          stop(),
        ]),
        situation: `“repeat ${param}: move, turn”`,
        prompt: `Repeat ${param} times: move 5 cm, turn 90°. Then stop. How many turns does the robot make?`,
      }
    },
  },
  {
    id: 'repeat-distance',
    question: 'distance-travelled',
    designedFor: ['LOOP_COUNT'],
    simplicity: 1,
    params: ['2', '3'],
    hint: 'Each time through the loop adds 10 cm.',
    build(param) {
      return {
        world: wallWorld(null),
        program: program('probe-repeat-distance', [
          {
            nodeId: 'laps',
            kind: 'repeat',
            count: lit('count', Number(param)),
            body: [move('step', 10)],
          },
          stop(),
        ]),
        situation: `“repeat ${param}: move 10 cm”`,
        prompt: `Repeat ${param} times: move 10 cm. How far does the robot travel in total?`,
      }
    },
  },
  {
    id: 'while-start-false',
    question: 'first-action',
    designedFor: ['WHILE_PRETEST'],
    simplicity: 1,
    params: ['10', '15'],
    hint: 'A while loop asks its question before doing anything inside.',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: program('probe-while', [
          {
            nodeId: 'loop',
            kind: 'while',
            condition: compare('room', '>', distance(), lit('threshold', 20)),
            body: [move('step', 2)],
          },
          stop('stop-after'),
        ]),
        situation: `the while loop starting at ${param} cm`,
        prompt: `The sensor reads ${param} cm. While distance > 20 → move 2 cm. After the loop → stop. What does the robot do first?`,
      }
    },
  },
  {
    id: 'while-start-black',
    question: 'first-action',
    designedFor: ['WHILE_PRETEST'],
    simplicity: 1,
    params: ['black', 'red'],
    hint: 'Check the floor color before the first move.',
    build(param) {
      const c = param as 'black' | 'red'
      return {
        world: lineWorld(0, c, true),
        program: program('probe-while-color', [
          {
            nodeId: 'loop',
            kind: 'while',
            condition: compare('on-white', '==', floor(), colorLit('white', 'white')),
            body: [move('step', 1)],
          },
          stop('stop-after'),
        ]),
        situation: `the robot starting on ${c}`,
        prompt: `The robot starts on a ${c} tile. While floor color = white → move 1 cm. After the loop → stop. What does the robot do first?`,
      }
    },
  },
  {
    id: 'helper-defined',
    question: 'first-action',
    designedFor: ['FUNCTION_DEFINITION_EXECUTES'],
    simplicity: 0,
    params: ['90', '45'],
    hint: 'A definition is a recipe card. Is there a call block that uses it?',
    build(param) {
      return {
        world: wallWorld(null),
        program: program('probe-define', [
          helperDefinition(Number(param)),
          move('main-move', 10),
          stop(),
        ]),
        situation: 'the helper that is defined but never called',
        prompt: `The program defines a helper (turn ${param}°, move 5 cm), then says move 10 cm and stop. There is no call block. What does the robot do first?`,
      }
    },
  },
  {
    id: 'helper-called',
    question: 'turn-count',
    designedFor: ['FUNCTION_DEFINITION_EXECUTES', 'FUNCTION_CALL_SKIPPED'],
    simplicity: 1,
    params: ['1', '2'],
    hint: 'Count call blocks. Each call runs the helper once.',
    build(param) {
      const calls = Number(param)
      return {
        world: wallWorld(null),
        program: program('probe-call', [
          { nodeId: 'define-spin', kind: 'function', name: 'spin', body: [turn('spin-turn', 90)] },
          ...Array.from({ length: calls }, (_, i) => ({
            nodeId: `call-${i}`,
            kind: 'call' as const,
            name: 'spin',
          })),
          stop(),
        ]),
        situation: `the spin helper called ${calls === 1 ? 'once' : 'twice'}`,
        prompt: `The program defines “spin” (turn 90°), then has ${calls === 1 ? 'one call block' : 'two call blocks'} for spin, then stop. How many turns happen?`,
      }
    },
  },
  {
    id: 'helper-skip',
    question: 'first-action',
    designedFor: ['FUNCTION_CALL_SKIPPED'],
    simplicity: 0,
    params: ['90', '180'],
    hint: 'A call jumps into the helper first, then comes back.',
    build(param) {
      return {
        world: wallWorld(null),
        program: program('probe-call-order', [
          {
            nodeId: 'define-spin',
            kind: 'function',
            name: 'spin',
            body: [turn('spin-turn', Number(param))],
          },
          { nodeId: 'call-spin', kind: 'call', name: 'spin' },
          move('after-call', 10),
          stop(),
        ]),
        situation: 'the call-then-move example',
        prompt: `The program defines “spin” (turn ${param}°). Then: call spin, move 10 cm, stop. What does the robot do first?`,
      }
    },
  },
  {
    id: 'variable-branch',
    question: 'first-action',
    designedFor: ['VARIABLE_STALE_VALUE'],
    simplicity: 1,
    params: ['10-30', '30-10'],
    hint: 'Open the Variables tab in your head: what is the newest value?',
    build(param) {
      const [a, b] = param.split('-').map(Number) as [number, number]
      return {
        world: wallWorld(24),
        program: limitProgram(a, b),
        situation: `the limit = ${a} then ${b} example`,
        prompt: `The sensor reads 24 cm. Set limit to ${a}. Then set limit to ${b}. If distance < limit → stop, otherwise → move 10 cm. What does the robot do first?`,
      }
    },
  },
  {
    id: 'variable-value',
    question: 'variable',
    designedFor: ['VARIABLE_STALE_VALUE'],
    simplicity: 0,
    params: ['10-30', '30-10'],
    hint: 'A new set block replaces the old value.',
    build(param) {
      const [a, b] = param.split('-').map(Number) as [number, number]
      return {
        world: wallWorld(24),
        program: limitProgram(a, b),
        situation: `the limit = ${a} then ${b} value`,
        prompt: `Set limit to ${a}. Then set limit to ${b}. What number is stored in limit when the if block checks it?`,
        variable: 'limit',
      }
    },
  },
  {
    id: 'approach-loop',
    question: 'ending',
    designedFor: ['MOVEMENT_VS_SENSOR_REFRESH', 'SENSOR_RANGE_REVERSED'],
    simplicity: 2,
    params: ['40', '50'],
    hint: 'The sensor is read again each time the loop checks its condition.',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: approach,
        situation: `the “while distance > 20” loop starting at ${param} cm`,
        prompt: `The sensor starts at ${param} cm. While distance > 20 → move 5 cm. After the loop → stop. How does this run end?`,
        labels: {
          stop: 'The loop ends and the stop block runs',
          collision: 'It keeps going until it bumps into the wall',
          'never-ends': 'The loop never ends',
        },
      }
    },
  },
  {
    id: 'reading-change',
    question: 'reading-change',
    designedFor: ['MOVEMENT_VS_SENSOR_REFRESH', 'SENSOR_RANGE_REVERSED'],
    simplicity: 0,
    params: ['40', '60'],
    hint: 'Distance means “how far away”. Driving toward the wall…',
    build(param) {
      return {
        world: wallWorld(Number(param)),
        program: program('probe-reading', [move('toward', 10)]),
        situation: `driving 10 cm toward a wall ${param} cm away`,
        prompt: `The sensor reads ${param} cm. The robot moves 10 cm straight toward the wall. What happens to the distance reading?`,
      }
    },
  },
]

const ACTION_LABEL: Record<string, string> = {
  move: 'It moves forward',
  stop: 'It stops / stays still',
  turn: 'It turns',
  wait: 'It waits',
  error: 'The program stops with an error',
}
const KIND_LABEL: Partial<Record<QuestionKind, Record<string, string>>> = {
  'first-action': ACTION_LABEL,
  compare: { true: 'True', false: 'False' },
  'reading-change': {
    smaller: 'The number gets smaller',
    bigger: 'The number gets bigger',
    same: 'The number stays the same',
  },
  ending: {
    stop: 'A stop block ends it',
    collision: 'It bumps into the wall',
    finished: 'It finishes its blocks',
    'never-ends': 'It never ends',
  },
  branch: {
    then: 'Only the “if” part',
    else: 'Only the “otherwise” part',
    both: 'Both parts',
    neither: 'Neither part',
  },
}
/** Extra fixed choices so a question never reveals the answer by having one option. */
const BASE_CHOICES: Record<QuestionKind, string[]> = {
  'first-action': ['move', 'stop'],
  branch: ['then', 'else'],
  compare: ['true', 'false'],
  'reading-change': ['smaller', 'bigger', 'same'],
  ending: ['stop', 'collision'],
  'turn-count': [],
  'move-count': [],
  'distance-travelled': [],
  'color-read': ['white', 'black'],
  'distance-read': ['none', '0'],
  variable: [],
}
/** Wraps a label in quotes unless it already contains quoted words. */
export const quote = (label: string) => (label.includes('“') ? label : `“${label}”`)
export function answerLabel(
  question: QuestionKind,
  answer: string,
  labels?: Record<string, string>,
) {
  const fixed = labels?.[answer] ?? KIND_LABEL[question]?.[answer]
  if (fixed) return fixed
  if (question === 'turn-count') return `${answer} turn${answer === '1' ? '' : 's'}`
  if (question === 'move-count') return `${answer} move${answer === '1' ? '' : 's'}`
  if (question === 'distance-travelled' || question === 'distance-read') return `${answer} cm`
  return answer
}

export interface GeneratedProbe {
  id: string
  template: string
  param: string
  question: QuestionKind
  variable?: string
  world: World
  program: Program
  prompt: string
  situation: string
  hint: string
  truth: string
  predictions: Record<ModelCode, string>
  choices: { id: string; label: string }[]
  labels?: Record<string, string>
}

const built = new Map<string, GeneratedProbe | null>()
/** Rebuilds a probe from its id. Returns null for unknown ids or scenarios whose truth
 * run does not end cleanly (those are never asked). Deterministic and memoized. */
export function buildProbe(id: string): GeneratedProbe | null {
  if (built.has(id)) return built.get(id)!
  const [, template, param] = /^g\.([a-z-]+)\.([\w-]+)$/.exec(id) ?? []
  const t = PROBE_TEMPLATES.find((x) => x.id === template)
  if (!t || !param || !t.params.includes(param)) {
    built.set(id, null)
    return null
  }
  const b = t.build(param)
  const truthRun = runModel(id, b.world, b.program, NO_MISCONCEPTION)
  if (!truthIsClean(truthRun)) {
    built.set(id, null)
    return null
  }
  const predictions = Object.fromEntries(
    ALL_MODELS.map((m) => [
      m,
      observe(t.question, runModel(id, b.world, b.program, m), b.variable),
    ]),
  ) as Record<ModelCode, string>
  const truth = predictions[NO_MISCONCEPTION]
  const answers = [...new Set([...BASE_CHOICES[t.question], ...Object.values(predictions)])].filter(
    (a) => a !== 'error' || a === truth,
  )
  const numeric = answers.every((a) => /^\d+(\.\d+)?$/.test(a))
  answers.sort((a, b) => (numeric ? Number(a) - Number(b) : 0))
  const probe: GeneratedProbe = {
    id,
    template: t.id,
    param,
    question: t.question,
    variable: b.variable,
    world: b.world,
    program: b.program,
    prompt: b.prompt,
    situation: b.situation,
    hint: t.hint,
    truth,
    predictions,
    labels: b.labels,
    choices: answers.map((a) => ({
      id: a.replace(/[^\w.-]/g, '_'),
      label: answerLabel(t.question, a, b.labels),
    })),
  }
  built.set(id, probe)
  return probe
}
export const ALL_PROBE_IDS = PROBE_TEMPLATES.flatMap((t) => t.params.map((p) => `g.${t.id}.${p}`))
/** Choice ids are answers with only id-safe characters; this maps them back. */
export const choiceAnswer = (probe: GeneratedProbe, choiceId: string) =>
  [...new Set(Object.values(probe.predictions))].find(
    (a) => a.replace(/[^\w.-]/g, '_') === choiceId,
  ) ?? (probe.choices.some((c) => c.id === choiceId) ? choiceId : null)
