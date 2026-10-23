import { describe, expect, it } from 'vitest'
import { makeDefaultWorld, makeWorld, DEFAULT_SENSOR } from '../src/engine/world'
import { initialRobot, advanceRobot } from '../src/engine/robot'
import { readSensors } from '../src/engine/sensors'
import { hitsObstacle } from '../src/engine/geometry'
import { nearestLegalSpawn } from '../src/engine/placement'
import { WorldSchema } from '../src/domain/schemas'
import type { World } from '../src/domain/types'
const room = (): World => ({ ...makeDefaultWorld(), obstacles: [] })

describe('F1–F3 authoritative robotics mathematics', () => {
  it('uses a 600×360cm default, nominal radius16 and front origin; boundaries count', () => {
    const world = room(),
      robot = initialRobot(world)
    expect([world.widthCm, world.heightCm, robot.radiusCm]).toEqual([600, 360, 16])
    const sensor = readSensors(world, robot)
    expect(sensor.ray.origin).toEqual({ xCm: 116, yCm: 100 })
    expect(sensor.distanceCm).toBe(484)
    world.obstacles = [
      {
        id: 'wall',
        kind: 'rectangle',
        position: { xCm: 250, yCm: 50 },
        widthCm: 5,
        heightCm: 100,
        solid: true,
        material: 'wood',
      },
    ]
    expect(readSensors(world, robot).distanceCm).toBe(134)
  })
  it.each([
    [0, 484],
    [90, 244],
    [180, 84],
    [270, 84],
  ])('heading %s follows top-left axes', (heading, distance) => {
    const world = room(),
      robot = { ...initialRobot(world), headingDeg: heading! }
    expect(readSensors(world, robot).distanceCm).toBeCloseTo(distance!, 8)
    const moved = advanceRobot({ ...robot, status: 'running', speedCmPerSec: 20 }, world)
    expect(moved.position.xCm).toBeCloseTo(100 + Math.cos((heading! * Math.PI) / 180), 8)
    expect(moved.position.yCm).toBeCloseTo(100 + Math.sin((heading! * Math.PI) / 180), 8)
    expect([moved.tick, moved.simTimeMs]).toEqual([1, 50])
  })
  it('boundaryDetectable=false affects measurement, not collision', () => {
    const world = { ...room(), boundaryDetectable: false }
    expect(readSensors(world, initialRobot(world)).distanceCm).toBeNull()
    const next = advanceRobot(
      { ...initialRobot(world), status: 'running', speedCmPerSec: 20000 },
      world,
    )
    expect(next.position.xCm).toBe(584)
    expect(next.collision).toBe('world-boundary')
  })
  it('stops at exact contact even with a sub-millimeter obstacle and giant tick', () => {
    const world = makeWorld()
    const obstacle = world.obstacles[0]!
    if (obstacle.kind === 'rectangle') obstacle.widthCm = 0.0001
    const next = advanceRobot(
      { ...initialRobot(world), status: 'running', speedCmPerSec: 10000 },
      world,
    )
    expect(next.position.xCm).toBe(64)
    expect(next.collision).toBe('obstacle')
    expect(hitsObstacle(next.position, next.radiusCm, obstacle)).toBe(false)
    expect(next.speedCmPerSec).toBe(0)
  })
  it('diagonal corner contact uses a rounded corner, not an inflated square', () => {
    const world = room()
    world.obstacles = [
      {
        id: 'corner',
        kind: 'rectangle',
        position: { xCm: 150, yCm: 150 },
        widthCm: 10,
        heightCm: 10,
        solid: true,
        material: 'wood',
      },
    ]
    const next = advanceRobot(
      { ...initialRobot(world), headingDeg: 45, status: 'running', speedCmPerSec: 2000 },
      world,
    )
    const contact = 150 - 16 / Math.sqrt(2)
    expect(next.position.xCm).toBeCloseTo(contact, 8)
    expect(next.position.yCm).toBeCloseTo(contact, 8)
    expect(next.collision).toBe('corner')
    expect(hitsObstacle(next.position, 16, world.obstacles[0]!)).toBe(false)
  })
  it('circle collision and world-corner collision both stop without penetration', () => {
    const world = room()
    world.obstacles = [
      {
        id: 'circle',
        kind: 'circle',
        position: { xCm: 200, yCm: 100 },
        radiusCm: 10,
        solid: true,
        material: 'foam',
      },
    ]
    const next = advanceRobot(
      { ...initialRobot(world), status: 'running', speedCmPerSec: 10000 },
      world,
    )
    expect(next.position.xCm).toBe(174)
    world.obstacles = []
    const corner = advanceRobot(
      {
        ...initialRobot(world),
        position: { xCm: 500, yCm: 260 },
        headingDeg: 45,
        status: 'running',
        speedCmPerSec: 10000,
      },
      world,
    )
    expect(corner.position.xCm).toBeCloseTo(584)
    expect(corner.position.yCm).toBeCloseTo(344)
  })
  it('exact touching blocks inward motion but permits retreat and tangential travel', () => {
    const world = makeWorld(),
      robot = {
        ...initialRobot(world),
        position: { xCm: 64, yCm: 50 },
        status: 'running' as const,
        speedCmPerSec: 20,
      }
    expect(advanceRobot(robot, world).position.xCm).toBe(64)
    expect(advanceRobot({ ...robot, speedCmPerSec: -20 }, world).position.xCm).toBe(63)
    expect(advanceRobot({ ...robot, headingDeg: 90 }, world).collision).toBeNull()
  })
  it('floor sample enters a closed edge independently of circle touching it; declared index breaks ties', () => {
    const world = room()
    world.floorZones = [
      {
        id: 'z-first',
        kind: 'rectangle',
        position: { xCm: 110, yCm: 90 },
        widthCm: 30,
        heightCm: 20,
        color: 'black',
        priority: 2,
      },
      {
        id: 'a-second',
        kind: 'rectangle',
        position: { xCm: 110, yCm: 90 },
        widthCm: 30,
        heightCm: 20,
        color: 'red',
        priority: 2,
      },
    ]
    const robot = initialRobot(world)
    expect(readSensors(world, robot).surfaceColor).toBe('white') // robot circle already touches zone
    expect(readSensors(world, { ...robot, position: { xCm: 110, yCm: 100 } }).surfaceColor).toBe(
      'black',
    )
    world.floorZones[1]!.priority = 3
    expect(readSensors(world, { ...robot, position: { xCm: 110, yCm: 100 } }).surfaceColor).toBe(
      'red',
    )
    world.sensorConfig = { ...DEFAULT_SENSOR, colorOffset: { xCm: 10, yCm: 0 } }
    expect(readSensors(world, robot).surfaceColor).toBe('red')
  })
  it('proposes the closest legal grid point without mutating the invalid request', () => {
    const world = makeWorld(),
      before = JSON.stringify(world)
    const point = nearestLegalSpawn(world, { xCm: 70, yCm: 50 })!
    expect(point).toEqual({ xCm: 64, yCm: 50 })
    expect(
      WorldSchema.safeParse({ ...world, spawn: { ...world.spawn, position: point } }).success,
    ).toBe(true)
    expect(JSON.stringify(world)).toBe(before)
  })
  it('validates bounds100–2000, shape limits, finite coordinates and legal spawn', () => {
    const world = room()
    for (const widthCm of [99, 2001, Infinity, NaN])
      expect(WorldSchema.safeParse({ ...world, widthCm }).success).toBe(false)
    expect(
      WorldSchema.safeParse({
        ...world,
        obstacles: Array.from({ length: 101 }, (_, i) => ({
          id: `o${i}`,
          kind: 'circle',
          position: { xCm: 20, yCm: 20 },
          radiusCm: 1,
          solid: false,
          material: 'foam',
        })),
      }).success,
    ).toBe(false)
    expect(
      WorldSchema.safeParse({ ...world, spawn: { ...world.spawn, position: { xCm: 0, yCm: 0 } } })
        .success,
    ).toBe(false)
  })
})

it('finds globally nearest legal grid placements even more than80cm outside an inflated wall', () => {
  const world = {
    ...makeDefaultWorld(),
    obstacles: [
      {
        id: 'wide',
        kind: 'rectangle' as const,
        position: { xCm: 180, yCm: 20 },
        widthCm: 240,
        heightCm: 300,
        solid: true,
        material: 'wood' as const,
      },
    ],
  }
  const point = nearestLegalSpawn(world, { xCm: 300, yCm: 100 })!
  expect(point).toEqual({ xCm: 164, yCm: 100 }) // compare all boundaries below, not a bounded local search
  const brute: { xCm: number; yCm: number; d: number }[] = []
  for (let y = 16; y <= 344; y++)
    for (let x = 16; x <= 584; x++)
      if (!world.obstacles.some((o) => hitsObstacle({ xCm: x, yCm: y }, 16, o)))
        brute.push({ xCm: x, yCm: y, d: (x - 300) ** 2 + (y - 100) ** 2 })
  brute.sort((a, b) => a.d - b.d || a.yCm - b.yCm || a.xCm - b.xCm)
  expect(point).toEqual({ xCm: brute[0]!.xCm, yCm: brute[0]!.yCm })
})
