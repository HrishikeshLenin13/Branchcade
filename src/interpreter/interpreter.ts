import type {
  Program,
  Expression,
  Statement,
  Value,
  ExecutionEvent,
  World,
  RobotState,
} from '../domain/types'
import { LIMITS, FIXED_STEP_MS } from '../domain/constants'
import { WorldSchema } from '../domain/schemas'
import { assertBounded } from '../domain/invariants'
import { initialRobot, advanceRobot } from '../engine/robot'
import { readSensors } from '../engine/sensors'
import { validateProgram } from './validate'
import { execute as legacyExecute } from './legacy/interpreter'

export type InterpreterStatus =
  | 'idle'
  | 'validating'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'error'
  | 'budget_exceeded'
export type RunResult = {
  events: ExecutionEvent[]
  robot: RobotState
  error: string | null
  status?: InterpreterStatus
  errorNodeId?: string | null
}
export type RunLimits = {
  instructions: number
  events: number
  ticks: number
  callDepth: number
  stackFrames: number
  traceBytes: number
}
type Frame =
  | { kind: 'sequence'; body: Statement[]; index: number; returnNode?: Statement }
  | {
      kind: 'repeat'
      node: Extract<Statement, { kind: 'repeat' }>
      count: number
      iteration: number
    }
  | { kind: 'while'; node: Extract<Statement, { kind: 'while' }>; iteration: number }
  | {
      kind: 'motion'
      node: Statement
      mode: 'move' | 'turn' | 'wait'
      remaining: number
      sign: number
    }
const terminal = new Set<InterpreterStatus>(['completed', 'stopped', 'error', 'budget_exceeded'])
const number = (v: Value) => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error('Expected a finite number; distance may be out of range')
  return v
}
const boolean = (v: Value) => {
  if (typeof v !== 'boolean') throw new Error('Expected a boolean condition')
  return v
}

/** Explicit cursors, never recursive JS calls for user loops/functions. One step performs
 * one control boundary or one authoritative 50ms tick. Expressions are depth-validated. */
export class Interpreter {
  status: InterpreterStatus = 'idle'
  robot: RobotState
  readonly events: ExecutionEvent[] = []
  readonly world: World
  private frames: Frame[] = []
  private functions = new Map<string, Statement[]>()
  protected variables: Record<string, Value> = Object.create(null) as Record<string, Value>
  private variableTypes = new Map<string, Expression['type']>()
  private instructions = 0
  private depth = 0
  private bytes = 2
  private error: string | null = null
  private errorNodeId: string | null = null
  private nodeId = 'program'
  private limits: RunLimits
  constructor(worldInput: World, programInput: Program, limits: Partial<RunLimits> = {}) {
    this.status = 'validating'
    this.limits = {
      instructions: LIMITS.instructions,
      events: LIMITS.events,
      ticks: LIMITS.ticks,
      callDepth: LIMITS.callDepth,
      stackFrames: LIMITS.stackFrames,
      traceBytes: LIMITS.traceBytes,
      ...limits,
    }
    for (const [name, value] of Object.entries(this.limits))
      if (
        !Number.isInteger(value) ||
        value < (name === 'traceBytes' ? 16384 : name === 'events' ? 3 : 1) ||
        value > LIMITS[name as keyof RunLimits]
      )
        throw new Error(`Invalid ${name} budget`)
    assertBounded(worldInput)
    this.world = WorldSchema.parse(worldInput)
    this.robot = initialRobot(this.world)
    const program = validateProgram(programInput)
    for (const s of program.body) if (s.kind === 'function') this.functions.set(s.name, s.body)
    this.frames.push({ kind: 'sequence', body: program.body, index: 0 })
    this.status = 'ready'
  }
  /* Mental-model seams (Part G). Each default below IS the authoritative semantics, so the
   * base class behaves exactly as before. Only src/learning/mental-models.ts overrides them,
   * to execute what a learner holding one specific misconception would expect to happen. */
  protected distanceReading(actual: number | null): number | null {
    return actual
  }
  protected colorReading(actual: Exclude<Value, number | boolean | null>) {
    return actual
  }
  protected comparisonOp(op: Extract<Expression, { kind: 'compare' }>['op']) {
    return op
  }
  protected branchBodies(s: Extract<Statement, { kind: 'if' }>, result: boolean): Statement[][] {
    return [result ? s.then : s.else]
  }
  protected repeatTimes(count: number) {
    return count
  }
  protected whileChecksFirst() {
    return true
  }
  protected definitionRuns() {
    return false
  }
  protected callRuns() {
    return true
  }
  protected keepsEarlierAssignment() {
    return false
  }
  protected stopsBeforeMoving(): boolean {
    return false
  }
  get result(): RunResult {
    return {
      events: this.events,
      robot: structuredClone(this.robot),
      error: this.error,
      status: this.status,
      errorNodeId: this.errorNodeId,
    }
  }
  /** Exact UTF-8 size already counted while emitting; consumers can bound caches
   * without serializing the same immutable trace again. */
  get traceByteLength() {
    return this.bytes
  }
  pause() {
    if (this.status === 'running' || this.status === 'ready') this.status = 'paused'
  }
  resume() {
    if (this.status === 'paused') this.status = 'running'
  }
  cancel() {
    if (!terminal.has(this.status)) this.finish('stopped', 'Run cancelled')
  }
  private budget() {
    if (++this.instructions > this.limits.instructions)
      throw new Error('Run budget reached. Reduce repeats or make the loop condition change.')
  }
  private push(frame: Frame) {
    if (this.frames.length >= this.limits.stackFrames)
      throw new Error('Run budget reached: maximum stack frames')
    this.frames.push(frame)
  }
  private emit(
    kind: ExecutionEvent['kind'],
    nodeId: string,
    before: RobotState,
    facts: string[],
    evaluation: ExecutionEvent['evaluation'] = null,
    final = false,
  ) {
    const event: ExecutionEvent = {
      schemaVersion: 1,
      seq: this.events.length,
      tick: this.robot.tick,
      elapsedMs: this.robot.simTimeMs,
      nodeId,
      kind,
      before: structuredClone(before),
      after: structuredClone(this.robot),
      sensor: readSensors(this.world, before),
      evaluation,
      variables: { ...this.variables },
      stackDepth: this.depth,
      facts,
      cause: this.robot.collision,
    }
    const bytes =
      new TextEncoder().encode(JSON.stringify(event)).byteLength + (this.events.length ? 1 : 0)
    if (
      !final &&
      (this.events.length >= this.limits.events - 2 ||
        this.bytes + bytes > this.limits.traceBytes - 8192)
    )
      throw new Error('Run budget reached: trace event/byte limit')
    this.events.push(event)
    this.bytes += bytes
  }
  private finish(status: InterpreterStatus, reason: string) {
    const before = structuredClone(this.robot)
    this.status = status
    this.robot = {
      ...this.robot,
      status: status === 'completed' ? 'completed' : status === 'stopped' ? 'stopped' : 'error',
      speedCmPerSec: 0,
      turnDegPerSec: 0,
      stopReason: reason,
    }
    if (status === 'error' || status === 'budget_exceeded' || reason === 'Run cancelled') {
      this.error = reason
      this.errorNodeId = this.nodeId
    }
    this.frames = []
    this.emit('program_stop', this.nodeId, before, [`PROGRAM_STOP: ${reason}`], null, true)
  }
  private evaluate(e: Expression): Value {
    this.nodeId = e.nodeId
    this.budget()
    switch (e.kind) {
      case 'literal':
        return e.value
      case 'sensor': {
        const s = readSensors(this.world, this.robot)
        const value =
          e.sensor === 'distance'
            ? this.distanceReading(s.distanceCm)
            : this.colorReading(s.surfaceColor)
        this.emit(
          'sensor_read',
          e.nodeId,
          this.robot,
          [
            `SENSOR_READ: ${e.sensor === 'distance' ? 'distance_cm' : 'floor_color'} = ${String(value)}`,
          ],
          { expressionId: e.nodeId, operands: [], result: value },
        )
        return value
      }
      case 'detected':
        return this.evaluate(e.operand) !== null
      case 'variable': {
        if (!Object.hasOwn(this.variables, e.name))
          throw new Error(`Variable ${e.name} has not been set at ${e.nodeId}`)
        if (this.variableTypes.get(e.name) !== e.type)
          throw new Error(`Variable type mismatch at ${e.nodeId}`)
        const v = this.variables[e.name]!
        if (
          v !== null &&
          typeof v !==
            (e.type === 'number' ? 'number' : e.type === 'boolean' ? 'boolean' : 'string')
        )
          throw new Error(`Variable type mismatch at ${e.nodeId}`)
        return v
      }
      case 'arithmetic': {
        const a = number(this.evaluate(e.left)),
          b = number(this.evaluate(e.right))
        this.nodeId = e.nodeId
        if (e.op === '/' && b === 0) throw new Error(`Division by zero at ${e.nodeId}`)
        const v = e.op === '+' ? a + b : e.op === '-' ? a - b : e.op === '*' ? a * b : a / b
        if (!Number.isFinite(v) || Math.abs(v) > 1_000_000)
          throw new Error('Arithmetic exceeds numeric limits')
        return v
      }
      case 'compare': {
        const a = this.evaluate(e.left),
          b = this.evaluate(e.right)
        this.nodeId = e.nodeId
        if (a === null || b === null)
          throw new Error(
            `No distance return at ${e.nodeId}. Guard the comparison with is detected AND your condition.`,
          )
        const op = this.comparisonOp(e.op)
        const result =
          op === '=='
            ? a === b
            : op === '!='
              ? a !== b
              : op === '<'
                ? number(a) < number(b)
                : op === '<='
                  ? number(a) <= number(b)
                  : op === '>'
                    ? number(a) > number(b)
                    : number(a) >= number(b)
        this.emit(
          'compare',
          e.nodeId,
          this.robot,
          [
            `${String(a)} ${e.op} ${String(b)} is ${result}`,
            'Full-precision operands; display readings round to 0.1 cm',
          ],
          { expressionId: e.nodeId, operands: [a, b], result },
        )
        return result
      }
      case 'boolean':
        return e.op === 'and'
          ? boolean(this.evaluate(e.left)) && boolean(this.evaluate(e.right))
          : boolean(this.evaluate(e.left)) || boolean(this.evaluate(e.right))
      case 'not':
        return !boolean(this.evaluate(e.operand))
    }
  }
  private motion(frame: Extract<Frame, { kind: 'motion' }>) {
    this.nodeId = frame.node.nodeId
    if (this.robot.tick >= this.limits.ticks)
      throw new Error('Run budget reached: physics tick limit')
    if (frame.mode === 'move' && frame.sign > 0 && this.stopsBeforeMoving()) {
      const before = structuredClone(this.robot)
      this.frames.pop()
      this.robot = { ...this.robot, speedCmPerSec: 0, turnDegPerSec: 0 }
      this.emit('stop', frame.node.nodeId, before, ['Model: the sensor stopped the robot'])
      this.finish('stopped', 'explicit stop')
      return
    }
    const amount = Math.min(
      frame.remaining,
      frame.mode === 'move' ? 1 : frame.mode === 'turn' ? 4.5 : FIXED_STEP_MS,
    )
    this.robot = {
      ...this.robot,
      status: 'running',
      speedCmPerSec: frame.mode === 'move' ? frame.sign * amount * 20 : 0,
      turnDegPerSec: frame.mode === 'turn' ? frame.sign * amount * 20 : 0,
    }
    const before = structuredClone(this.robot)
    this.robot = advanceRobot(this.robot, this.world)
    frame.remaining -= amount
    if (frame.remaining < 1e-9 || this.robot.collision) {
      this.frames.pop()
      this.robot.speedCmPerSec = 0
      this.robot.turnDegPerSec = 0
    }
    const delta = Math.hypot(
      this.robot.position.xCm - before.position.xCm,
      this.robot.position.yCm - before.position.yCm,
    )
    this.emit(frame.mode, frame.node.nodeId, before, [
      frame.mode === 'move'
        ? `MOVE: (${before.position.xCm},${before.position.yCm}) to (${this.robot.position.xCm},${this.robot.position.yCm}); delta ${delta} cm`
        : frame.mode === 'turn'
          ? `TURN: ${before.headingDeg} to ${this.robot.headingDeg} degrees`
          : 'WAIT: 50 ms; motors idle',
    ])
    if (this.robot.collision) {
      this.emit('collision', frame.node.nodeId, this.robot, [
        `COLLISION: contact at (${this.robot.position.xCm},${this.robot.position.yCm}); ${this.robot.collision}; movement stopped`,
      ])
      this.finish('stopped', 'collision')
    }
  }
  private whileIteration(frame: Extract<Frame, { kind: 'while' }>) {
    const first = this.events.length
    const result = boolean(this.evaluate(frame.node.condition))
    this.nodeId = frame.node.nodeId
    const comparison = this.events
      .slice(first)
      .findLast((e) => e.kind === 'compare' && e.nodeId === frame.node.condition.nodeId)
    this.emit(
      'branch',
      frame.node.nodeId,
      this.robot,
      [
        comparison?.facts[0] ?? `Condition is ${result}`,
        `WHILE: ${result ? 'enter body' : 'exit loop'}; iteration ${frame.iteration + 1}`,
      ],
      {
        expressionId: frame.node.condition.nodeId,
        operands: comparison?.evaluation?.operands ?? [result],
        result,
      },
    )
    if (result) {
      frame.iteration++
      this.push({ kind: 'sequence', body: frame.node.body, index: 0 })
    } else this.frames.pop()
  }
  step(): ExecutionEvent[] {
    const first = this.events.length
    if (terminal.has(this.status) || this.status === 'paused') return []
    this.status = 'running'
    try {
      this.budget()
      let frame = this.frames.at(-1)
      while (frame?.kind === 'sequence' && frame.index >= frame.body.length) {
        this.frames.pop()
        if (frame.returnNode) {
          this.emit('function_return', frame.returnNode.nodeId, this.robot, [
            `FUNCTION_RETURN: left ${(frame.returnNode as Extract<Statement, { kind: 'call' }>).name}`,
          ])
          this.depth--
          return this.events.slice(first)
        }
        frame = this.frames.at(-1)
      }
      if (!frame) {
        this.finish('completed', 'completion')
        return this.events.slice(first)
      }
      if (frame.kind === 'motion') this.motion(frame)
      else if (frame.kind === 'repeat') {
        if (frame.iteration >= frame.count) {
          this.frames.pop()
          this.emit('loop_end', frame.node.nodeId, this.robot, [
            `REPEAT: completed ${frame.count} iterations`,
          ])
        } else {
          frame.iteration++
          this.nodeId = frame.node.nodeId
          this.emit('repeat_iteration', frame.node.nodeId, this.robot, [
            `REPEAT_ITERATION: ${frame.iteration} of ${frame.count}`,
          ])
          this.push({ kind: 'sequence', body: frame.node.body, index: 0 })
        }
      } else if (frame.kind === 'while') {
        this.whileIteration(frame)
      } else {
        const s = frame.body[frame.index++]!
        this.nodeId = s.nodeId
        const before = structuredClone(this.robot)
        switch (s.kind) {
          case 'function':
            this.emit('function_defined', s.nodeId, before, [
              `FUNCTION_DEFINED: ${s.name}; definition does not execute`,
            ])
            if (this.definitionRuns()) {
              this.depth++
              this.push({
                kind: 'sequence',
                body: s.body,
                index: 0,
                returnNode: { nodeId: s.nodeId, kind: 'call', name: s.name },
              })
            }
            break
          case 'move':
          case 'turn':
          case 'wait': {
            const value = number(
              this.evaluate(
                s.kind === 'move' ? s.distance : s.kind === 'turn' ? s.angle : s.durationMs,
              ),
            )
            this.nodeId = s.nodeId
            const amount = Math.abs(value)
            if (s.kind === 'move' && (amount < 1 || amount > 300))
              throw new Error(`Move must be 1–300 cm (negative means backward) at ${s.nodeId}`)
            if (s.kind === 'turn' && (amount < 1 || amount > 360))
              throw new Error(`Turn must be 1–360 degrees at ${s.nodeId}`)
            if (s.kind === 'wait' && (!Number.isInteger(value / 50) || value < 50 || value > 10000))
              throw new Error(`Wait must be 1–200 ticks (multiples of 50 ms) at ${s.nodeId}`)
            const motion: Extract<Frame, { kind: 'motion' }> = {
              kind: 'motion',
              node: s,
              mode: s.kind,
              remaining: amount,
              sign: Math.sign(value),
            }
            this.push(motion)
            this.motion(motion)
            break
          }
          case 'stop':
            this.robot = {
              ...this.robot,
              speedCmPerSec: 0,
              turnDegPerSec: 0,
              status: 'stopped',
              stopReason: 'program-stop',
            }
            this.emit('stop', s.nodeId, before, ['Program requested stop'])
            this.finish('stopped', 'explicit stop')
            break
          case 'if': {
            const result = boolean(this.evaluate(s.condition))
            this.nodeId = s.nodeId
            const comparison = this.events
              .slice(first)
              .findLast((e) => e.kind === 'compare' && e.nodeId === s.condition.nodeId)
            this.emit(
              'branch',
              s.nodeId,
              before,
              [
                comparison?.facts[0] ?? `Condition is ${result}`,
                `${result ? 'Then' : 'Else'} branch selected`,
              ],
              {
                expressionId: s.condition.nodeId,
                operands: comparison?.evaluation?.operands ?? [result],
                result,
              },
            )
            for (const body of this.branchBodies(s, result).reverse())
              this.push({ kind: 'sequence', body, index: 0 })
            break
          }
          case 'repeat': {
            const count = number(this.evaluate(s.count))
            this.nodeId = s.nodeId
            if (!Number.isInteger(count) || count < 1 || count > 100)
              throw new Error(`Repeat count must be an integer 1–100 at ${s.nodeId}`)
            this.push({ kind: 'repeat', node: s, count: this.repeatTimes(count), iteration: 0 })
            this.emit('loop_start', s.nodeId, before, [`REPEAT: scheduled ${count} iterations`])
            break
          }
          case 'while': {
            const loop: Extract<Frame, { kind: 'while' }> = { kind: 'while', node: s, iteration: 0 }
            this.push(loop)
            if (this.whileChecksFirst()) this.whileIteration(loop)
            else {
              loop.iteration++
              this.push({ kind: 'sequence', body: s.body, index: 0 })
            }
            break
          }
          case 'set': {
            if (!Object.hasOwn(this.variables, s.name) && Object.keys(this.variables).length >= 100)
              throw new Error('Variable limit reached')
            const value = this.evaluate(s.value)
            this.nodeId = s.nodeId
            if (this.variableTypes.has(s.name) && this.variableTypes.get(s.name) !== s.value.type)
              throw new Error(`Variable ${s.name} cannot change type at ${s.nodeId}`)
            this.variableTypes.set(s.name, s.value.type)
            if (!(this.keepsEarlierAssignment() && Object.hasOwn(this.variables, s.name)))
              this.variables[s.name] = value
            this.emit('set', s.nodeId, before, [`${s.name} = ${String(value)}`])
            break
          }
          case 'call': {
            const body = this.functions.get(s.name)
            if (!body) throw new Error(`No function named ${s.name}`)
            if (!this.callRuns()) break
            if (this.depth >= this.limits.callDepth)
              throw new Error('Function call depth reached (maximum 8)')
            this.depth++
            this.emit('call', s.nodeId, before, [
              `FUNCTION_CALL: entered ${s.name}; call stack depth ${this.depth}`,
            ])
            this.push({ kind: 'sequence', body, index: 0, returnNode: s })
            break
          }
          case 'inspect': {
            const result = this.evaluate(s.expression)
            this.nodeId = s.nodeId
            this.emit('inspect', s.nodeId, before, [`Inspected ${String(result)}`], {
              expressionId: s.expression.nodeId,
              operands: [],
              result,
            })
            break
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Run failed'
      this.finish(
        message.toLowerCase().includes('budget') || message.includes('depth reached')
          ? 'budget_exceeded'
          : 'error',
        message,
      )
    }
    return this.events.slice(first)
  }
}
export function execute(
  world: World,
  program: Program,
  signal?: AbortSignal,
  limits: Partial<RunLimits> = {},
): RunResult {
  const machine = new Interpreter(world, program, limits)
  while (!terminal.has(machine.status)) {
    if (signal?.aborted) machine.cancel()
    else machine.step()
  }
  return machine.result
}
/** UI runner yields after <=64 small steps; a real AbortSignal is checked between every step. */
export async function executeAsync(
  world: World,
  program: Program,
  signal?: AbortSignal,
  limits: Partial<RunLimits> = {},
): Promise<RunResult> {
  const machine = new Interpreter(world, program, limits)
  while (!terminal.has(machine.status)) {
    for (let i = 0; i < 64 && !terminal.has(machine.status); i++) {
      if (signal?.aborted) machine.cancel()
      else machine.step()
    }
    if (!terminal.has(machine.status)) await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  return machine.result
}
/** Missing version means the immutable A–E semantics, not today's interpreter. */
export function executeRecorded(world: World, program: Program, version: 1 | 2 = 1): RunResult {
  return version === 1 ? legacyExecute(world, program) : execute(world, program)
}
