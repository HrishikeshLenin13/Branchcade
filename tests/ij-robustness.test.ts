import { afterEach, describe, expect, it } from 'vitest'
import * as Blockly from 'blockly/core'
import { Interpreter, execute, executeAsync } from '../src/interpreter/interpreter'
import { editableProgram, programWorkspace } from '../src/interpreter/blockly-workspace'
import { ReplayTimeline } from '../src/interpreter/debugger'
import { stableHash } from '../src/domain/invariants'
import { WorldSchema } from '../src/domain/schemas'
import { makeDefaultWorld } from '../src/engine/world'
import {
  clearModelCache,
  modelCacheStats,
  MODEL_CACHE_LIMITS,
  runModel,
} from '../src/learning/mental-models'
import { NO_MISCONCEPTION } from '../src/learning/taxonomy'
import {
  largeEditorProgram,
  longTraceProgram,
  nestedProgram,
  obstacleHeavyWorld,
} from './ij-fixtures'
afterEach(clearModelCache)

describe('I/J stress coverage beyond authored curriculum', () => {
  it('executes 1300+ preserved events in a legal 100-solid world and reconstructs every sampled state', async () => {
    const world = obstacleHeavyWorld(),
      program = longTraceProgram()
    expect(WorldSchema.safeParse(world).success).toBe(true)
    const before = JSON.stringify({ world, program }),
      run = execute(world, program)
    expect(run.error).toBeNull()
    expect(run.events.length).toBeGreaterThan(1200)
    expect(run.events.filter((event) => event.kind === 'inspect')).toHaveLength(600)
    const timeline = new ReplayTimeline(world, run.events)
    for (let cursor = 1; cursor < run.events.length; cursor += 17)
      expect(timeline.at(cursor)).toEqual(run.events[cursor - 1]!.after)
    expect(timeline.at(run.events.length)).toEqual(run.robot)
    expect(await stableHash(run.events)).toBe(
      await stableHash((await executeAsync(world, program)).events),
    )
    expect(JSON.stringify({ world, program })).toBe(before)
  })
  it('bounds retained full model traces by bytes as well as entry count and recomputes evictions identically', () => {
    const world = obstacleHeavyWorld(),
      program = longTraceProgram(),
      original = structuredClone(runModel('first-stress-run', world, program, NO_MISCONCEPTION))
    for (let index = 0; index < 24; index++)
      runModel(`stress-${index}`, world, program, NO_MISCONCEPTION)
    const stats = modelCacheStats()
    expect(stats.traceBytes).toBeLessThanOrEqual(MODEL_CACHE_LIMITS.bytes)
    expect(stats.entries).toBeLessThan(24)
    expect(runModel('first-stress-run', world, program, NO_MISCONCEPTION)).toEqual(original)
    clearModelCache()
    expect(modelCacheStats()).toMatchObject({ entries: 0, traceBytes: 0 })
  })
  it('the interpreter reports its exact trace UTF-8 size without a second serialization in cache users', () => {
    const machine = new Interpreter(makeDefaultWorld(), largeEditorProgram())
    while (!['completed', 'stopped', 'error', 'budget_exceeded'].includes(machine.status))
      machine.step()
    expect(machine.traceByteLength).toBe(
      new TextEncoder().encode(JSON.stringify(machine.events)).byteLength,
    )
  })
  it('round-trips a user-created 180-statement Blockly program without losing disconnected validation', () => {
    const ws = new Blockly.Workspace()
    try {
      const input = largeEditorProgram()
      Blockly.serialization.workspaces.load(programWorkspace(input), ws)
      const edited = editableProgram(ws)
      expect(edited.body).toHaveLength(180)
      expect(
        execute(makeDefaultWorld(), edited).events.filter((event) => event.kind === 'inspect'),
      ).toHaveLength(180)
      ws.newBlock('bc_stop')
      expect(() => editableProgram(ws)).toThrow(/Connect all blocks/)
    } finally {
      ws.dispose()
    }
  })
  it('thirty-two seeded nested loop/call/assignment programs match an independent arithmetic oracle', async () => {
    const world = makeDefaultWorld()
    for (let seed = 0; seed < 32; seed++) {
      const program = nestedProgram(seed),
        run = execute(world, program),
        expected = (seed % 11) + (1 + (seed % 5)) * (1 + (seed % 3))
      expect(run.error).toBeNull()
      expect(run.events.findLast((event) => event.kind === 'inspect')?.evaluation?.result).toBe(
        expected,
      )
      expect(run.events.filter((event) => event.kind === 'call')).toHaveLength(1 + (seed % 5))
      expect(await executeAsync(world, program)).toEqual(run)
    }
  })
  it('repeated async cancellation terminates once, leaves source unchanged and permits the next run', async () => {
    const world = obstacleHeavyWorld(),
      program = longTraceProgram(),
      source = JSON.stringify(program)
    for (let index = 0; index < 8; index++) {
      const controller = new AbortController(),
        pending = executeAsync(world, program, controller.signal)
      setTimeout(() => controller.abort(), 0)
      const run = await pending
      expect(run.error).toBe('Run cancelled')
      expect(run.events.filter((event) => event.kind === 'program_stop')).toHaveLength(1)
      expect(run.events.length).toBeLessThan(1200)
      expect(run.robot.speedCmPerSec).toBe(0)
    }
    expect(JSON.stringify(program)).toBe(source)
    expect(execute(world, largeEditorProgram(5)).error).toBeNull()
  })
  it('seeded signed movement at 48 headings preserves centimeter displacement and logical tick time', () => {
    const world = {
      ...makeDefaultWorld(),
      id: 'seeded-open-room',
      widthCm: 2000,
      heightCm: 2000,
      obstacles: [],
      spawn: { ...makeDefaultWorld().spawn, position: { xCm: 1000, yCm: 1000 } },
    }
    for (let seed = 0; seed < 48; seed++) {
      const heading = (seed * 137) % 360,
        distance = (seed % 2 ? -1 : 1) * (1 + ((seed * 53) % 299)),
        input = { ...world, spawn: { ...world.spawn, headingDeg: heading } },
        program = {
          schemaVersion: 1 as const,
          id: 'signed-motion',
          body: [
            {
              nodeId: 'move',
              kind: 'move' as const,
              distance: {
                nodeId: 'cm',
                kind: 'literal' as const,
                type: 'number' as const,
                value: distance,
              },
            },
          ],
        },
        run = execute(input, program),
        radians = (heading * Math.PI) / 180
      expect(run.error).toBeNull()
      expect(run.robot.position.xCm).toBeCloseTo(1000 + Math.cos(radians) * distance, 7)
      expect(run.robot.position.yCm).toBeCloseTo(1000 + Math.sin(radians) * distance, 7)
      expect(run.robot.simTimeMs).toBe(run.robot.tick * 50)
      expect(run.robot.collision).toBeNull()
    }
  })
})
