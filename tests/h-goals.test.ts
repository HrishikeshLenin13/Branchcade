/** Part H goal kinds, judged from real runs only. */
import { describe, expect, it } from 'vitest'
import type { Goal, Program, World } from '../src/domain/types'
import { execute } from '../src/interpreter/interpreter'
import { judgeGoals, describeGoal } from '../src/missions/goals'
import {
  lineWorld,
  move,
  program,
  stop,
  turn,
  compare,
  floor,
  colorLit,
  lit,
} from '../src/learning/scenarios'
import { makeWorld } from '../src/engine/world'
import { GoalSchema } from '../src/domain/schemas'

const passes = (world: World, p: Program, goal: Goal) =>
  judgeGoals(world, execute(world, p), [goal]).passed

describe('Part H goal kinds', () => {
  it('programmed-stop needs a stop block and no collision', () => {
    const goal: Goal = { kind: 'programmed-stop' }
    expect(passes(makeWorld(24), program('a', [move('m', 5), stop()]), goal)).toBe(true)
    expect(passes(makeWorld(24), program('b', [move('m', 5)]), goal)).toBe(false)
    expect(passes(makeWorld(24), program('c', [move('m', 40), stop()]), goal)).toBe(false)
  })
  it('final-distance reads the real sensor at the end, including the open-range case', () => {
    expect(
      passes(makeWorld(24), program('a', [move('m', 10), stop()]), {
        kind: 'final-distance',
        minCm: 10,
        maxCm: 14,
      }),
    ).toBe(true)
    expect(
      passes(makeWorld(24), program('b', [move('m', 18), stop()]), {
        kind: 'final-distance',
        minCm: 10,
      }),
    ).toBe(false)
    const open = { ...makeWorld(), obstacles: [] }
    expect(passes(open, program('c', [stop()]), { kind: 'final-distance', minCm: 5 })).toBe(true)
    expect(
      passes(open, program('d', [stop()]), { kind: 'final-distance', minCm: 5, maxCm: 20 }),
    ).toBe(false)
  })
  it('path requires the waypoints in order, so overshooting or skipping fails', () => {
    const world = { ...makeWorld(), obstacles: [] }
    const square = program('sq', [move('a', 10), turn('t', 90), move('b', 10), stop()])
    const goal: Goal = {
      kind: 'path',
      points: [
        { xCm: 50, yCm: 50 },
        { xCm: 50, yCm: 60 },
      ],
      toleranceCm: 0.5,
    }
    expect(passes(world, square, goal)).toBe(true)
    expect(passes(world, square, { ...goal, points: [...goal.points].reverse() })).toBe(false)
  })
  it('color-stop-within uses the sensor footprint entering the zone, not the robot outline', () => {
    const world = lineWorld(20)
    const loop: Program = program('line', [
      {
        nodeId: 'w',
        kind: 'while',
        condition: compare('c', '==', floor(), colorLit('white', 'white')),
        body: [move('m', 1)],
      },
      stop(),
    ])
    const goal: Goal = { kind: 'color-stop-within', color: 'black', ticks: 2 }
    expect(passes(world, loop, goal)).toBe(true)
    // Driving over the line and stopping later is not a timely programmed stop.
    expect(passes(world, program('late', [move('m', 25), stop()]), goal)).toBe(false)
    // Stopping before the footprint reaches the line is not a stop on the line.
    expect(passes(world, program('early', [move('m', 15), stop()]), goal)).toBe(false)
  })
  it('counts loop iterations from repeat_iteration events', () => {
    const p = program('r', [
      { nodeId: 'laps', kind: 'repeat', count: lit('n', 3), body: [move('m', 2)] },
      stop(),
    ])
    const world = { ...makeWorld(), obstacles: [] }
    expect(passes(world, p, { kind: 'event', eventKind: 'repeat_iteration', count: 3 })).toBe(true)
    expect(passes(world, p, { kind: 'event', eventKind: 'repeat_iteration', count: 4 })).toBe(false)
  })
  it('every new goal validates and has learner-readable text', () => {
    const goals: Goal[] = [
      { kind: 'programmed-stop' },
      { kind: 'final-distance', minCm: 10, maxCm: 14 },
      { kind: 'path', points: [{ xCm: 1, yCm: 2 }], toleranceCm: 1 },
      { kind: 'color-stop-within', color: 'black', ticks: 2 },
    ]
    for (const g of goals) {
      expect(GoalSchema.parse(g)).toEqual(g)
      expect(describeGoal(g).length).toBeGreaterThan(15)
    }
  })
})
