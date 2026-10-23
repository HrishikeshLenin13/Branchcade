import { describe, it, expect } from 'vitest'
import { rayRectangle, rayCircle, containsZone } from '../src/engine/geometry'
import { makeWorld, DEFAULT_SENSOR } from '../src/engine/world'
import { initialRobot, advanceRobot } from '../src/engine/robot'
import { readSensors } from '../src/engine/sensors'
import { reduceRobot } from '../src/engine/reducer'
import { execute } from '../src/interpreter/interpreter'
import { thresholdProgram, FIRST_MISSION } from '../src/missions/catalog'
import { replayAt } from '../src/engine/replay'
import { judgeGoals } from '../src/missions/goals'
import {
  ExecutionEventSchema,
  SensorSnapshotSchema,
  RobotStateSchema,
  WorldSchema,
} from '../src/domain/schemas'
describe('centimeter geometry', () => {
  it.each([
    [1, 0, 4],
    [0, 1, 4],
    [-1, 0, 4],
    [0, -1, 4],
  ])('casts in quadrant %#', (x, y, d) => {
    expect(
      rayRectangle(
        { xCm: 0, yCm: 0 },
        { xCm: x!, yCm: y! },
        { xCm: x! > 0 ? 4 : -6, yCm: y! > 0 ? 4 : -6 },
        x === 0 ? 12 : 2,
        y === 0 ? 12 : 2,
      ),
    ).toBe(d)
  })
  it('handles parallel misses and exact-origin boundaries', () => {
    expect(
      rayRectangle({ xCm: 0, yCm: 0 }, { xCm: 0, yCm: 1 }, { xCm: 2, yCm: 2 }, 2, 2),
    ).toBeNull()
    expect(rayRectangle({ xCm: 2, yCm: 2 }, { xCm: 1, yCm: 0 }, { xCm: 2, yCm: 2 }, 2, 2)).toBe(0)
  })
  it('handles circle tangency and misses', () => {
    expect(rayCircle({ xCm: 0, yCm: 0 }, { xCm: 1, yCm: 0 }, { xCm: 5, yCm: 1 }, 1)).toBe(5)
    expect(rayCircle({ xCm: 0, yCm: 0 }, { xCm: 1, yCm: 0 }, { xCm: 5, yCm: 2 }, 1)).toBeNull()
  })
  it('contains polygon and rectangle edges inclusively', () => {
    const z = {
      id: 'a',
      kind: 'polygon' as const,
      points: [
        { xCm: 0, yCm: 0 },
        { xCm: 10, yCm: 0 },
        { xCm: 0, yCm: 10 },
      ],
      color: 'black' as const,
      priority: 1,
    }
    expect(containsZone({ xCm: 5, yCm: 5 }, z)).toBe(true)
    expect(containsZone({ xCm: 9, yCm: 9 }, z)).toBe(false)
  })
})
describe('passive measurements and fixed steps', () => {
  it('measures 24 cm from the front sensor, not robot center', () => {
    const w = makeWorld(),
      r = initialRobot(w),
      before = structuredClone(r)
    expect(readSensors(w, r).distanceCm).toBe(24)
    expect(r).toEqual(before)
  })
  it.each([0, 90, 180, 270])('normalizes cardinal heading %s', (heading) => {
    const w = makeWorld(),
      r = { ...initialRobot(w), headingDeg: heading }
    expect(SensorSnapshotSchema.safeParse(readSensors(w, r)).success).toBe(true)
  })
  it('returns null out of range and max range ray metadata', () => {
    const w = makeWorld()
    w.obstacles = []
    const s = readSensors(w, initialRobot(w), { ...DEFAULT_SENSOR, maxRangeCm: 5 })
    expect(s.distanceCm).toBeNull()
    expect(s.ray.hitId).toBeNull()
    expect(s.ray.end.xCm - s.ray.origin.xCm).toBe(5)
  })
  it('uses highest floor priority with stable ID tie', () => {
    const w = makeWorld()
    w.floorZones = [
      {
        id: 'b',
        kind: 'rectangle',
        position: { xCm: 0, yCm: 0 },
        widthCm: 100,
        heightCm: 100,
        color: 'red',
        priority: 1,
      },
      {
        id: 'a',
        kind: 'rectangle',
        position: { xCm: 0, yCm: 0 },
        widthCm: 100,
        heightCm: 100,
        color: 'black',
        priority: 1,
      },
    ]
    expect(readSensors(w, initialRobot(w)).surfaceColor).toBe('black')
  })
  it('does not move on a paused tick and reset is exact', () => {
    const w = makeWorld(),
      r = { ...initialRobot(w), status: 'running' as const, speedCmPerSec: 20 }
    const paused = reduceRobot(r, { type: 'pause' }, w)
    expect(reduceRobot(paused, { type: 'tick' }, w)).toEqual(paused)
    expect(reduceRobot(advanceRobot(r, w), { type: 'reset' }, w)).toEqual(initialRobot(w))
  })
  it('stops long motion without tunneling through obstacles or boundaries', () => {
    const w = makeWorld()
    const r = { ...initialRobot(w), status: 'running' as const, speedCmPerSec: 2000 }
    const after = advanceRobot(r, w)
    expect(after.collision).toBe('obstacle')
    expect(after.position.xCm).toBeLessThanOrEqual(64)
    w.obstacles = []
    expect(advanceRobot({ ...r, position: { xCm: 170, yCm: 50 } }, w).collision).toBe(
      'world-boundary',
    )
  })
  it('rejects impossible geometry and colliding solid objects', () => {
    const w = makeWorld()
    w.obstacles.push({ ...w.obstacles[0]!, id: 'duplicate' })
    expect(WorldSchema.safeParse(w).success).toBe(false)
  })
  it('reproduces identical trace, resets and replays exact states', () => {
    const w = makeWorld(),
      p = thresholdProgram()
    const a = execute(w, p),
      b = execute(w, p)
    expect(a).toEqual(b)
    for (const event of a.events) {
      expect(ExecutionEventSchema.safeParse(event).success).toBe(true)
      expect(RobotStateSchema.safeParse(event.after).success).toBe(true)
    }
    expect(replayAt(w, a.events, 0)).toEqual(initialRobot(w))
    expect(replayAt(w, a.events, a.events.length)).toEqual(a.robot)
    expect(() => replayAt(w, a.events, 99)).toThrow()
  })
  it('requires actual goal evidence; modified wrong program fails', () => {
    expect(
      judgeGoals(
        FIRST_MISSION.world,
        execute(FIRST_MISSION.world, FIRST_MISSION.starterProgram),
        FIRST_MISSION.successPredicate,
      ).passed,
    ).toBe(true)
    expect(
      judgeGoals(
        FIRST_MISSION.world,
        execute(FIRST_MISSION.world, thresholdProgram(40)),
        FIRST_MISSION.successPredicate,
      ).passed,
    ).toBe(false)
  })
})
