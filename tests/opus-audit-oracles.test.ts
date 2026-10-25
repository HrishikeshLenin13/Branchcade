/** Opus post-L audit: independent numerical oracles. Expected values here are NOT taken
 * from the engine's own formulas. Ray distances come from fine ray-marching plus bisection
 * against a point-in-shape test, and contact positions come from bisection on a separately
 * written point-to-shape clearance function. Agreement within tolerance is the evidence. */
import { describe, expect, it } from 'vitest'
import type { Obstacle, Program, Statement, World } from '../src/domain/types'
import { makeDefaultWorld, makeWorld } from '../src/engine/world'
import { initialRobot } from '../src/engine/robot'
import { readSensors } from '../src/engine/sensors'
import { execute } from '../src/interpreter/interpreter'
import { stableHash } from '../src/domain/invariants'

type P = { x: number; y: number }
const rad = (d: number) => (d * Math.PI) / 180
const insideShape = (p: P, o: Obstacle) =>
  o.kind === 'rectangle'
    ? p.x >= o.position.xCm &&
      p.x <= o.position.xCm + o.widthCm &&
      p.y >= o.position.yCm &&
      p.y <= o.position.yCm + o.heightCm
    : (p.x - o.position.xCm) ** 2 + (p.y - o.position.yCm) ** 2 <= o.radiusCm ** 2
const outsideWorld = (p: P, w: World) =>
  p.x <= 0 || p.y <= 0 || p.x >= w.widthCm || p.y >= w.heightCm

/** March 0.05 cm at a time, then bisect the first blocked interval to 1e-7 cm. */
function marchedDistance(w: World, origin: P, headingDeg: number, max = 2000): number {
  const d = { x: Math.cos(rad(headingDeg)), y: Math.sin(rad(headingDeg)) }
  const blocked = (t: number) => {
    const p = { x: origin.x + d.x * t, y: origin.y + d.y * t }
    return (
      (w.boundaryDetectable !== false && outsideWorld(p, w)) ||
      w.obstacles.some((o) => o.solid && insideShape(p, o))
    )
  }
  if (blocked(0)) return 0
  let lo = 0
  for (let t = 0.05; t <= max; t += 0.05) {
    if (blocked(t)) {
      let hi = t
      while (hi - lo > 1e-7) {
        const mid = (lo + hi) / 2
        if (blocked(mid)) hi = mid
        else lo = mid
      }
      return hi
    }
    lo = t
  }
  return Infinity
}

/** Clearance of a disc centre from every solid surface (negative = penetrating). */
function clearance(w: World, c: P, r: number) {
  let best = Math.min(c.x, c.y, w.widthCm - c.x, w.heightCm - c.y) - r
  for (const o of w.obstacles.filter((x) => x.solid)) {
    if (o.kind === 'circle') {
      best = Math.min(best, Math.hypot(c.x - o.position.xCm, c.y - o.position.yCm) - r - o.radiusCm)
    } else {
      const dx = Math.max(o.position.xCm - c.x, 0, c.x - (o.position.xCm + o.widthCm))
      const dy = Math.max(o.position.yCm - c.y, 0, c.y - (o.position.yCm + o.heightCm))
      best = Math.min(best, Math.hypot(dx, dy) - r)
    }
  }
  return best
}
/** Distance a disc can travel along a heading before first touching anything. */
function contactTravel(w: World, start: P, r: number, headingDeg: number, limit: number) {
  const d = { x: Math.cos(rad(headingDeg)), y: Math.sin(rad(headingDeg)) }
  const at = (t: number) => clearance(w, { x: start.x + d.x * t, y: start.y + d.y * t }, r)
  let lo = 0
  for (let t = 0.01; t <= limit; t += 0.01) {
    if (at(t) <= 0) {
      let hi = t
      while (hi - lo > 1e-8) {
        const mid = (lo + hi) / 2
        if (at(mid) <= 0) hi = mid
        else lo = mid
      }
      return hi
    }
    lo = t
  }
  return limit
}

const num = (nodeId: string, value: number) =>
  ({ nodeId, kind: 'literal', type: 'number', value }) as const
const prog = (body: Statement[]): Program => ({ schemaVersion: 1, id: 'opus', body })
const rect = (id: string, x: number, y: number, wCm: number, hCm: number): Obstacle => ({
  id,
  kind: 'rectangle',
  position: { xCm: x, yCm: y },
  widthCm: wCm,
  heightCm: hCm,
  solid: true,
  material: 'wood',
})
const circ = (id: string, x: number, y: number, r: number): Obstacle => ({
  id,
  kind: 'circle',
  position: { xCm: x, yCm: y },
  radiusCm: r,
  solid: true,
  material: 'metal',
})
const room = (obstacles: Obstacle[] = [], spawn?: Partial<World['spawn']>): World => {
  const base = makeDefaultWorld()
  return { ...base, obstacles, spawn: { ...base.spawn, ...spawn } }
}

describe('Opus oracle: distance ray against marched geometry', () => {
  const cases: Array<[string, World]> = [
    ['empty room heading 0', room()],
    ['empty room heading 37', room([], { headingDeg: 37 })],
    ['empty room heading 200', room([], { headingDeg: 200, position: { xCm: 300, yCm: 180 } })],
    ['rect ahead', room([rect('a', 233.3, 40, 12, 140)])],
    ['rect diagonal corner', room([rect('a', 180, 150, 40, 40)], { headingDeg: 33 })],
    ['circle offset', room([circ('c', 260, 112, 25)], { headingDeg: 3 })],
    [
      'two obstacles nearest wins',
      room([rect('far', 300, 0, 10, 360), circ('near', 200, 100, 10)], { headingDeg: 0 }),
    ],
    ['heading 270 upward', room([rect('top', 50, 10, 100, 5)], { headingDeg: 270 })],
  ]
  for (const [name, w] of cases)
    it(name, () => {
      const robot = initialRobot(w)
      const s = readSensors(w, robot)
      const cfg = w.sensorConfig!
      const o = {
        x: robot.position.xCm + cfg.originOffset.xCm * Math.cos(rad(robot.headingDeg)),
        y: robot.position.yCm + cfg.originOffset.xCm * Math.sin(rad(robot.headingDeg)),
      }
      const oracle = marchedDistance(w, o, robot.headingDeg)
      if (oracle > cfg.maxRangeCm) expect(s.distanceCm).toBeNull()
      else expect(s.distanceCm!).toBeCloseTo(oracle, 4)
    })

  it('range limit returns null (not 0, not max) just past maxRange and a value just inside', () => {
    const w = room([], { position: { xCm: 100, yCm: 100 } })
    w.sensorConfig = { ...w.sensorConfig!, maxRangeCm: 100 }
    w.obstacles = [rect('a', 116 + 100.01, 0, 5, 360)]
    expect(readSensors(w, initialRobot(w)).distanceCm).toBeNull()
    w.obstacles = [rect('a', 116 + 99.99, 0, 5, 360)]
    expect(readSensors(w, initialRobot(w)).distanceCm!).toBeCloseTo(99.99, 6)
    w.obstacles = [rect('a', 116 + 100, 0, 5, 360)]
    expect(readSensors(w, initialRobot(w)).distanceCm).toBe(100)
  })
  it('boundaryDetectable=false ignores walls (null when nothing else is hit)', () => {
    const w = { ...room(), boundaryDetectable: false }
    expect(readSensors(w, initialRobot(w)).distanceCm).toBeNull()
  })
  it('seeded noise is reproducible, bounded to ±0.05 cm, and absent without a seed', () => {
    const w = room([rect('a', 200, 0, 5, 360)])
    const clean = readSensors(w, initialRobot(w)).distanceCm!
    w.sensorConfig = { ...w.sensorConfig!, noiseSeed: 7 }
    const r = initialRobot(w)
    const a = readSensors(w, r).distanceCm!
    expect(readSensors(w, r).distanceCm).toBe(a)
    expect(Math.abs(a - clean)).toBeLessThanOrEqual(0.05 + 1e-12)
  })
})

describe('Opus oracle: swept contact against clearance bisection', () => {
  const runMove = (w: World, cm: number) =>
    execute(w, prog([{ nodeId: 'm', kind: 'move', distance: num('n', cm) }]))
  const cases: Array<[string, World, number]> = [
    ['straight into rect', room([rect('a', 200, 50, 20, 100)]), 150],
    ['diagonal into rect corner', room([rect('a', 180, 130, 30, 30)], { headingDeg: 30 }), 200],
    ['glancing circle', room([circ('c', 190, 112, 10)]), 150],
    ['right world edge', room([], { position: { xCm: 500, yCm: 100 } }), 200],
    [
      'bottom-right corner diagonal',
      room([], { position: { xCm: 500, yCm: 260 }, headingDeg: 45 }),
      200,
    ],
    ['passes beside rect without touching', room([rect('a', 150, 117, 40, 20)]), 60],
  ]
  for (const [name, w, cm] of cases)
    it(name, () => {
      const r = runMove(w, cm)
      const start = { x: w.spawn.position.xCm, y: w.spawn.position.yCm }
      const oracle = contactTravel(w, start, w.spawn.radiusCm, w.spawn.headingDeg, cm)
      const travelled = Math.hypot(r.robot.position.xCm - start.x, r.robot.position.yCm - start.y)
      expect(travelled).toBeCloseTo(oracle, 4)
      const collided = r.events.some((e) => e.kind === 'collision')
      expect(collided).toBe(oracle < cm - 1e-6)
      // Never penetrates anything at any recorded tick.
      for (const e of r.events)
        expect(
          clearance(w, { x: e.after.position.xCm, y: e.after.position.yCm }, w.spawn.radiusCm),
        ).toBeGreaterThan(-1e-6)
    })

  it('starting exactly touching a wall and driving into it moves 0 and records collision', () => {
    const w = room([rect('a', 116, 0, 10, 360)])
    const r = runMove(w, 10)
    expect(r.robot.position.xCm).toBeCloseTo(100, 9)
    expect(r.events.some((e) => e.kind === 'collision')).toBe(true)
  })
  it('starting touching a wall and driving away is legal', () => {
    const w = room([rect('a', 64, 0, 20, 360)])
    const r = runMove(w, -10)
    expect(r.events.some((e) => e.kind === 'collision')).toBe(true)
    const w2 = room([rect('a', 64, 0, 20, 360)], { headingDeg: 180 })
    const r2 = execute(
      { ...w2, spawn: { ...w2.spawn, headingDeg: 0 } },
      prog([{ nodeId: 'm', kind: 'move', distance: num('n', 10) }]),
    )
    expect(r2.robot.position.xCm).toBeCloseTo(110, 9)
    expect(r2.events.some((e) => e.kind === 'collision')).toBe(false)
  })
})

describe('Opus oracle: kinematics and turning', () => {
  it('move d at heading h lands at (x+cos h·d, y+sin h·d) for awkward headings', () => {
    for (const h of [0, 17, 90, 133, 181, 269.5, 300]) {
      const w = room([], { position: { xCm: 300, yCm: 180 }, headingDeg: h })
      const r = execute(w, prog([{ nodeId: 'm', kind: 'move', distance: num('n', 37.5) }]))
      expect(r.robot.position.xCm).toBeCloseTo(300 + Math.cos(rad(h)) * 37.5, 6)
      expect(r.robot.position.yCm).toBeCloseTo(180 + Math.sin(rad(h)) * 37.5, 6)
    }
  })
  it('turn arithmetic normalizes to [0,360) and composes exactly for many small turns', () => {
    const w = room([], { position: { xCm: 300, yCm: 180 }, headingDeg: 350 })
    const r = execute(
      w,
      prog([
        { nodeId: 't1', kind: 'turn', angle: num('a', 25) },
        { nodeId: 't2', kind: 'turn', angle: num('b', -100) },
        { nodeId: 't3', kind: 'turn', angle: num('c', 7) },
      ]),
    )
    const expected = (((350 + 25 - 100 + 7) % 360) + 360) % 360
    expect(r.robot.headingDeg).toBeCloseTo(expected, 9)
    // 36 turns of 10° must come back to the start heading without drift.
    const loop = execute(
      w,
      prog([
        {
          nodeId: 'rep',
          kind: 'repeat',
          count: num('k', 36),
          body: [{ nodeId: 't', kind: 'turn', angle: num('a', 10) }],
        },
      ]),
    )
    expect(loop.events.filter((e) => e.kind === 'repeat_iteration')).toHaveLength(36)
    expect(Math.abs(loop.robot.headingDeg - 350)).toBeLessThan(1e-9)
  })
  it('fixed time step: tick count = ceil(cm / 1) for moves and ceil(deg / 4.5) for turns', () => {
    const w = room([], { position: { xCm: 300, yCm: 180 } })
    const m = execute(w, prog([{ nodeId: 'm', kind: 'move', distance: num('n', 12.25) }]))
    expect(m.robot.tick).toBe(13)
    expect(m.robot.simTimeMs).toBe(13 * 50)
    const t = execute(w, prog([{ nodeId: 't', kind: 'turn', angle: num('n', 91) }]))
    expect(t.robot.tick).toBe(Math.ceil(91 / 4.5))
  })
  it('identical inputs give identical trace hashes over repeated runs', async () => {
    const w = room([rect('a', 250, 0, 10, 360), circ('c', 180, 220, 20)], { headingDeg: 12 })
    const p = prog([
      {
        nodeId: 'w',
        kind: 'while',
        condition: {
          nodeId: 'c',
          kind: 'compare',
          type: 'boolean',
          op: '>',
          left: { nodeId: 's', kind: 'sensor', type: 'number', sensor: 'distance' },
          right: num('t', 25),
        },
        body: [{ nodeId: 'm', kind: 'move', distance: num('n', 3) }],
      },
      { nodeId: 'stop', kind: 'stop' },
    ])
    const hashes = new Set(
      await Promise.all(Array.from({ length: 5 }, () => stableHash(execute(w, p).events))),
    )
    expect(hashes.size).toBe(1)
  })
})

describe('Opus oracle: thresholds and floor colour', () => {
  const branchAt = (d: number, op: '<' | '<=' | '>' | '>=' | '==' | '!=', threshold: number) => {
    const w = makeWorld(d)
    const r = execute(
      w,
      prog([
        {
          nodeId: 'if',
          kind: 'if',
          condition: {
            nodeId: 'c',
            kind: 'compare',
            type: 'boolean',
            op,
            left: { nodeId: 's', kind: 'sensor', type: 'number', sensor: 'distance' },
            right: num('t', threshold),
          },
          then: [{ nodeId: 'stop', kind: 'stop' }],
          else: [{ nodeId: 'm', kind: 'move', distance: num('n', 1) }],
        },
      ]),
    )
    return r.events.find((e) => e.kind === 'compare')!.evaluation!.result
  }
  it('M01 world places the wall exactly d cm from the sensor for many d', () => {
    for (const d of [5, 19.9, 20, 20.1, 24, 37.3, 60]) {
      const w = makeWorld(d)
      expect(readSensors(w, initialRobot(w)).distanceCm!).toBeCloseTo(d, 9)
    }
  })
  it('comparisons use the true reading with exact equality semantics', () => {
    expect(branchAt(24, '<', 20)).toBe(false)
    expect(branchAt(12, '<', 20)).toBe(true)
    expect(branchAt(20, '<', 20)).toBe(false)
    expect(branchAt(20, '<=', 20)).toBe(true)
    expect(branchAt(20, '>=', 20)).toBe(true)
    expect(branchAt(19.99, '<', 20)).toBe(true)
    expect(branchAt(30, '>', 20)).toBe(true)
    expect(branchAt(30, '!=', 30)).toBe(false)
  })
  it('floor sensor follows the sample point, edge inclusive, priority then declared order', () => {
    const w = room([], { position: { xCm: 100, yCm: 100 } })
    w.sensorConfig = { ...w.sensorConfig!, colorOffset: { xCm: 10, yCm: 0 } }
    const zone = (id: string, x: number, color: 'black' | 'red' | 'blue', priority: number) => ({
      id,
      kind: 'rectangle' as const,
      position: { xCm: x, yCm: 80 },
      widthCm: 20,
      heightCm: 40,
      color,
      priority,
    })
    // Sample at x=110. A zone starting at 110.0001 is not yet under the sample even though
    // a 16 cm chassis already overlaps it.
    w.floorZones = [zone('z', 110.0001, 'black', 0)]
    expect(readSensors(w, initialRobot(w)).surfaceColor).toBe('white')
    w.floorZones = [zone('z', 110, 'black', 0)]
    expect(readSensors(w, initialRobot(w)).surfaceColor).toBe('black')
    w.floorZones = [zone('a', 100, 'red', 1), zone('b', 100, 'blue', 1)]
    expect(readSensors(w, initialRobot(w)).surfaceColor).toBe('red')
    w.floorZones = [zone('a', 100, 'red', 1), zone('b', 100, 'blue', 2)]
    expect(readSensors(w, initialRobot(w)).surfaceColor).toBe('blue')
  })
})
