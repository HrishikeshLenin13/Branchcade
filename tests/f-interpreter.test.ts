import { describe, expect, it } from 'vitest'
import type { Expression, Program, Statement } from '../src/domain/types'
import { execute, executeAsync, Interpreter } from '../src/interpreter/interpreter'
import { makeWorld } from '../src/engine/world'
import { thresholdProgram } from '../src/missions/catalog'
import { stableHash } from '../src/domain/invariants'
import { validateProgram } from '../src/interpreter/validate'
import {
  nextCodeCursor,
  nextTickCursor,
  ReplayTimeline,
  interpolateRobot,
} from '../src/interpreter/debugger'
import { initialRobot } from '../src/engine/robot'
import { ExecutionEventSchema } from '../src/domain/schemas'
let serial = 0
const n = (value: number): Expression => ({
  nodeId: `n${++serial}`,
  kind: 'literal',
  type: 'number',
  value,
})
const b = (value: boolean): Expression => ({
  nodeId: `b${++serial}`,
  kind: 'literal',
  type: 'boolean',
  value,
})
const p = (body: Statement[]): Program => ({ schemaVersion: 1, id: 'f-tests', body })
const move = (distance = 1): Statement => ({
  nodeId: `move${++serial}`,
  kind: 'move',
  distance: n(distance),
})
const inspect = (expression: Expression): Statement => ({
  nodeId: `inspect${++serial}`,
  kind: 'inspect',
  expression,
})

describe('F4–F6 small-step execution, trace and debugging', () => {
  it.each([
    ['<', false],
    ['<=', true],
  ] as const)('compares exact 20 %s 20 with operands captured once', (op, result) => {
    const program = thresholdProgram(),
      first = program.body[0]!
    if (first.kind === 'if' && first.condition.kind === 'compare') first.condition.op = op
    const run = execute(makeWorld(20), program)
    expect(run.events.filter((e) => e.kind === 'sensor_read')).toHaveLength(1)
    expect(run.events.find((e) => e.kind === 'compare')?.evaluation).toEqual({
      expressionId: 'condition',
      operands: [20, 20],
      result,
    })
    expect(run.events.find((e) => e.kind === 'branch')?.evaluation?.result).toBe(result)
    expect(run.events.at(-1)?.kind).toBe('program_stop')
  })
  it('changing threshold20→30 at distance24 changes actual branch and action', () => {
    expect(
      execute(makeWorld(), thresholdProgram(20)).events.find((e) => e.kind === 'branch')?.evaluation
        ?.result,
    ).toBe(false)
    expect(
      execute(makeWorld(), thresholdProgram(30)).events.find((e) => e.kind === 'branch')?.evaluation
        ?.result,
    ).toBe(true)
  })
  it('is detected short-circuits a null comparison without coercion or error', () => {
    const world = { ...makeWorld(), obstacles: [] },
      program = thresholdProgram(),
      first = program.body[0]!
    if (first.kind !== 'if') throw new Error('fixture')
    first.condition = {
      nodeId: 'guard',
      kind: 'boolean',
      type: 'boolean',
      op: 'and',
      left: {
        nodeId: 'detected',
        kind: 'detected',
        type: 'boolean',
        operand: { nodeId: 'guard-sensor', kind: 'sensor', type: 'number', sensor: 'distance' },
      },
      right: first.condition,
    }
    const run = execute(world, program)
    expect(run.error).toBeNull()
    expect(run.events.some((e) => e.kind === 'compare')).toBe(false)
    expect(run.events.find((e) => e.kind === 'branch')?.evaluation?.result).toBe(false)
  })
  it('repeat executes exactly3 iterations and emits each ordinal', () => {
    const run = execute(
      makeWorld(),
      p([{ nodeId: 'repeat', kind: 'repeat', count: n(3), body: [move()] }]),
    )
    expect(run.robot.position.xCm).toBe(43)
    expect(
      run.events.filter((e) => e.facts[0]?.startsWith('REPEAT_ITERATION:')).map((e) => e.facts[0]),
    ).toEqual(['REPEAT_ITERATION: 1 of 3', 'REPEAT_ITERATION: 2 of 3', 'REPEAT_ITERATION: 3 of 3'])
  })
  it('while re-reads a changed sensor before each iteration and terminates', () => {
    const condition: Expression = {
      nodeId: 'while-condition',
      type: 'boolean',
      kind: 'compare',
      op: '>',
      left: { nodeId: 'while-sensor', kind: 'sensor', type: 'number', sensor: 'distance' },
      right: n(20),
    }
    const run = execute(
      makeWorld(),
      p([{ nodeId: 'while', kind: 'while', condition, body: [move()] }]),
    )
    expect(run.error).toBeNull()
    expect(run.robot.position.xCm).toBe(44)
    expect(
      run.events.filter((e) => e.kind === 'sensor_read').map((e) => e.evaluation?.result),
    ).toEqual([24, 23, 22, 21, 20])
    expect(run.status).toBe('completed')
  })
  it('yields between bounded batches and accepts actual mid-run cancellation', async () => {
    const program = p([{ nodeId: 'loop', kind: 'while', condition: b(true), body: [] }]),
      controller = new AbortController()
    let responsive = false
    const promise = executeAsync(makeWorld(), program, controller.signal)
    setTimeout(() => {
      responsive = true
      controller.abort()
    }, 0)
    const run = await promise
    expect(responsive).toBe(true)
    expect(run.error).toBe('Run cancelled')
    expect(run.status).toBe('stopped')
    expect(run.events.at(-1)?.facts).toEqual(['PROGRAM_STOP: Run cancelled'])
  })
  it('machine transitions ready→running→paused→running→completed; pause has no tick/motion', () => {
    const machine = new Interpreter(makeWorld(), p([move(3)]))
    expect(machine.status).toBe('ready')
    expect(machine.step().length).toBeGreaterThan(0)
    machine.pause()
    expect(machine.status).toBe('paused')
    const snapshot = JSON.stringify(machine.result)
    expect(machine.step()).toEqual([])
    expect(JSON.stringify(machine.result)).toBe(snapshot)
    machine.resume()
    while (machine.status === 'running') expect(machine.step().length).toBeGreaterThan(0)
    expect(machine.status).toBe('completed')
    expect(machine.robot.position.xCm).toBe(43)
    expect(machine.step()).toEqual([])
  })
  it('bounds endless empty loops, instruction events, ticks, trace bytes and call depth', () => {
    const loop = p([{ nodeId: 'loop', kind: 'while', condition: b(true), body: [] }])
    const run = execute(makeWorld(), loop)
    expect(run.status).toBe('budget_exceeded')
    expect(run.events.length).toBeLessThanOrEqual(5000)
    expect(new TextEncoder().encode(JSON.stringify(run.events)).byteLength).toBeLessThanOrEqual(
      4_000_000,
    )
    const physics = execute(makeWorld(), p([move(10)]), undefined, { ticks: 2 })
    expect(physics.robot.tick).toBe(2)
    expect(physics.error).toContain('physics tick limit')
    const bytes = execute(makeWorld(), loop, undefined, { traceBytes: 16384 })
    expect(new TextEncoder().encode(JSON.stringify(bytes.events)).byteLength).toBeLessThanOrEqual(
      16384,
    )
    expect(bytes.error).toContain('trace')
    const recurse = execute(
      makeWorld(),
      p([
        {
          nodeId: 'define',
          kind: 'function',
          name: 'again',
          body: [{ nodeId: 'recursive', kind: 'call', name: 'again' }],
        },
        { nodeId: 'call', kind: 'call', name: 'again' },
      ]),
    )
    expect(Math.max(...recurse.events.map((e) => e.stackDepth))).toBe(8)
    expect(recurse.status).toBe('budget_exceeded')
    expect(() => new Interpreter(makeWorld(), loop, { events: 999999 })).toThrow(
      'Invalid events budget',
    )
  })
  it('reports declarations, actual calls, return, runtime variable values and final reason', () => {
    const run = execute(
      makeWorld(),
      p([
        { nodeId: 'define', kind: 'function', name: 'forward', body: [move()] },
        { nodeId: 'set', kind: 'set', name: 'ready', value: b(true) },
        { nodeId: 'invoke', kind: 'call', name: 'forward' },
        inspect({ nodeId: 'get', kind: 'variable', type: 'boolean', name: 'ready' }),
      ]),
    )
    expect(
      run.events
        .filter((e) => ['function_defined', 'call', 'function_return'].includes(e.kind))
        .map((e) => e.kind),
    ).toEqual(['function_defined', 'call', 'function_return'])
    expect(run.events.find((e) => e.kind === 'inspect')?.evaluation?.result).toBe(true)
    expect(run.events.at(-1)?.facts).toEqual(['PROGRAM_STOP: completion'])
    expect(run.events.every((e) => ExecutionEventSchema.safeParse(e).success)).toBe(true)
  })
  it.each([0, 301, -301])('rejects movement %s outside documented bounds', (distance) => {
    expect(execute(makeWorld(), p([move(distance)])).error).toContain('1–300')
  })
  it('bounds turn/wait/repeat values and prevents variable type changes/reserved names', () => {
    expect(
      execute(makeWorld(), p([{ nodeId: 'turn', kind: 'turn', angle: n(361) }])).error,
    ).toContain('1–360')
    for (const ms of [0, 55, 10050])
      expect(
        execute(makeWorld(), p([{ nodeId: 'wait', kind: 'wait', durationMs: n(ms) }])).error,
      ).toContain('1–200 ticks')
    expect(
      execute(makeWorld(), p([{ nodeId: 'repeat', kind: 'repeat', count: n(101), body: [] }]))
        .error,
    ).toContain('1–100')
    expect(
      execute(
        makeWorld(),
        p([
          { nodeId: 'set', kind: 'set', name: 'v', value: n(1) },
          { nodeId: 'set-again', kind: 'set', name: 'v', value: b(true) },
        ]),
      ).error,
    ).toContain('cannot change type')
    expect(() =>
      validateProgram(p([{ nodeId: 'bad', kind: 'set', name: 'constructor', value: n(1) }])),
    ).toThrow(/reserved/)
    expect(() =>
      validateProgram(
        p([
          { nodeId: 'd1', kind: 'function', name: 'same', body: [] },
          { nodeId: 'd2', kind: 'function', name: 'same', body: [] },
        ]),
      ),
    ).toThrow('Duplicate function same at d2')
  })
  it('returns a source block in malformed type/input errors', () => {
    const program = p([inspect(n(1))])
    const statement = program.body[0]!
    if (statement.kind === 'inspect') statement.expression.type = 'color'
    expect(() => validateProgram(program)).toThrow(/Literal type mismatch at n/)
    expect(() =>
      validateProgram({
        schemaVersion: 1,
        id: 'bad',
        body: [{ nodeId: 'bad-move', kind: 'move' }],
      }),
    ).toThrow(/at bad-move/)
  })
  it('captures exact collision contact and stops later instructions', () => {
    const run = execute(makeWorld(), p([move(50), inspect(n(99))]))
    expect(run.robot.position.xCm).toBe(64)
    expect(run.events.find((e) => e.kind === 'collision')?.after.position.xCm).toBe(64)
    expect(run.events.some((e) => e.kind === 'inspect')).toBe(false)
    expect(run.events.at(-1)?.facts).toEqual(['PROGRAM_STOP: collision'])
  })
  it('uses identical seed/hashes across repeated, async and step-by-step execution', async () => {
    const world = { ...makeWorld(), sensorConfig: { ...makeDefaultSensor(), noiseSeed: 4321 } },
      program = thresholdProgram()
    const a = execute(world, program),
      b = await executeAsync(world, program)
    expect(await stableHash(a.events)).toBe(await stableHash(b.events))
    expect(a).toEqual(execute(world, program))
  })
  it('step tick advances exactly50ms; step code spans a full motor action; rewind is immutable', () => {
    const world = makeWorld(),
      run = execute(
        world,
        p([
          move(10),
          { nodeId: 'turn', kind: 'turn', angle: n(90) },
          { nodeId: 'wait', kind: 'wait', durationMs: n(100) },
        ]),
      )
    const before = JSON.stringify(run),
      timeline = new ReplayTimeline(world, run.events)
    let cursor = 0
    for (let tick = 1; tick <= 32; tick++) {
      cursor = nextTickCursor(run.events, cursor)
      expect(timeline.at(cursor).tick).toBe(tick)
    }
    expect(nextCodeCursor(run.events, 0)).toBe(10)
    expect(timeline.at(0)).toEqual(initialRobot(world))
    expect(timeline.at(run.events.length)).toEqual(run.robot)
    expect(JSON.stringify(run)).toBe(before)
  })
  it('caps snapshot ring at64 entries and reconstructs evicted states exactly', () => {
    const world = makeWorld(),
      run = execute(
        world,
        p([
          {
            nodeId: 'repeat',
            kind: 'repeat',
            count: n(100),
            body: [{ nodeId: 'wait', kind: 'wait', durationMs: n(1000) }],
          },
        ]),
      )
    const timeline = new ReplayTimeline(world, run.events)
    for (let i = 0; i <= run.events.length; i++) timeline.at(i)
    expect(timeline.snapshotCount).toBe(64)
    expect(timeline.at(0)).toEqual(initialRobot(world))
    expect(timeline.at(run.events.length)).toEqual(run.robot)
  })
  it('interpolates only display position/shortest heading and does not change logical ticks', () => {
    const before = initialRobot(makeWorld()),
      after = { ...before, position: { xCm: 50, yCm: 60 }, headingDeg: 10, tick: 1 }
    before.headingDeg = 350
    const view = interpolateRobot(before, after, 0.5)
    expect(view.position).toEqual({ xCm: 45, yCm: 55 })
    expect(view.headingDeg).toBe(0)
    expect(view.tick).toBe(0)
    expect(after.tick).toBe(1)
  })
})
function makeDefaultSensor() {
  return {
    schemaVersion: 1 as const,
    maxRangeCm: 100,
    originOffset: { xCm: 6, yCm: 0 },
    readingHz: 20 as const,
    colorOffset: { xCm: 0, yCm: 0 },
    normalization: 'null-out-of-range;heading-0-360;cm' as const,
  }
}
