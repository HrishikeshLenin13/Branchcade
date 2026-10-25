import type { Expression, Program, Statement, Value, World, ExecutionEvent } from '../domain/types'
import { Interpreter, type RunResult } from '../interpreter/interpreter'
import { readSensors } from '../engine/sensors'
import { containsZone, transformOffset } from '../engine/geometry'
import { initialRobot } from '../engine/robot'
import { DEFAULT_SENSOR } from '../engine/world'
import { actualAction } from '../interpreter/trace'
import { HYPOTHESIS_CODES, NO_MISCONCEPTION, type HypothesisCode, type ModelCode } from './taxonomy'

/** Authored model parameter for SENSOR_IS_ACTION: the distance at which a learner who
 * believes "seeing a wall stops the robot" expects the automatic stop. It is a fixed,
 * documented assumption of that model, not a measured property of any child. */
export const PERCEIVED_NEAR_CM = 30
/** Smaller budgets for hypothetical runs. Truth runs that exceed them are rejected as
 * scenarios, so a lower budget can only remove candidates, never invent an answer. */
const MODEL_LIMITS = { events: 3000, instructions: 3000, ticks: 4000 }

type Color = Exclude<Value, number | boolean | null>

/** The real interpreter with exactly one rule changed. NO_MISCONCEPTION changes nothing,
 * which tests verify by comparing its trace hash with the authoritative interpreter. */
class ModelInterpreter extends Interpreter {
  private firstDistance: number | null | undefined
  ifBodies: string | null = null
  private readonly model: ModelCode
  constructor(world: World, program: Program, model: ModelCode) {
    super(world, program, MODEL_LIMITS)
    this.model = model
  }
  /** What this model believes the distance sensor reports right now. */
  perceive(): number | null {
    return this.distanceReading(readSensors(this.world, this.robot).distanceCm)
  }
  protected override distanceReading(actual: number | null): number | null {
    if (this.firstDistance === undefined) this.firstDistance = actual
    switch (this.model) {
      case 'SENSOR_NULL_ZERO':
        return actual ?? 0
      case 'MOVEMENT_VS_SENSOR_REFRESH':
        return this.firstDistance
      case 'SENSOR_RANGE_REVERSED':
        // Same starting number, but every change goes the opposite way.
        return actual === null || this.firstDistance === null
          ? actual
          : Math.max(0, 2 * this.firstDistance - actual)
      default:
        return actual
    }
  }
  protected override colorReading(actual: Color): Color {
    if (this.model !== 'COLOR_LOCATION') return actual
    return colorAhead(this.world, this.robot)
  }
  protected override comparisonOp(op: Extract<Expression, { kind: 'compare' }>['op']) {
    if (this.model === 'COMPARATOR_DIRECTION')
      return ({ '<': '>', '>': '<', '<=': '>=', '>=': '<=', '==': '==', '!=': '!=' } as const)[op]
    if (this.model === 'STRICT_VS_INCLUSIVE') return op === '<' ? '<=' : op === '>' ? '>=' : op
    return op
  }
  protected override branchBodies(s: Extract<Statement, { kind: 'if' }>, result: boolean) {
    const label =
      this.model === 'ELSE_EXECUTES_TOO'
        ? 'both'
        : this.model === 'ELSE_NEVER' && !result
          ? 'neither'
          : result
            ? 'then'
            : 'else'
    this.ifBodies ??= label
    return label === 'both'
      ? [s.then, s.else]
      : label === 'neither'
        ? []
        : [result ? s.then : s.else]
  }
  protected override repeatTimes(count: number) {
    return this.model === 'LOOP_COUNT' ? count + 1 : count
  }
  protected override whileChecksFirst() {
    return this.model !== 'WHILE_PRETEST'
  }
  protected override definitionRuns() {
    return this.model === 'FUNCTION_DEFINITION_EXECUTES'
  }
  protected override callRuns() {
    return this.model !== 'FUNCTION_CALL_SKIPPED'
  }
  protected override keepsEarlierAssignment() {
    return this.model === 'VARIABLE_STALE_VALUE'
  }
  protected override stopsBeforeMoving() {
    if (this.model !== 'SENSOR_IS_ACTION') return false
    const reading = readSensors(this.world, this.robot).distanceCm
    return reading !== null && reading <= PERCEIVED_NEAR_CM
  }
}

/** COLOR_LOCATION's belief: the floor sensor reports the first colored zone it would "see"
 * ahead along the heading (1 cm samples up to the sensor range), else white. */
export function colorAhead(world: World, robot: ReturnType<typeof initialRobot>) {
  const config = world.sensorConfig ?? DEFAULT_SENSOR
  const heading = robot.headingDeg
  for (let d = 0; d <= config.maxRangeCm; d++) {
    const point = transformOffset(robot.position, heading, {
      xCm: config.colorOffset.xCm + d,
      yCm: config.colorOffset.yCm,
    })
    const zone = [...world.floorZones]
      .sort((a, b) => b.priority - a.priority)
      .find((z) => z.color !== 'white' && containsZone(point, z))
    if (zone) return zone.color
  }
  return 'white' as const
}

export interface ModelRun {
  model: ModelCode
  result: RunResult
  ifBodies: string
  perceivedStart: number | null
  perceivedEnd: number | null
}

// A result can hold a full 4 MB trace. An entry-count-only cap allowed thousands
// of those traces to survive navigation. Bound both trace payload and entry overhead.
export const MODEL_CACHE_LIMITS = { bytes: 8 * 1024 * 1024, entries: 512 } as const
const cache = new Map<string, { run: ModelRun; bytes: number; identity: string }>()
let cacheBytes = 0
export function modelCacheStats() {
  return {
    entries: cache.size,
    traceBytes: cacheBytes,
    maxEntries: MODEL_CACHE_LIMITS.entries,
    maxTraceBytes: MODEL_CACHE_LIMITS.bytes,
  }
}
export function clearModelCache() {
  cache.clear()
  cacheBytes = 0
}
/** Caller IDs are labels, not proof of scenario identity (imports may reuse IDs).
 * Compare the complete bounded input serialization before reusing a pure model result. */
export function runModel(key: string, world: World, program: Program, model: ModelCode): ModelRun {
  const cacheKey = `${key}|${model}`
  const identity = JSON.stringify([world, program])
  const hit = cache.get(cacheKey)
  if (hit) {
    cache.delete(cacheKey)
    if (hit.identity === identity) {
      cache.set(cacheKey, hit)
      return hit.run
    }
    cacheBytes -= hit.bytes
  }
  const machine = new ModelInterpreter(world, program, model)
  const perceivedStart = machine.perceive()
  while (!['completed', 'stopped', 'error', 'budget_exceeded'].includes(machine.status))
    machine.step()
  const run: ModelRun = {
    model,
    result: machine.result,
    ifBodies: machine.ifBodies ?? 'none',
    perceivedStart,
    perceivedEnd: machine.perceive(),
  }
  const bytes = machine.traceByteLength + 1024 + (cacheKey.length + identity.length) * 2
  while (
    cache.size &&
    (cache.size >= MODEL_CACHE_LIMITS.entries || cacheBytes + bytes > MODEL_CACHE_LIMITS.bytes)
  ) {
    const oldestKey = cache.keys().next().value!
    cacheBytes -= cache.get(oldestKey)!.bytes
    cache.delete(oldestKey)
  }
  if (bytes <= MODEL_CACHE_LIMITS.bytes) {
    cache.set(cacheKey, { run, bytes, identity })
    cacheBytes += bytes
  }
  return run
}

export const ALL_MODELS: ModelCode[] = [NO_MISCONCEPTION, ...HYPOTHESIS_CODES]

export type QuestionKind =
  | 'first-action'
  | 'branch'
  | 'compare'
  | 'reading-change'
  | 'ending'
  | 'turn-count'
  | 'move-count'
  | 'distance-travelled'
  | 'color-read'
  | 'distance-read'
  | 'variable'

const motion = new Set(['move', 'turn', 'wait'])
/** Counts separate invocations of a motion block (consecutive ticks of one block = one). */
export function invocations(events: readonly ExecutionEvent[], kind: 'move' | 'turn') {
  let count = 0
  events.forEach((e, i) => {
    const prev = events[i - 1]
    if (
      e.kind === kind &&
      !(prev && motion.has(prev.kind) && prev.kind === e.kind && prev.nodeId === e.nodeId)
    )
      count++
  })
  return count
}
const round1 = (n: number) => String(Math.round(n * 10) / 10)

/** The observable answer a question asks about, read from a (model) run. */
export function observe(kind: QuestionKind, run: ModelRun, variable?: string): string {
  const { events, status } = run.result
  switch (kind) {
    case 'first-action':
      return status === 'error' ? 'error' : actualAction(events)
    case 'branch':
      return run.ifBodies
    case 'compare': {
      const c = events.find((e) => e.kind === 'compare')
      return c ? String(c.evaluation?.result) : 'none'
    }
    case 'reading-change': {
      const { perceivedStart: a, perceivedEnd: b } = run
      if (a === null || b === null) return 'none'
      return Math.abs(a - b) < 0.05 ? 'same' : b < a ? 'smaller' : 'bigger'
    }
    case 'ending':
      return status === 'budget_exceeded'
        ? 'never-ends'
        : status === 'error'
          ? 'error'
          : events.some((e) => e.kind === 'collision')
            ? 'collision'
            : events.some((e) => e.kind === 'stop')
              ? 'stop'
              : 'finished'
    case 'turn-count':
      return String(invocations(events, 'turn'))
    case 'move-count':
      return String(invocations(events, 'move'))
    case 'distance-travelled':
      return round1(
        events
          .filter((e) => e.kind === 'move')
          .reduce(
            (sum, e) =>
              sum +
              Math.hypot(
                e.after.position.xCm - e.before.position.xCm,
                e.after.position.yCm - e.before.position.yCm,
              ),
            0,
          ),
      )
    case 'color-read': {
      const read = events.find(
        (e) => e.kind === 'sensor_read' && typeof e.evaluation?.result === 'string',
      )
      return read ? String(read.evaluation!.result) : 'none'
    }
    case 'distance-read': {
      const read = events.find(
        (e) => e.kind === 'sensor_read' && e.facts[0]?.startsWith('SENSOR_READ: distance_cm'),
      )
      if (!read) return 'none'
      const v = read.evaluation?.result
      return typeof v === 'number' ? round1(v) : 'none'
    }
    case 'variable': {
      const at = events.find((e) => e.kind === 'branch') ?? events.at(-1)
      const v = variable ? at?.variables[variable] : undefined
      return v === undefined || v === null ? 'none' : String(v)
    }
  }
}

/** Truth = the authoritative semantics. Valid only when the run ends cleanly. */
export function truthIsClean(run: ModelRun) {
  return run.result.status === 'completed' || run.result.status === 'stopped'
}
export const isHypothesis = (m: string): m is HypothesisCode =>
  (HYPOTHESIS_CODES as readonly string[]).includes(m)
