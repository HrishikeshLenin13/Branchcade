import { z } from 'zod'
import { COLORS, LIMITS } from '../../domain/constants'

const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[\w.-]+$/)
const n = z.number().finite().min(-1_000_000).max(1_000_000)
const positive = n.gt(0)
const nonnegative = n.min(0)
const tick = z.number().int().min(0).max(1_000_000)
const v = z.literal(1)
const color = z.enum(COLORS)
export const Vec2Schema = z.strictObject({ xCm: n, yCm: n })
export const ObstacleSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id,
    kind: z.literal('rectangle'),
    position: Vec2Schema,
    widthCm: positive,
    heightCm: positive,
    solid: z.boolean(),
    material: z.enum(['wood', 'metal', 'foam']),
  }),
  z.strictObject({
    id,
    kind: z.literal('circle'),
    position: Vec2Schema,
    radiusCm: positive.min(1),
    solid: z.boolean(),
    material: z.enum(['wood', 'metal', 'foam']),
  }),
])
export const FloorZoneSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id,
    kind: z.literal('rectangle'),
    position: Vec2Schema,
    widthCm: positive,
    heightCm: positive,
    color,
    priority: tick,
  }),
  z.strictObject({
    id,
    kind: z.literal('polygon'),
    points: z.array(Vec2Schema).min(3).max(64),
    color,
    priority: tick,
  }),
])
export const GoalSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('branch'), nodeId: id, expected: z.boolean() }),
  z.strictObject({ kind: z.literal('distance'), minCm: nonnegative }),
  z.strictObject({ kind: z.literal('reach'), position: Vec2Schema, toleranceCm: positive }),
  z.strictObject({ kind: z.literal('stopped') }),
  z.strictObject({
    kind: z.literal('event'),
    eventKind: z.enum(['move', 'turn', 'stop', 'set', 'call', 'inspect', 'branch', 'wait']),
    nodeId: id.optional(),
    count: tick.optional(),
  }),
  z.strictObject({ kind: z.literal('color-stop'), color }),
  z.strictObject({
    kind: z.literal('heading'),
    headingDeg: n.min(0).lt(360),
    toleranceDeg: nonnegative.max(180),
  }),
])
export const SensorConfigSchema = z.strictObject({
  schemaVersion: v,
  maxRangeCm: positive.max(500),
  originOffset: Vec2Schema,
  readingHz: z.literal(20),
  noiseSeed: z.number().int().nonnegative().max(4294967295).optional(),
  colorOffset: Vec2Schema,
  normalization: z.literal('null-out-of-range;heading-0-360;cm'),
})
const worldBase = z.strictObject({
  schemaVersion: v,
  id,
  sensorConfig: SensorConfigSchema.optional(),
  widthCm: positive.max(2000),
  heightCm: positive.max(2000),
  obstacles: z.array(ObstacleSchema).max(LIMITS.obstacles),
  floorZones: z.array(FloorZoneSchema).max(100),
  waypoints: z.array(Vec2Schema).max(100),
  spawn: z.strictObject({
    position: Vec2Schema,
    headingDeg: n.min(0).lt(360),
    radiusCm: positive.min(1),
  }),
  goals: z.array(GoalSchema).max(20),
  collisionConstraints: z.strictObject({
    stopOnCollision: z.literal(true),
    allowOverlap: z.literal(false),
  }),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
})
export const WorldSchema = worldBase.superRefine((w, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
  const inside = (p: { xCm: number; yCm: number }) =>
    p.xCm >= 0 && p.yCm >= 0 && p.xCm <= w.widthCm && p.yCm <= w.heightCm
  const s = w.spawn
  const r = s.radiusCm
  if (
    s.position.xCm < r ||
    s.position.yCm < r ||
    s.position.xCm > w.widthCm - r ||
    s.position.yCm > w.heightCm - r
  )
    issue('Spawn must fit inside world')
  const allIds = [...w.obstacles, ...w.floorZones].map((o) => o.id)
  if (new Set(allIds).size !== allIds.length) issue('World object IDs must be unique')
  for (const o of w.obstacles) {
    const radius = o.kind === 'circle' ? o.radiusCm : 0
    const width = o.kind === 'rectangle' ? o.widthCm : radius
    const height = o.kind === 'rectangle' ? o.heightCm : radius
    if (
      !inside({ xCm: o.position.xCm - radius, yCm: o.position.yCm - radius }) ||
      !inside({ xCm: o.position.xCm + width, yCm: o.position.yCm + height })
    )
      issue(`Obstacle ${o.id} lies outside world`)
    const dx =
      o.kind === 'circle'
        ? s.position.xCm - o.position.xCm
        : s.position.xCm -
          Math.max(o.position.xCm, Math.min(s.position.xCm, o.position.xCm + o.widthCm))
    const dy =
      o.kind === 'circle'
        ? s.position.yCm - o.position.yCm
        : s.position.yCm -
          Math.max(o.position.yCm, Math.min(s.position.yCm, o.position.yCm + o.heightCm))
    if (o.solid && Math.hypot(dx, dy) < r + radius) issue(`Spawn overlaps ${o.id}`)
  }
  for (let i = 0; i < w.obstacles.length; i++)
    for (const b of w.obstacles.slice(i + 1)) {
      const a = w.obstacles[i]!
      if (!a.solid || !b.solid) continue
      let overlaps = false
      if (a.kind === 'rectangle' && b.kind === 'rectangle')
        overlaps =
          a.position.xCm < b.position.xCm + b.widthCm &&
          a.position.xCm + a.widthCm > b.position.xCm &&
          a.position.yCm < b.position.yCm + b.heightCm &&
          a.position.yCm + a.heightCm > b.position.yCm
      else if (a.kind === 'circle' && b.kind === 'circle')
        overlaps =
          Math.hypot(a.position.xCm - b.position.xCm, a.position.yCm - b.position.yCm) <
          a.radiusCm + b.radiusCm
      else {
        const c = a.kind === 'circle' ? a : b
        const rect = a.kind === 'rectangle' ? a : b
        if (c.kind === 'circle' && rect.kind === 'rectangle')
          overlaps =
            Math.hypot(
              c.position.xCm -
                Math.max(
                  rect.position.xCm,
                  Math.min(c.position.xCm, rect.position.xCm + rect.widthCm),
                ),
              c.position.yCm -
                Math.max(
                  rect.position.yCm,
                  Math.min(c.position.yCm, rect.position.yCm + rect.heightCm),
                ),
            ) < c.radiusCm
      }
      if (overlaps) issue(`Solid obstacles ${a.id} and ${b.id} overlap`)
    }
  for (const f of w.floorZones) {
    const pts =
      f.kind === 'polygon'
        ? f.points
        : [f.position, { xCm: f.position.xCm + f.widthCm, yCm: f.position.yCm + f.heightCm }]
    if (pts.some((p) => !inside(p))) issue(`Floor zone ${f.id} outside world`)
    if (f.kind === 'polygon') {
      const area = f.points.reduce((sum, p, i) => {
        const q = f.points[(i + 1) % f.points.length]!
        return sum + p.xCm * q.yCm - q.xCm * p.yCm
      }, 0)
      if (Math.abs(area) < 1e-8) issue('Floor polygon has no area')
    }
  }
  if (w.waypoints.some((p) => !inside(p))) issue('Waypoint outside world')
  if (w.goals.some((g) => g.kind === 'reach' && !inside(g.position))) issue('Goal outside world')
})
