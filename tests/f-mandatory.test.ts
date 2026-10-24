/** Part F6 "mandatory numerical tests", one assertion block per listed requirement so a
 * reviewer can map the specification to evidence without searching several suites. */
import { describe, expect, it } from 'vitest'
import type { Program, World } from '../src/domain/types'
import { makeDefaultWorld, makeWorld } from '../src/engine/world'
import { initialRobot, advanceRobot } from '../src/engine/robot'
import { reduceRobot } from '../src/engine/reducer'
import { readSensors } from '../src/engine/sensors'
import { execute, Interpreter } from '../src/interpreter/interpreter'
import { thresholdProgram } from '../src/missions/catalog'
import { stableHash } from '../src/domain/invariants'
import { revealCursor } from '../src/features/lab/useTracePlayback'
import { replayAt } from '../src/engine/replay'

const room = (): World => ({ ...makeDefaultWorld(), obstacles: [] })
const num = (nodeId: string, value: number) =>
  ({ nodeId, kind: 'literal', type: 'number', value }) as const
const program = (body: Program['body']): Program => ({ schemaVersion: 1, id: 'f6', body })

describe('F6 mandatory numerical tests', () => {
  it('(100,100) heading 0 in an empty 600cm room: sensor origin 116 → right wall 484cm', () => {
    const world = room()
    const s = readSensors(world, initialRobot(world))
    expect(s.ray.origin).toEqual({ xCm: 116, yCm: 100 })
    expect(s.distanceCm).toBe(600 - 116)
    expect(s.ray.hitId).toBe('world-boundary')
  })
  it('a wall at x=250 changes the reading to 250-116 = 134cm', () => {
    const world = room()
    world.obstacles.push({
      id: 'wall',
      kind: 'rectangle',
      position: { xCm: 250, yCm: 0 },
      widthCm: 10,
      heightCm: 360,
      solid: true,
      material: 'wood',
    })
    const s = readSensors(world, initialRobot(world))
    expect(s.distanceCm).toBe(134)
    expect(s.ray.hitId).toBe('wall')
  })
  it('heading 90° points down (+y): origin (100,116), floor wall 244cm', () => {
    const world = room()
    const s = readSensors(world, { ...initialRobot(world), headingDeg: 90 })
    expect(s.ray.origin.xCm).toBeCloseTo(100, 9)
    expect(s.ray.origin.yCm).toBeCloseTo(116, 9)
    expect(s.distanceCm).toBeCloseTo(244, 9)
  })
  it.each([
    ['<', false],
    ['<=', true],
  ] as const)('exact 20 %s 20 evaluates %s', (op, expected) => {
    const p = thresholdProgram(20)
    const first = p.body[0]!
    if (first.kind === 'if' && first.condition.kind === 'compare') first.condition.op = op
    const compare = execute(makeWorld(20), p).events.find((e) => e.kind === 'compare')!
    expect(compare.evaluation).toMatchObject({ operands: [20, 20], result: expected })
  })
  it('color sensor reads white outside zones and black inside a black zone', () => {
    const world = room()
    expect(readSensors(world, initialRobot(world)).surfaceColor).toBe('white')
    world.floorZones.push({
      id: 'line',
      kind: 'rectangle',
      position: { xCm: 90, yCm: 0 },
      widthCm: 20,
      heightCm: 360,
      color: 'black',
      priority: 0,
    })
    expect(readSensors(world, initialRobot(world)).surfaceColor).toBe('black')
  })
  it('collision at the right edge and at a corner stops at contact without penetration', () => {
    const world = room()
    const right = advanceRobot(
      { ...initialRobot(world), status: 'running', speedCmPerSec: 100_000 },
      world,
    )
    expect(right.position.xCm).toBe(600 - 16)
    expect(right.collision).toBe('world-boundary')
    const corner = advanceRobot(
      {
        ...initialRobot(world),
        position: { xCm: 560, yCm: 320 },
        headingDeg: 45,
        status: 'running',
        speedCmPerSec: 100_000,
      },
      world,
    )
    expect(corner.position.xCm).toBeLessThanOrEqual(584 + 1e-9)
    expect(corner.position.yCm).toBeLessThanOrEqual(344 + 1e-9)
    expect(corner.collision).toBe('world-boundary')
  })
  it('the sensor never skips a wall when its origin sits on or past that wall', () => {
    const world = room()
    const robot = { ...initialRobot(world), position: { xCm: 590, yCm: 100 } }
    // Origin is 606cm (past the 600cm wall); the reading is 0, not the far floor/ceiling.
    expect(readSensors(world, robot).distanceCm).toBe(0)
  })
  it('repeat 3 runs exactly 3 iterations', () => {
    const run = execute(
      makeWorld(),
      program([
        {
          nodeId: 'r',
          kind: 'repeat',
          count: num('c', 3),
          body: [{ nodeId: 'm', kind: 'move', distance: num('d', 1) }],
        },
      ]),
    )
    expect(run.events.filter((e) => e.kind === 'repeat_iteration').map((e) => e.facts[0])).toEqual([
      'REPEAT_ITERATION: 1 of 3',
      'REPEAT_ITERATION: 2 of 3',
      'REPEAT_ITERATION: 3 of 3',
    ])
  })
  it('while distance > 20 terminates once the re-read sensor changes', () => {
    const run = execute(
      makeWorld(30),
      program([
        {
          nodeId: 'w',
          kind: 'while',
          condition: {
            nodeId: 'cond',
            kind: 'compare',
            type: 'boolean',
            op: '>',
            left: { nodeId: 's', kind: 'sensor', type: 'number', sensor: 'distance' },
            right: num('t', 20),
          },
          body: [{ nodeId: 'm', kind: 'move', distance: num('d', 1) }],
        },
      ]),
    )
    expect(run.status).toBe('completed')
    const last = run.events.filter((e) => e.kind === 'compare').at(-1)!
    expect(last.evaluation?.result).toBe(false)
    expect(Number(last.evaluation?.operands[0])).toBeLessThanOrEqual(20)
  })
  it('while true hits the safety budget instead of hanging', () => {
    const run = execute(
      makeWorld(),
      program([
        {
          nodeId: 'w',
          kind: 'while',
          condition: { nodeId: 't', kind: 'literal', type: 'boolean', value: true },
          body: [],
        },
      ]),
    )
    expect(run.status).toBe('budget_exceeded')
    expect(run.events.at(-1)?.kind).toBe('program_stop')
  })
  it('two sequential runs with the same program/world hash produce identical traces', async () => {
    const a = execute(makeWorld(24), thresholdProgram())
    const b = execute(makeWorld(24), thresholdProgram())
    expect(await stableHash(a.events)).toBe(await stableHash(b.events))
  })
  it('editing the threshold 20→30 at distance 24 flips the branch', () => {
    const branch = (t: number) =>
      execute(makeWorld(24), thresholdProgram(t)).events.find((e) => e.kind === 'branch')!
    expect(branch(20).facts).toEqual(['24 < 20 is false', 'Else branch selected'])
    expect(branch(30).facts).toEqual(['24 < 30 is true', 'Then branch selected'])
  })
  it('4× playback reveals the same events and final state as 1×', () => {
    const run = execute(makeWorld(24), thresholdProgram())
    const end = run.events.at(-1)!.elapsedMs
    const play = (speed: number) => {
      let cursor = 0
      for (let wall = 0; cursor < run.events.length; wall += 16)
        cursor = revealCursor(run.events, cursor, wall * speed)
      return cursor
    }
    expect(end).toBeGreaterThan(0)
    expect(play(4)).toBe(play(1))
    expect(replayAt(makeWorld(24), run.events, play(4))).toEqual(run.robot)
  })
  it('a paused robot and a paused interpreter never move', () => {
    const world = makeWorld()
    const moving = { ...initialRobot(world), status: 'running' as const, speedCmPerSec: 20 }
    const paused = reduceRobot(moving, { type: 'pause' }, world)
    expect(reduceRobot(paused, { type: 'tick' }, world).position).toEqual(moving.position)
    const machine = new Interpreter(world, thresholdProgram())
    machine.pause()
    expect(machine.step()).toEqual([])
    expect(machine.robot.tick).toBe(0)
  })
})
