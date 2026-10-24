import { z } from 'zod'
import type { Expression, Statement, Program } from '../interpreter/ast'
import { COLORS, LIMITS } from './constants'
import { WorldSchema as LegacyWorldSchema } from '../interpreter/legacy/world-schema'

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[\w.-]+$/)
const text = z.string().max(2000)
const n = z.number().finite().min(-1_000_000).max(1_000_000)
const positive = n.gt(0)
const nonnegative = n.min(0)
const tick = z.number().int().min(0).max(1_000_000)
const v = z.literal(1)
const time = z.iso.datetime()
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const color = z.enum(COLORS)
const value = z.union([n, z.boolean(), color, z.null()])
const variables = z
  .record(id, value)
  .refine((x) => Object.keys(x).length <= 100, 'Too many variables')
export const Vec2Schema = z.strictObject({ xCm: n, yCm: n })
export const ObstacleSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id,
    kind: z.literal('rectangle'),
    position: Vec2Schema,
    widthCm: positive,
    heightCm: positive,
    solid: z.boolean(),
    material: z.enum(['wood', 'metal', 'foam']),
  }),
  z.strictObject({
    id,
    kind: z.literal('circle'),
    position: Vec2Schema,
    radiusCm: positive.min(1),
    solid: z.boolean(),
    material: z.enum(['wood', 'metal', 'foam']),
  }),
])
export const FloorZoneSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id,
    kind: z.literal('rectangle'),
    position: Vec2Schema,
    widthCm: positive,
    heightCm: positive,
    color,
    priority: tick,
  }),
  z.strictObject({
    id,
    kind: z.literal('polygon'),
    points: z.array(Vec2Schema).min(3).max(64),
    color,
    priority: tick,
  }),
])
export const GoalSchema = z.discriminatedUnion('kind', [
  /** Without nodeId: the first if/else decision of whatever program the learner wrote. */
  z.strictObject({ kind: z.literal('branch'), nodeId: id.optional(), expected: z.boolean() }),
  z.strictObject({ kind: z.literal('distance'), minCm: nonnegative }),
  z.strictObject({ kind: z.literal('reach'), position: Vec2Schema, toleranceCm: positive }),
  z.strictObject({ kind: z.literal('stopped') }),
  z.strictObject({
    kind: z.literal('event'),
    eventKind: z.enum([
      'move',
      'turn',
      'stop',
      'set',
      'call',
      'inspect',
      'branch',
      'wait',
      'repeat_iteration',
    ]),
    nodeId: id.optional(),
    count: tick.optional(),
  }),
  z.strictObject({ kind: z.literal('color-stop'), color }),
  z.strictObject({
    kind: z.literal('heading'),
    headingDeg: n.min(0).lt(360),
    toleranceDeg: nonnegative.max(180),
  }),
  // Part H goal kinds. Each is judged only from the recorded run, never from a flag.
  z.strictObject({ kind: z.literal('programmed-stop') }),
  z.strictObject({
    kind: z.literal('final-distance'),
    minCm: nonnegative,
    maxCm: nonnegative.optional(),
  }),
  z.strictObject({
    kind: z.literal('path'),
    points: z.array(Vec2Schema).min(1).max(10),
    toleranceCm: positive,
  }),
  z.strictObject({ kind: z.literal('color-stop-within'), color, ticks: tick.max(200) }),
])
export const SensorConfigSchema = z.strictObject({
  schemaVersion: v,
  maxRangeCm: positive.max(500),
  originOffset: Vec2Schema,
  readingHz: z.literal(20),
  noiseSeed: z.number().int().nonnegative().max(4294967295).optional(),
  colorOffset: Vec2Schema,
  normalization: z.literal('null-out-of-range;heading-0-360;cm'),
})
const worldBase = z.strictObject({
  schemaVersion: v,
  id,
  sensorConfig: SensorConfigSchema.optional(),
  boundaryDetectable: z.boolean().optional(),
  widthCm: positive.min(100).max(2000),
  heightCm: positive.min(100).max(2000),
  obstacles: z.array(ObstacleSchema).max(LIMITS.obstacles),
  floorZones: z.array(FloorZoneSchema).max(100),
  waypoints: z.array(Vec2Schema).max(100),
  spawn: z.strictObject({
    position: Vec2Schema,
    headingDeg: n.min(0).lt(360),
    radiusCm: positive.min(1),
  }),
  goals: z.array(GoalSchema).max(20),
  collisionConstraints: z.strictObject({
    stopOnCollision: z.literal(true),
    allowOverlap: z.literal(false),
  }),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
})
export const WorldSchema = worldBase.superRefine((w, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
  const inside = (p: { xCm: number; yCm: number }) =>
    p.xCm >= 0 && p.yCm >= 0 && p.xCm <= w.widthCm && p.yCm <= w.heightCm
  const s = w.spawn
  const r = s.radiusCm
  if (
    s.position.xCm < r ||
    s.position.yCm < r ||
    s.position.xCm > w.widthCm - r ||
    s.position.yCm > w.heightCm - r
  )
    issue('Spawn must fit inside world')
  const allIds = [...w.obstacles, ...w.floorZones].map((o) => o.id)
  if (new Set(allIds).size !== allIds.length) issue('World object IDs must be unique')
  if (
    new Set(w.obstacles.map((o) => `${o.position.xCm},${o.position.yCm}`)).size !==
    w.obstacles.length
  )
    issue('Obstacle locations must be unique')
  if (
    w.sensorConfig &&
    [w.sensorConfig.originOffset, w.sensorConfig.colorOffset].some(
      (p) => Math.hypot(p.xCm, p.yCm) > r + 1e-9,
    )
  )
    issue('Sensor sample offsets must lie within the robot footprint')
  for (const o of w.obstacles) {
    const radius = o.kind === 'circle' ? o.radiusCm : 0
    const width = o.kind === 'rectangle' ? o.widthCm : radius
    const height = o.kind === 'rectangle' ? o.heightCm : radius
    if (
      !inside({ xCm: o.position.xCm - radius, yCm: o.position.yCm - radius }) ||
      !inside({ xCm: o.position.xCm + width, yCm: o.position.yCm + height })
    )
      issue(`Obstacle ${o.id} lies outside world`)
    const dx =
      o.kind === 'circle'
        ? s.position.xCm - o.position.xCm
        : s.position.xCm -
          Math.max(o.position.xCm, Math.min(s.position.xCm, o.position.xCm + o.widthCm))
    const dy =
      o.kind === 'circle'
        ? s.position.yCm - o.position.yCm
        : s.position.yCm -
          Math.max(o.position.yCm, Math.min(s.position.yCm, o.position.yCm + o.heightCm))
    if (o.solid && Math.hypot(dx, dy) < r + radius) issue(`Spawn overlaps ${o.id}`)
  }
  for (let i = 0; i < w.obstacles.length; i++)
    for (const b of w.obstacles.slice(i + 1)) {
      const a = w.obstacles[i]!
      if (!a.solid || !b.solid) continue
      let overlaps = false
      if (a.kind === 'rectangle' && b.kind === 'rectangle')
        overlaps =
          a.position.xCm < b.position.xCm + b.widthCm &&
          a.position.xCm + a.widthCm > b.position.xCm &&
          a.position.yCm < b.position.yCm + b.heightCm &&
          a.position.yCm + a.heightCm > b.position.yCm
      else if (a.kind === 'circle' && b.kind === 'circle')
        overlaps =
          Math.hypot(a.position.xCm - b.position.xCm, a.position.yCm - b.position.yCm) <
          a.radiusCm + b.radiusCm
      else {
        const c = a.kind === 'circle' ? a : b
        const rect = a.kind === 'rectangle' ? a : b
        if (c.kind === 'circle' && rect.kind === 'rectangle')
          overlaps =
            Math.hypot(
              c.position.xCm -
                Math.max(
                  rect.position.xCm,
                  Math.min(c.position.xCm, rect.position.xCm + rect.widthCm),
                ),
              c.position.yCm -
                Math.max(
                  rect.position.yCm,
                  Math.min(c.position.yCm, rect.position.yCm + rect.heightCm),
                ),
            ) < c.radiusCm
      }
      if (overlaps) issue(`Solid obstacles ${a.id} and ${b.id} overlap`)
    }
  for (const f of w.floorZones) {
    const pts =
      f.kind === 'polygon'
        ? f.points
        : [f.position, { xCm: f.position.xCm + f.widthCm, yCm: f.position.yCm + f.heightCm }]
    if (pts.some((p) => !inside(p))) issue(`Floor zone ${f.id} outside world`)
    if (f.kind === 'polygon') {
      const area = f.points.reduce((sum, p, i) => {
        const q = f.points[(i + 1) % f.points.length]!
        return sum + p.xCm * q.yCm - q.xCm * p.yCm
      }, 0)
      if (Math.abs(area) < 1e-8) issue('Floor polygon has no area')
    }
  }
  if (w.waypoints.some((p) => !inside(p))) issue('Waypoint outside world')
  if (w.goals.some((g) => g.kind === 'reach' && !inside(g.position))) issue('Goal outside world')
})
export const RobotStateSchema = z.strictObject({
  schemaVersion: v,
  position: Vec2Schema,
  headingDeg: n.min(0).lt(360),
  radiusCm: positive.min(1),
  speedCmPerSec: n,
  turnDegPerSec: n,
  status: z.enum(['idle', 'running', 'paused', 'stopped', 'completed', 'error']),
  collision: z.string().max(128).nullable(),
  simTimeMs: nonnegative,
  tick,
  stopReason: text.nullable(),
})
export const SensorSnapshotSchema = z.strictObject({
  schemaVersion: v,
  distanceCm: nonnegative.nullable(),
  surfaceColor: color,
  position: Vec2Schema,
  headingDeg: n.min(0).lt(360),
  tick,
  ray: z.strictObject({
    origin: Vec2Schema,
    end: Vec2Schema,
    hitId: id.nullable(),
    maxRangeCm: positive,
  }),
})
const node = { nodeId: id, type: z.enum(['number', 'boolean', 'color']) }
export const ExpressionSchema: z.ZodType<Expression> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({
      ...node,
      kind: z.literal('literal'),
      value: z.union([n, z.boolean(), color]),
    }),
    z.strictObject({ ...node, kind: z.literal('sensor'), sensor: z.enum(['distance', 'color']) }),
    z.strictObject({ ...node, kind: z.literal('variable'), name: id }),
    z.strictObject({
      ...node,
      kind: z.literal('arithmetic'),
      op: z.enum(['+', '-', '*', '/']),
      left: ExpressionSchema,
      right: ExpressionSchema,
    }),
    z.strictObject({
      ...node,
      kind: z.literal('compare'),
      op: z.enum(['<', '<=', '>', '>=', '==', '!=']),
      left: ExpressionSchema,
      right: ExpressionSchema,
    }),
    z.strictObject({
      ...node,
      kind: z.literal('boolean'),
      op: z.enum(['and', 'or']),
      left: ExpressionSchema,
      right: ExpressionSchema,
    }),
    z.strictObject({ ...node, kind: z.literal('not'), operand: ExpressionSchema }),
    z.strictObject({ ...node, kind: z.literal('detected'), operand: ExpressionSchema }),
  ]),
)
export const StatementSchema: z.ZodType<Statement> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({ nodeId: id, kind: z.literal('move'), distance: ExpressionSchema }),
    z.strictObject({ nodeId: id, kind: z.literal('turn'), angle: ExpressionSchema }),
    z.strictObject({ nodeId: id, kind: z.literal('stop') }),
    z.strictObject({ nodeId: id, kind: z.literal('wait'), durationMs: ExpressionSchema }),
    z.strictObject({
      nodeId: id,
      kind: z.literal('if'),
      condition: ExpressionSchema,
      then: z.array(StatementSchema).max(200),
      else: z.array(StatementSchema).max(200),
    }),
    z.strictObject({
      nodeId: id,
      kind: z.literal('repeat'),
      count: ExpressionSchema,
      body: z.array(StatementSchema).max(200),
    }),
    z.strictObject({
      nodeId: id,
      kind: z.literal('while'),
      condition: ExpressionSchema,
      body: z.array(StatementSchema).max(200),
    }),
    z.strictObject({ nodeId: id, kind: z.literal('set'), name: id, value: ExpressionSchema }),
    z.strictObject({
      nodeId: id,
      kind: z.literal('function'),
      name: id,
      body: z.array(StatementSchema).max(200),
    }),
    z.strictObject({ nodeId: id, kind: z.literal('call'), name: id }),
    z.strictObject({ nodeId: id, kind: z.literal('inspect'), expression: ExpressionSchema }),
  ]),
)
export const ProgramSchema: z.ZodType<Program> = z.strictObject({
  schemaVersion: v,
  id,
  body: z.array(StatementSchema).max(200),
})
export const ExecutionEventSchema = z.strictObject({
  schemaVersion: v,
  seq: tick,
  tick,
  elapsedMs: nonnegative,
  nodeId: id,
  kind: z.enum([
    'branch',
    'move',
    'turn',
    'wait',
    'stop',
    'set',
    'call',
    'inspect',
    'error',
    'sensor_read',
    'compare',
    'repeat_iteration',
    'loop_start',
    'loop_end',
    'function_return',
    'function_defined',
    'collision',
    'program_stop',
  ]),
  before: RobotStateSchema,
  after: RobotStateSchema,
  sensor: SensorSnapshotSchema,
  evaluation: z
    .strictObject({ expressionId: id, operands: z.array(value).max(2), result: value })
    .nullable(),
  variables,
  stackDepth: tick.max(LIMITS.stack),
  facts: z.array(text).max(10),
  cause: text.nullable(),
})
export const SimulationSnapshotSchema = z.strictObject({
  schemaVersion: v,
  worldId: id,
  programHash: hash,
  eventCursor: tick,
  robotState: RobotStateSchema,
  interpreterState: z.strictObject({
    variables,
    stack: z.array(id).max(LIMITS.stack),
    instructions: tick,
    status: z.enum(['ready', 'paused', 'finished']),
  }),
  rngState: tick.nullable(),
  traceId: id,
})
export const PredictionSchema = z
  .strictObject({
    schemaVersion: v,
    id,
    question: text,
    programHash: hash,
    worldHash: hash,
    learnerId: id,
    action: z.enum(['move', 'stop', 'turn', 'wait']),
    branch: z.enum(['then', 'else']).nullable(),
    distanceRange: z.tuple([nonnegative, nonnegative]).nullable(),
    confidence: z.number().int().min(1).max(5),
    reasoning: text.optional(),
    recordedAt: time,
    uncertain: z.boolean().optional(),
    /** Optional mission-specific second question (Part H), e.g. "how many turns?". */
    detail: z.strictObject({ question: id, answer: text.max(64) }).optional(),
  })
  .refine(
    (p) => !p.distanceRange || p.distanceRange[0] <= p.distanceRange[1],
    'Distance range must be ascending',
  )
export const ProbeSchema = z
  .strictObject({
    schemaVersion: v,
    id,
    targetHypotheses: z.array(id).min(1).max(10),
    scenario: z.strictObject({ world: WorldSchema, program: ProgramSchema }),
    choices: z
      .array(z.strictObject({ id, label: text }))
      .min(2)
      .max(8),
    correctChoice: id,
    rationale: text,
    discrimination: z.array(z.strictObject({ hypothesisId: id, choiceId: id })).max(20),
  })
  .superRefine((p, c) => {
    if (new Set(p.choices.map((x) => x.id)).size !== p.choices.length)
      c.addIssue({ code: 'custom', message: 'Probe choice IDs must be unique' })
    if (!p.choices.some((x) => x.id === p.correctChoice))
      c.addIssue({ code: 'custom', message: 'Correct probe choice is missing' })
    if (
      p.discrimination.some(
        (d) =>
          !p.targetHypotheses.includes(d.hypothesisId) ||
          !p.choices.some((x) => x.id === d.choiceId),
      )
    )
      c.addIssue({ code: 'custom', message: 'Invalid discrimination table reference' })
  })
export const EvidenceItemSchema = z.strictObject({
  schemaVersion: v,
  id,
  answerId: id,
  traceHash: hash,
  scenarioHash: hash,
  hypothesisId: id,
  direction: z.enum(['supports', 'contradicts']),
  weight: z.number().min(0).max(1),
  ruleReason: text,
})
export const HypothesisSchema = z.strictObject({
  schemaVersion: v,
  code: id,
  title: text,
  learnerText: text,
  evidence: z.array(EvidenceItemSchema).max(100),
  contradictions: z.array(EvidenceItemSchema).max(100),
  status: z.enum(['unverified', 'possible', 'evidence_for', 'evidence_against']),
  supportScore: z.number().min(0).max(1),
  nextProbeId: id.nullable(),
})
export const CounterexampleSchema = z.strictObject({
  schemaVersion: v,
  id,
  changedParameters: z
    .array(
      z.strictObject({
        field: z.enum([
          'distanceCm',
          'threshold',
          'obstacle-distance',
          'comparator',
          'floor-color',
          'loop-count',
          'function-call',
          'variable-value',
        ]),
        target: text.optional(),
        before: z.union([n, text]),
        after: z.union([n, text]),
      }),
    )
    .max(2),
  baselineTrace: z.array(ExecutionEventSchema).max(LIMITS.events),
  changedTrace: z.array(ExecutionEventSchema).max(LIMITS.events),
  targetHypotheses: z.array(id).max(10),
  modelOutcomes: z.array(z.strictObject({ hypothesisId: id, answer: text })).max(20),
  rationale: text,
  validationChecksum: hash,
  noCandidateReason: text.nullable(),
  question: text,
  edit: z.strictObject({ field: id, target: text, value: text }).nullable(),
})
/** One committed prediction inside a counterexample experiment (Part G4/E8). The scenario
 * is rebuilt from the attempt's own world/program plus this single edit, so the stored
 * answer can always be re-checked against the simulator. */
export const ExperimentResponseSchema = z.strictObject({
  /** Set when the experiment edits a verified probe scenario instead of the mission. */
  baseProbeId: id.optional(),
  field: id,
  target: text.max(128),
  value: text.max(64),
  question: id,
  predicted: text.max(64),
  actual: text.max(64),
  recordedAt: time,
})
export const AppSettingsSchema = z.strictObject({
  schemaVersion: v,
  theme: z.enum(['light', 'dark', 'system']),
  reducedMotion: z.boolean(),
  audioEnabled: z.boolean(),
  hintsMode: z.enum(['guided', 'on-request']),
  textSize: z.enum(['standard', 'large']),
  highContrast: z.boolean(),
  shortcutsOverlay: z.boolean(),
  lastOpenedMission: id.nullable(),
  sensorLabels: z.boolean().optional(),
})
export const ReassessmentSchema = z
  .strictObject({
    schemaVersion: v,
    worldHash: hash,
    programHash: hash,
    predictedAction: z.enum(['move', 'stop', 'turn', 'wait']),
    actualAction: z.enum(['move', 'stop', 'turn', 'wait']),
    correct: z.boolean(),
    recordedAt: time,
    /** Transfer-pool scenario id (Part G5). Absent on records made before G. */
    scenarioId: id.optional(),
  })
  .refine(
    (r) => r.correct === (r.predictedAction === r.actualAction),
    'Transfer correctness does not match the answer',
  )
export const LearnerProfileSchema = z.strictObject({
  schemaVersion: v,
  id,
  nickname: z.string().min(1).max(32),
  settings: AppSettingsSchema,
  completedMissions: z.array(id).max(100),
  responses: z.array(PredictionSchema).max(200),
  evidence: z.array(EvidenceItemSchema).max(100),
  conceptProgress: z
    .array(
      z.strictObject({
        concept: id,
        independentSuccesses: tick,
        distinctScenarioHashes: z.array(hash).max(100),
        status: z.enum(['not_started', 'practicing', 'developing']),
      }),
    )
    .max(100),
})
export const MissionSchema = z.strictObject({
  schemaVersion: v,
  id,
  version: z.number().int().min(1),
  title: text,
  conceptGoals: z.array(id).min(1).max(10),
  prerequisiteIds: z.array(id).max(20),
  world: WorldSchema,
  starterProgram: ProgramSchema,
  successPredicate: z.array(GoalSchema).min(1).max(20),
  failureExplanation: text,
  variants: z.array(z.strictObject({ id, world: WorldSchema, program: ProgramSchema })).max(20),
  roleEvidenceAssignments: z.array(z.strictObject({ role: id, task: text })).max(6),
  targetCompletionSteps: tick.min(1),
  recommendedProbeIds: z.array(id).max(20),
  /** Part H: the same program must also succeed in these authored worlds. */
  successScenarios: z
    .array(
      z.strictObject({
        id,
        label: text,
        world: WorldSchema,
        goals: z.array(GoalSchema).min(1).max(20),
      }),
    )
    .max(6)
    .optional(),
  /** Part H capstone: completion also needs a reason, an experiment and a transfer. */
  capstone: z.boolean().optional(),
})
export const AttemptSchema = z
  .strictObject({
    schemaVersion: v,
    engineVersion: z.union([z.literal(1), z.literal(2)]).optional(),
    /** Mission data version used for goal judging; absent means the frozen v1 data. */
    missionVersion: z.number().int().min(1).max(100).optional(),
    id,
    learnerId: id,
    missionId: id,
    attemptIndex: tick.min(1),
    startedAt: time,
    completedAt: time,
    prediction: PredictionSchema,
    world: z.union([WorldSchema, LegacyWorldSchema]),
    program: ProgramSchema,
    traceHash: hash,
    diagnosticResponses: z
      .array(z.strictObject({ probeId: id, choiceId: id, recordedAt: time }))
      .max(20),
    reassessment: ReassessmentSchema.nullable(),
    transferRetries: z.array(ReassessmentSchema).max(20).optional(),
    hintIds: z.array(id).max(20).optional(),
    assessmentSkipped: z.boolean().optional(),
    experimentUsed: z.boolean().optional(),
    experimentResponses: z.array(ExperimentResponseSchema).max(20).optional(),
    goalOutcome: z.strictObject({ passed: z.boolean(), facts: z.array(text).max(20) }),
  })
  .refine(
    (a) =>
      Date.parse(a.startedAt) <= Date.parse(a.prediction.recordedAt) &&
      Date.parse(a.prediction.recordedAt) <= Date.parse(a.completedAt),
    'Prediction must precede result reveal',
  )
  .refine(
    (a) => a.prediction.learnerId === a.learnerId,
    'Prediction belongs to a different learner',
  )
  .refine(
    (a) =>
      a.diagnosticResponses.every((r) => Date.parse(r.recordedAt) >= Date.parse(a.completedAt)) &&
      (a.experimentResponses ?? []).every(
        (r) => Date.parse(r.recordedAt) >= Date.parse(a.completedAt),
      ) &&
      (!a.reassessment || Date.parse(a.reassessment.recordedAt) >= Date.parse(a.completedAt)) &&
      (!a.transferRetries?.length || Boolean(a.reassessment)) &&
      (a.transferRetries ?? []).every(
        (r, i) =>
          Date.parse(r.recordedAt) >=
          Date.parse(i === 0 ? a.reassessment!.recordedAt : a.transferRetries![i - 1]!.recordedAt),
      ),
    'Learning annotations must follow execution',
  )
  .refine(
    (a) => !a.hintIds || new Set(a.hintIds).size === a.hintIds.length,
    'Hint IDs must be unique',
  )
export const TeamSessionSchema = z
  .strictObject({
    schemaVersion: v,
    id,
    members: z
      .array(
        z.strictObject({
          learnerId: id,
          alias: z.string().min(1).max(32),
          role: z.enum([
            'driver',
            'predictor',
            'sensor-reader',
            'trace-reader',
            'experimenter',
            'explainer',
          ]),
        }),
      )
      .min(2)
      .max(6),
    rotationIndex: tick,
    currentMission: id,
    program: ProgramSchema.optional(),
    evidenceBoard: z.array(text).max(100),
    predictions: z.array(PredictionSchema).max(100),
    predictionHistory: z
      .array(z.strictObject({ round: tick, prediction: PredictionSchema }))
      .max(600)
      .default([]),
    actions: z
      .array(
        z.strictObject({
          learnerId: id,
          kind: z.enum([
            'predict',
            'handoff',
            'rotate',
            'explain',
            'observe',
            'huddle',
            'run',
            'pause',
            'resume',
            'end',
            'skip-rotation',
          ]),
          recordedAt: time,
        }),
      )
      .max(200),
    status: z.enum(['setup', 'active', 'paused', 'completed', 'ended']),
    name: z.string().max(30).optional(),
    phase: z.enum(['collecting', 'huddle', 'result']).optional(),
    contributions: z
      .array(
        z.strictObject({
          learnerId: id,
          role: id,
          text: z.string().min(1).max(500),
          round: tick,
          recordedAt: time,
        }),
      )
      .max(200)
      .default([]),
    teamHypothesis: z.string().max(500).default(''),
    roleHistory: z
      .array(z.strictObject({ learnerId: id, role: id, round: tick }))
      .max(600)
      .default([]),
    rotationSkips: z
      .array(z.strictObject({ round: tick, reason: z.string().min(1).max(300), recordedAt: time }))
      .max(100)
      .default([]),
    results: z
      .array(
        z.strictObject({
          round: tick,
          traceHash: hash,
          engineVersion: z.union([z.literal(1), z.literal(2)]).optional(),
          missionVersion: z.number().int().min(1).max(100).optional(),
          goalPassed: z.boolean(),
          recordedAt: time,
          world: z.union([WorldSchema, LegacyWorldSchema]).optional(),
          program: ProgramSchema.optional(),
        }),
      )
      .max(100)
      .default([]),
    createdAt: time.optional(),
    endedAt: time.optional(),
  })
  .superRefine((t, c) => {
    if (new Set(t.members.map((m) => m.learnerId)).size !== t.members.length)
      c.addIssue({ code: 'custom', message: 'Duplicate team member' })
    if (new Set(t.members.map((m) => m.role)).size !== t.members.length)
      c.addIssue({ code: 'custom', message: 'Roles must be distinct within a round' })
    if (new Set(t.predictions.map((p) => p.learnerId)).size !== t.predictions.length)
      c.addIssue({ code: 'custom', message: 'Each member predicts once per round' })
    if (t.status === 'completed' && t.predictions.length !== t.members.length)
      c.addIssue({ code: 'custom', message: 'Every member must predict before completion' })
    if (
      t.actions.some(
        (a, i) =>
          !t.members.some((m) => m.learnerId === a.learnerId) ||
          (i > 0 && Date.parse(a.recordedAt) < Date.parse(t.actions[i - 1]!.recordedAt)),
      )
    )
      c.addIssue({
        code: 'custom',
        message: 'Team actions must reference members in chronological order',
      })
    if (t.contributions.some((x) => !t.members.some((m) => m.learnerId === x.learnerId)))
      c.addIssue({ code: 'custom', message: 'Contribution is not from a team member' })
    if (
      new Set(t.contributions.map((x) => `${x.round}:${x.learnerId}`)).size !==
      t.contributions.length
    )
      c.addIssue({ code: 'custom', message: 'A handed-off contribution cannot be replaced' })
    if (
      t.predictionHistory.some(
        (p) => !t.members.some((m) => m.learnerId === p.prediction.learnerId),
      )
    )
      c.addIssue({ code: 'custom', message: 'Historical prediction is not from a team member' })
    if (
      new Set(t.predictionHistory.map((p) => `${p.round}:${p.prediction.learnerId}`)).size !==
      t.predictionHistory.length
    )
      c.addIssue({
        code: 'custom',
        message: 'Historical predictions must be unique per learner and round',
      })
    if (new Set(t.results.map((r) => r.round)).size !== t.results.length)
      c.addIssue({ code: 'custom', message: 'Each team round can execute only once' })
    if (t.predictions.some((p) => !t.members.some((m) => m.learnerId === p.learnerId)))
      c.addIssue({ code: 'custom', message: 'Prediction is not from a team member' })
  })
export const SavedLabSchema = z.strictObject({
  schemaVersion: v,
  id,
  name: z.string().min(1).max(60),
  world: WorldSchema,
  program: ProgramSchema,
  updatedAt: time,
})
export const DraftSchema = z.strictObject({
  schemaVersion: v,
  id,
  learnerId: id,
  missionId: id,
  world: WorldSchema,
  program: ProgramSchema,
  updatedAt: time,
  stage: z.string().max(80),
  cursor: tick.max(LIMITS.events).optional(),
  attemptId: id.nullable().optional(),
  experimentThreshold: n.min(0).max(100).optional(),
  transferIndex: tick.max(20).optional(),
})
export const AssignmentSchema = z.strictObject({
  id,
  teamId: id,
  missionId: id,
  assignedAt: time,
})
export const ExportSchema = z
  .strictObject({
    schemaVersion: v,
    exportedAt: time,
    profile: LearnerProfileSchema.nullable(),
    attempts: z.array(AttemptSchema).max(LIMITS.attempts),
    teams: z.array(TeamSessionSchema).max(10),
    profiles: z.array(LearnerProfileSchema).max(20).default([]),
    savedLabs: z.array(SavedLabSchema).max(50).default([]),
    drafts: z.array(DraftSchema).max(100).default([]),
    assignments: z.array(AssignmentSchema).max(20).default([]),
    sourceAppVersion: z.string().max(30).optional(),
  })
  .superRefine((data, c) => {
    for (const list of [
      data.attempts,
      data.teams,
      data.profiles,
      data.savedLabs,
      data.drafts,
      data.assignments,
    ])
      if (new Set(list.map((x) => x.id)).size !== list.length)
        c.addIssue({ code: 'custom', message: 'Duplicate imported IDs' })
    if (data.profile && data.profiles.some((p) => p.id === data.profile!.id))
      c.addIssue({ code: 'custom', message: 'Active learner is duplicated in saved learners' })
    if (data.assignments.some((a) => !data.teams.some((t) => t.id === a.teamId)))
      c.addIssue({ code: 'custom', message: 'Assignment references an unknown local team' })
  })
