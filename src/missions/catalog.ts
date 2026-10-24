import type { Program } from '../domain/types'
import { MissionSchema } from '../domain/schemas'
import { makeWorld } from '../engine/world'
export function thresholdProgram(threshold = 20): Program {
  return {
    schemaVersion: 1,
    id: 'threshold-program',
    body: [
      {
        nodeId: 'decision',
        kind: 'if',
        condition: {
          nodeId: 'condition',
          type: 'boolean',
          kind: 'compare',
          op: '<',
          left: { nodeId: 'sensor', type: 'number', kind: 'sensor', sensor: 'distance' },
          right: { nodeId: 'threshold', type: 'number', kind: 'literal', value: threshold },
        },
        then: [{ nodeId: 'stop-close', kind: 'stop' }],
        else: [
          {
            nodeId: 'move-clear',
            kind: 'move',
            distance: { nodeId: 'travel', type: 'number', kind: 'literal', value: 10 },
          },
          { nodeId: 'stop-done', kind: 'stop' },
        ],
      },
    ],
  }
}
export const FIRST_MISSION = MissionSchema.parse({
  schemaVersion: 1,
  id: 'm01',
  version: 2,
  title: 'The Wall Problem',
  conceptGoals: ['conditionals', 'distance-sensors'],
  prerequisiteIds: [],
  world: makeWorld(),
  starterProgram: thresholdProgram(),
  // v2 (Part H): a correct programmed stop before the wall in two different scenarios.
  // A physical bump never counts as the stop.
  successPredicate: [
    { kind: 'branch', expected: false },
    { kind: 'distance', minCm: 9.9 },
    { kind: 'programmed-stop' },
    { kind: 'final-distance', minCm: 5 },
  ],
  successScenarios: [
    {
      id: 'close-wall',
      label: 'wall 12 cm away',
      world: makeWorld(12),
      goals: [
        { kind: 'branch', expected: true },
        { kind: 'programmed-stop' },
        { kind: 'final-distance', minCm: 5 },
      ],
    },
  ],
  failureExplanation: 'Inspect the reading and the comparison before choosing a branch.',
  variants: [{ id: 'transfer', world: makeWorld(32), program: thresholdProgram(35) }],
  roleEvidenceAssignments: [
    { role: 'predictor', task: 'Predict the selected branch before the run' },
    { role: 'trace-reader', task: 'Read the actual operands from the trace' },
  ],
  targetCompletionSteps: 7,
  recommendedProbeIds: ['compare-rule', 'sensor-action'],
})
FIRST_MISSION.variants.push(
  { id: 'practice-2', world: makeWorld(18), program: thresholdProgram(15) },
  { id: 'practice-3', world: makeWorld(42), program: thresholdProgram(45) },
)
export const MISSION_CATALOG = [FIRST_MISSION]

/** Authored activity metadata; time values are estimates, never learner measurements. */
export const MISSION_META: Record<
  string,
  {
    objective: string
    difficulty: 'Foundations' | 'Intermediate' | 'Challenge'
    estimatedMinutes: number
    hints: string[]
  }
> = {
  m01: {
    objective: 'Use the measured distance to explain which branch runs.',
    difficulty: 'Foundations',
    estimatedMinutes: 6,
    hints: [
      'Look at the reading before the program moves.',
      'A comparison chooses one branch; the sensor only measures.',
      'For a different example, 18 < 15 is false.',
    ],
  },
  m02: {
    objective: 'Stop by program instruction when the floor sensor reaches black.',
    difficulty: 'Foundations',
    estimatedMinutes: 8,
    hints: [
      'Watch the color under the center of the robot.',
      'The while condition is checked before each small move.',
      'A white reading can keep a loop moving until black.',
    ],
  },
  m03: {
    objective: 'Repair the reversed comparison so the close robot stays safely stopped.',
    difficulty: 'Foundations',
    estimatedMinutes: 8,
    hints: [
      'Compare the two operands in their written order.',
      'Read the condition aloud: distance is less than threshold.',
      'At equality, < is false and <= is true.',
    ],
  },
  m04: {
    objective: 'Repair the repeat count to finish three sides of a square at the goal.',
    difficulty: 'Intermediate',
    estimatedMinutes: 10,
    hints: [
      'Count completed move-turn pairs in the timeline.',
      'Each repetition changes heading by 90 degrees.',
      'Four sides returns to the start; three ends at the remaining corner.',
    ],
  },
  m05: {
    objective: 'Keep moving while the wall is far, then issue a safe programmed stop.',
    difficulty: 'Intermediate',
    estimatedMinutes: 10,
    hints: [
      'The distance must be read again after movement.',
      'The condition should be true while there is room to move.',
      'Small steps approach a target reading without relying on collision.',
    ],
  },
  m06: {
    objective: 'Call the helper and reach the corner; defining it alone is not enough.',
    difficulty: 'Intermediate',
    estimatedMinutes: 10,
    hints: [
      'Find a call event in the timeline.',
      'A definition stores instructions; a call executes them.',
      'The helper moves, turns, then moves again.',
    ],
  },
  m07: {
    objective: 'Use AND so a close wall alone does not count as a black-floor signal.',
    difficulty: 'Challenge',
    estimatedMinutes: 12,
    hints: [
      'Read both the distance and floor color.',
      'AND needs both conditions; OR needs at least one.',
      'Try a white floor with a near wall to separate the two operators.',
    ],
  },
  m08: {
    objective: 'Trace the variable and function call, then repair the route decision.',
    difficulty: 'Challenge',
    estimatedMinutes: 14,
    hints: [
      'Inspect the actual value of safeDistance.',
      'Find the branch that calls the helper.',
      'The goal needs both the helper call and a northward move.',
    ],
  },
}
const number = (nodeId: string, value: number): import('../domain/types').Expression => ({
  nodeId,
  kind: 'literal',
  type: 'number',
  value,
})
const move = (id: string, distance: number): import('../domain/types').Statement => ({
  nodeId: id,
  kind: 'move',
  distance: number(`${id}-distance`, distance),
})
const turn = (id: string, angle: number): import('../domain/types').Statement => ({
  nodeId: id,
  kind: 'turn',
  angle: number(`${id}-angle`, angle),
})
const stop = (id = 'finish'): import('../domain/types').Statement => ({ nodeId: id, kind: 'stop' })
const emptyWorld = (id: string) => ({ ...makeWorld(), id, obstacles: [] })
const colorWorld = (lineX = 60, widthCm = 8) => ({
  ...emptyWorld(widthCm === 8 ? `line-${lineX}` : `line-${lineX}-w${widthCm}`),
  floorZones: [
    {
      id: 'black-line',
      kind: 'rectangle' as const,
      position: { xCm: lineX, yCm: 20 },
      widthCm,
      heightCm: 60,
      color: 'black' as const,
      priority: 1,
    },
  ],
})
function colorProgram(): Program {
  return {
    schemaVersion: 1,
    id: 'line-stop',
    body: [
      {
        nodeId: 'follow-white',
        kind: 'while',
        condition: {
          nodeId: 'on-white',
          kind: 'compare',
          type: 'boolean',
          op: '==',
          left: { nodeId: 'floor-color', kind: 'sensor', sensor: 'color', type: 'color' },
          right: { nodeId: 'white', kind: 'literal', type: 'color', value: 'white' },
        },
        body: [move('line-step', 1)],
      },
      stop(),
    ],
  }
}
/** M02 v2 starter: drives a fixed distance and never looks at the floor sensor. */
export function blindLineProgram(): Program {
  return {
    schemaVersion: 1,
    id: 'line-stop-starter',
    body: [
      {
        nodeId: 'blind-drive',
        kind: 'repeat',
        count: number('blind-count', 30),
        body: [move('blind-step', 1)],
      },
      stop(),
    ],
  }
}
export function lapProgram(count: number): Program {
  return {
    schemaVersion: 1,
    id: 'square-route',
    body: [
      {
        nodeId: 'laps',
        kind: 'repeat',
        count: number('lap-count', count),
        body: [move('side', 10), turn('corner', 90)],
      },
      stop(),
    ],
  }
}
export function approachProgram(op: '>' | '<' = '>'): Program {
  return {
    schemaVersion: 1,
    id: 'safe-approach',
    body: [
      {
        nodeId: 'approach-loop',
        kind: 'while',
        condition: {
          nodeId: 'room-to-move',
          kind: 'compare',
          type: 'boolean',
          op,
          left: { nodeId: 'distance-reading', kind: 'sensor', sensor: 'distance', type: 'number' },
          right: number('safe-distance', 12),
        },
        body: [move('approach-step', 2)],
      },
      stop(),
    ],
  }
}
export function helperProgram(call: boolean): Program {
  return {
    schemaVersion: 1,
    id: 'helper-route',
    body: [
      {
        nodeId: 'helper-definition',
        kind: 'function',
        name: 'goCorner',
        body: [move('helper-forward', 10), turn('helper-turn', 90), move('helper-north', 10)],
      },
      ...(call ? [{ nodeId: 'invoke-helper', kind: 'call' as const, name: 'goCorner' }] : []),
      stop(),
    ],
  }
}
function compositeProgram(op: 'and' | 'or'): Program {
  const p = thresholdProgram()
  const decision = p.body[0]!
  if (decision.kind === 'if')
    decision.condition = {
      nodeId: 'both-signals',
      kind: 'boolean',
      type: 'boolean',
      op,
      left: decision.condition,
      right: {
        nodeId: 'black-check',
        kind: 'compare',
        type: 'boolean',
        op: '==',
        left: { nodeId: 'floor-reading', kind: 'sensor', type: 'color', sensor: 'color' },
        right: { nodeId: 'black-value', kind: 'literal', type: 'color', value: 'black' },
      },
    }
  return { ...p, id: 'two-sensors' }
}
function mysteryProgram(value: number): Program {
  return {
    schemaVersion: 1,
    id: 'mystery-route',
    body: [
      {
        nodeId: 'set-safe',
        kind: 'set',
        name: 'safeDistance',
        value: number('safe-constant', value),
      },
      {
        nodeId: 'define-escape',
        kind: 'function',
        name: 'escape',
        body: [turn('escape-turn', 90), move('escape-move', 10)],
      },
      {
        nodeId: 'route-decision',
        kind: 'if',
        condition: {
          nodeId: 'route-condition',
          kind: 'compare',
          type: 'boolean',
          op: '<',
          left: { nodeId: 'route-distance', kind: 'sensor', sensor: 'distance', type: 'number' },
          right: {
            nodeId: 'safe-variable',
            kind: 'variable',
            name: 'safeDistance',
            type: 'number',
          },
        },
        then: [{ nodeId: 'call-escape', kind: 'call', name: 'escape' }],
        else: [move('wrong-route', 10)],
      },
      stop(),
    ],
  }
}
const authored = (
  id: string,
  title: string,
  world: import('../domain/types').World,
  starter: Program,
  goals: import('../domain/types').Goal[],
  concepts: string[],
  reference: Program,
  variants?: { world: import('../domain/types').World; program: Program }[],
  options: {
    version?: number
    successScenarios?: import('../domain/types').Mission['successScenarios']
    capstone?: boolean
    extraVariants?: { id: string; world: import('../domain/types').World; program: Program }[]
  } = {},
) =>
  MissionSchema.parse({
    schemaVersion: 1,
    id,
    version: options.version ?? 1,
    ...(options.successScenarios ? { successScenarios: options.successScenarios } : {}),
    ...(options.capstone ? { capstone: true } : {}),
    title,
    conceptGoals: concepts,
    prerequisiteIds: [],
    world,
    starterProgram: starter,
    successPredicate: goals,
    failureExplanation: MISSION_META[id]!.objective,
    variants: (
      variants ??
      [1, 2, 3].map((n) => ({
        world: {
          ...world,
          id: `${id}-variant-${n}`,
          spawn: {
            ...world.spawn,
            position: { xCm: world.spawn.position.xCm, yCm: world.spawn.position.yCm + n * 2 },
          },
        },
        program: reference,
      }))
    )
      .map((v, i) => ({ id: i === 0 ? 'transfer' : `practice-${i}`, ...v }))
      // Part H appends new variants after the v1 ones so earlier transfer records still match.
      .concat(options.extraVariants ?? []),
    roleEvidenceAssignments: [
      { role: 'predictor', task: 'Predict the first physical action' },
      { role: 'trace-reader', task: 'Explain the actual decisive event' },
    ],
    targetCompletionSteps: 7,
    recommendedProbeIds: id === 'm03' ? ['compare-rule'] : [],
  })
const extraMissions = [
  authored(
    'm02',
    'Black Line Stop',
    colorWorld(),
    blindLineProgram(),
    // v2: the stop block must run within 2 ticks of the floor-sensor footprint reaching
    // black (not when the drawn robot touches the stripe), here and on a thin far line.
    [
      { kind: 'color-stop-within', color: 'black', ticks: 2 },
      { kind: 'programmed-stop' },
      { kind: 'reach', position: { xCm: 60, yCm: 50 }, toleranceCm: 1 },
    ],
    ['color-sensors', 'conditionals', 'loops'],
    colorProgram(),
    [62, 65, 68].map((x) => ({ world: colorWorld(x), program: colorProgram() })),
    {
      version: 2,
      successScenarios: [
        {
          id: 'thin-line',
          label: 'thin line 30 cm ahead',
          world: colorWorld(70, 4),
          goals: [
            { kind: 'color-stop-within', color: 'black', ticks: 2 },
            { kind: 'programmed-stop' },
          ],
        },
      ],
      extraVariants: [{ id: 'practice-3', world: colorWorld(74, 4), program: colorProgram() }],
    },
  ),
  authored(
    'm03',
    'Wrong-Way Branch',
    makeWorld(12),
    (() => {
      const p = thresholdProgram()
      const s = p.body[0]!
      if (s.kind === 'if' && s.condition.kind === 'compare') s.condition.op = '>'
      return p
    })(),
    // v2: the repaired comparison must pick the right branch in three placements,
    // including the equality case where < and <= disagree.
    [
      { kind: 'branch', expected: true },
      { kind: 'programmed-stop' },
      { kind: 'reach', position: { xCm: 40, yCm: 50 }, toleranceCm: 0.1 },
    ],
    ['comparisons', 'conditionals', 'debugging'],
    thresholdProgram(),
    [10, 16, 20].map((d) => ({ world: makeWorld(d), program: thresholdProgram(d + 1) })),
    {
      version: 2,
      successScenarios: [
        {
          id: 'equal-wall',
          label: 'wall exactly 20 cm away',
          world: makeWorld(20),
          goals: [{ kind: 'branch', expected: false }, { kind: 'programmed-stop' }],
        },
        {
          id: 'far-wall',
          label: 'wall 30 cm away',
          world: makeWorld(30),
          goals: [{ kind: 'branch', expected: false }, { kind: 'programmed-stop' }],
        },
      ],
    },
  ),
  authored(
    'm04',
    'The Extra Lap',
    emptyWorld('three-sides'),
    lapProgram(4),
    // v2: three corners in order, exactly three loop iterations. Overshooting (4 laps
    // returns to the start) or hand-copying the moves without a loop does not pass.
    [
      { kind: 'reach', position: { xCm: 40, yCm: 60 }, toleranceCm: 0.1 },
      { kind: 'event', eventKind: 'turn', count: 3 },
      { kind: 'heading', headingDeg: 270, toleranceDeg: 0.1 },
      { kind: 'event', eventKind: 'repeat_iteration', count: 3 },
      {
        kind: 'path',
        points: [
          { xCm: 50, yCm: 50 },
          { xCm: 50, yCm: 60 },
          { xCm: 40, yCm: 60 },
        ],
        toleranceCm: 0.5,
      },
    ],
    ['loops', 'debugging'],
    lapProgram(3),
    undefined,
    { version: 2 },
  ),
  authored(
    'm05',
    'The Loop That Never Ends',
    makeWorld(44),
    approachProgram('<'),
    // v2: controlled loop termination with a safe stopping band, from two start distances.
    [
      { kind: 'programmed-stop' },
      { kind: 'final-distance', minCm: 10, maxCm: 14 },
      { kind: 'distance', minCm: 31.9 },
      { kind: 'reach', position: { xCm: 72, yCm: 50 }, toleranceCm: 0.1 },
    ],
    ['distance-sensors', 'loops', 'comparisons'],
    approachProgram(),
    undefined,
    {
      version: 2,
      successScenarios: [
        {
          id: 'far-start',
          label: 'wall 60 cm away',
          world: makeWorld(60),
          goals: [{ kind: 'programmed-stop' }, { kind: 'final-distance', minCm: 10, maxCm: 14 }],
        },
      ],
    },
  ),
  authored(
    'm06',
    'Call the Helper',
    emptyWorld('helper-corner'),
    helperProgram(false),
    // v2: any call block counts (a learner-built call gets a new node id); copying the
    // helper's moves by hand reaches the corner but triggers the concept check.
    [
      { kind: 'event', eventKind: 'call', count: 1 },
      { kind: 'reach', position: { xCm: 50, yCm: 60 }, toleranceCm: 0.1 },
      { kind: 'programmed-stop' },
    ],
    ['functions', 'debugging'],
    helperProgram(true),
    undefined,
    { version: 2 },
  ),
  authored(
    'm07',
    'Color & Distance',
    makeWorld(12),
    compositeProgram('or'),
    [
      { kind: 'branch', nodeId: 'decision', expected: false },
      { kind: 'distance', minCm: 9.9 },
    ],
    ['color-sensors', 'distance-sensors', 'conditionals'],
    compositeProgram('and'),
  ),
  authored(
    'm08',
    'Mystery Malfunction',
    makeWorld(32),
    mysteryProgram(20),
    [
      { kind: 'event', eventKind: 'call', nodeId: 'call-escape', count: 1 },
      { kind: 'reach', position: { xCm: 40, yCm: 60 }, toleranceCm: 0.1 },
      { kind: 'heading', headingDeg: 90, toleranceDeg: 0.1 },
    ],
    ['functions', 'conditionals', 'debugging'],
    mysteryProgram(35),
  ),
]
MISSION_CATALOG.push(...extraMissions)
export const REFERENCE_PROGRAMS: Record<string, Program> = {
  m01: thresholdProgram(),
  m02: colorProgram(),
  m03: thresholdProgram(),
  m04: lapProgram(3),
  m05: approachProgram(),
  m06: helperProgram(true),
  m07: compositeProgram('and'),
  m08: mysteryProgram(35),
}
export function findMission(slug: string | undefined) {
  return MISSION_CATALOG.find((mission) => mission.id === slug)
}
