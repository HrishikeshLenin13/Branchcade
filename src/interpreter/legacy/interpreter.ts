import type {
  Program,
  Expression,
  Statement,
  Value,
  ExecutionEvent,
  World,
  RobotState,
} from '../../domain/types'
import { FIXED_STEP_MS } from '../../domain/constants'
import { LEGACY_LIMITS as LIMITS } from './limits'
import { WorldSchema } from './world-schema'
import { assertBounded } from '../../domain/invariants'
import { initialRobot, advanceRobot } from './robot'
import { readSensors } from './sensors'
import { validateProgram } from './validate'
export type RunResult = { events: ExecutionEvent[]; robot: RobotState; error: string | null }
export function execute(worldInput: World, programInput: Program, signal?: AbortSignal): RunResult {
  assertBounded(worldInput)
  const world = WorldSchema.parse(worldInput),
    program = validateProgram(programInput)
  let robot = initialRobot(world),
    instructions = 0,
    depth = 0,
    halted = false
  const events: ExecutionEvent[] = [],
    variables: Record<string, Value> = Object.create(null) as Record<string, Value>,
    functions = new Map<string, Statement[]>()
  const budget = () => {
    if (signal?.aborted) throw new Error('Run cancelled')
    if (
      ++instructions > LIMITS.instructions ||
      robot.tick > LIMITS.ticks ||
      events.length >= LIMITS.events
    )
      throw new Error('Run budget reached. Reduce repeats or make the loop condition change.')
  }
  const number = (v: Value) => {
    if (typeof v !== 'number' || !Number.isFinite(v))
      throw new Error('Expected a finite number; distance may be out of range')
    return v
  }
  const boolean = (v: Value) => {
    if (typeof v !== 'boolean') throw new Error('Expected a boolean condition')
    return v
  }
  const evaluate = (e: Expression): Value => {
    budget()
    switch (e.kind) {
      case 'literal':
        return e.value
      case 'sensor': {
        const s = readSensors(world, robot)
        return e.sensor === 'distance' ? s.distanceCm : s.surfaceColor
      }
      case 'variable': {
        if (!Object.hasOwn(variables, e.name))
          throw new Error(`Variable ${e.name} has not been set`)
        const result = variables[e.name]!
        if (
          result !== null &&
          ((e.type === 'number' && typeof result !== 'number') ||
            (e.type === 'boolean' && typeof result !== 'boolean') ||
            (e.type === 'color' && typeof result !== 'string'))
        )
          throw new Error(`Variable type mismatch at ${e.nodeId}`)
        return result
      }
      case 'arithmetic': {
        const a = number(evaluate(e.left)),
          b = number(evaluate(e.right))
        if (e.op === '/' && b === 0) throw new Error(`Division by zero at ${e.nodeId}`)
        const result = e.op === '+' ? a + b : e.op === '-' ? a - b : e.op === '*' ? a * b : a / b
        if (!Number.isFinite(result) || Math.abs(result) > 1_000_000)
          throw new Error('Arithmetic exceeds numeric limits')
        return result
      }
      case 'compare': {
        const a = evaluate(e.left),
          b = evaluate(e.right)
        if (a === null || b === null) return false
        switch (e.op) {
          case '==':
            return a === b
          case '!=':
            return a !== b
          case '<':
            return number(a) < number(b)
          case '<=':
            return number(a) <= number(b)
          case '>':
            return number(a) > number(b)
          case '>=':
            return number(a) >= number(b)
        }
        throw new Error('Invalid comparator')
      }
      case 'boolean':
        return e.op === 'and'
          ? boolean(evaluate(e.left)) && boolean(evaluate(e.right))
          : boolean(evaluate(e.left)) || boolean(evaluate(e.right))
      case 'not':
        return !boolean(evaluate(e.operand))
      case 'detected':
        throw new Error('Is detected requires engine version 2')
    }
  }
  const emit = (
    s: Statement,
    kind: ExecutionEvent['kind'],
    before: RobotState,
    facts: string[],
    evaluation: ExecutionEvent['evaluation'] = null,
  ) => {
    budget()
    events.push({
      schemaVersion: 1,
      seq: events.length,
      tick: robot.tick,
      elapsedMs: robot.simTimeMs,
      nodeId: s.nodeId,
      kind,
      before: structuredClone(before),
      after: structuredClone(robot),
      sensor: readSensors(world, before),
      evaluation,
      variables: { ...variables },
      stackDepth: depth,
      facts,
      cause: robot.collision,
    })
  }
  const tick = () => {
    budget()
    robot = advanceRobot(robot, world)
  }
  const walk = (body: Statement[]) => {
    for (const s of body) {
      if (halted) return
      budget()
      const before = structuredClone(robot)
      switch (s.kind) {
        case 'function':
          break // Declaration registers code; it never invokes it.
        case 'move': {
          const d = number(evaluate(s.distance))
          if (Math.abs(d) > 1000) throw new Error(`Move too long at ${s.nodeId}`)
          let remaining = Math.abs(d)
          robot = { ...robot, status: 'running' }
          while (remaining > 1e-9) {
            const step = Math.min(remaining, (20 * FIXED_STEP_MS) / 1000)
            robot.speedCmPerSec = (Math.sign(d) * step) / (FIXED_STEP_MS / 1000)
            const prior = structuredClone(robot)
            tick()
            emit(s, 'move', prior, [
              `Moved ${Math.hypot(robot.position.xCm - prior.position.xCm, robot.position.yCm - prior.position.yCm).toFixed(2)} cm; requested ${step.toFixed(2)} cm`,
              robot.collision ? `Stopped at ${robot.collision}` : 'No collision',
            ])
            remaining -= step
            if (robot.collision) {
              halted = true
              break
            }
          }
          robot = { ...robot, speedCmPerSec: 0 }
          break
        }
        case 'turn': {
          const angle = number(evaluate(s.angle))
          if (Math.abs(angle) > 3600) throw new Error('Turn exceeds limit')
          let left = Math.abs(angle)
          robot = { ...robot, status: 'running', speedCmPerSec: 0 }
          while (left > 1e-9) {
            const step = Math.min(left, (90 * FIXED_STEP_MS) / 1000)
            robot.turnDegPerSec = (Math.sign(angle) * step) / (FIXED_STEP_MS / 1000)
            tick()
            left -= step
          }
          robot.turnDegPerSec = 0
          emit(s, 'turn', before, [`Turned ${angle} degrees`])
          break
        }
        case 'wait': {
          const ms = number(evaluate(s.durationMs))
          if (ms < 0 || ms > 30_000) throw new Error('Wait must be 0–30000 ms')
          robot = { ...robot, status: 'running', speedCmPerSec: 0, turnDegPerSec: 0 }
          for (let t = 0; t < Math.ceil(ms / FIXED_STEP_MS); t++) tick()
          emit(s, 'wait', before, [`Waited ${Math.ceil(ms / FIXED_STEP_MS) * FIXED_STEP_MS} ms`])
          break
        }
        case 'stop':
          robot = {
            ...robot,
            status: 'stopped',
            speedCmPerSec: 0,
            turnDegPerSec: 0,
            stopReason: 'program-stop',
          }
          emit(s, 'stop', before, ['Program requested stop'])
          halted = true
          break
        case 'if': {
          const result = boolean(evaluate(s.condition))
          const e = s.condition
          const operands = e.kind === 'compare' ? [evaluate(e.left), evaluate(e.right)] : [result]
          const fact =
            e.kind === 'compare'
              ? `${String(operands[0])} ${e.op} ${String(operands[1])} is ${result}`
              : `Condition is ${result}`
          emit(s, 'branch', before, [fact, `${result ? 'Then' : 'Else'} branch selected`], {
            expressionId: e.nodeId,
            operands,
            result,
          })
          walk(result ? s.then : s.else)
          break
        }
        case 'repeat': {
          const count = number(evaluate(s.count))
          if (!Number.isInteger(count) || count < 0 || count > 1000)
            throw new Error('Repeat count must be an integer 0–1000')
          for (let i = 0; i < count && !halted; i++) {
            budget()
            walk(s.body)
          }
          break
        }
        case 'while':
          while (!halted && boolean(evaluate(s.condition))) {
            budget()
            walk(s.body)
          }
          break
        case 'set':
          if (!Object.hasOwn(variables, s.name) && Object.keys(variables).length >= 100)
            throw new Error('Variable limit reached')
          variables[s.name] = evaluate(s.value)
          emit(s, 'set', before, [`${s.name} = ${String(variables[s.name])}`])
          break
        case 'call': {
          const fn = functions.get(s.name)
          if (!fn) throw new Error(`No function named ${s.name}`)
          if (depth >= LIMITS.stack) throw new Error('Function call depth reached')
          depth++
          emit(s, 'call', before, [`Called ${s.name}`])
          walk(fn)
          depth--
          break
        }
        case 'inspect': {
          const result = evaluate(s.expression)
          emit(s, 'inspect', before, [`Inspected ${String(result)}`], {
            expressionId: s.expression.nodeId,
            operands: [],
            result,
          })
          break
        }
      }
    }
  }
  try {
    for (const s of program.body)
      if (s.kind === 'function') {
        if (functions.has(s.name)) throw new Error(`Duplicate function ${s.name}`)
        functions.set(s.name, s.body)
      }
    walk(program.body)
    if (!halted) robot = { ...robot, status: 'completed', speedCmPerSec: 0, turnDegPerSec: 0 }
    if (events.length) events[events.length - 1]!.after = structuredClone(robot)
    return { events, robot, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Run failed'
    robot = { ...robot, status: 'error', speedCmPerSec: 0, turnDegPerSec: 0, stopReason: message }
    return { events, robot, error: message }
  }
}
