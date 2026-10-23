import type { Vec2, Obstacle, FloorZone } from '../domain/types'
const EPS = 1e-9
export function rayRectangle(
  origin: Vec2,
  direction: Vec2,
  position: Vec2,
  width: number,
  height: number,
): number | null {
  let near = 0,
    far = Infinity
  for (const [o, d, min, max] of [
    [origin.xCm, direction.xCm, position.xCm, position.xCm + width],
    [origin.yCm, direction.yCm, position.yCm, position.yCm + height],
  ]) {
    if (o === undefined || d === undefined || min === undefined || max === undefined)
      throw new Error('Invalid ray')
    if (Math.abs(d) < EPS) {
      if (o < min || o > max) return null
      continue
    }
    const a = (min - o) / d,
      b = (max - o) / d
    near = Math.max(near, Math.min(a, b))
    far = Math.min(far, Math.max(a, b))
    if (near > far + EPS) return null
  }
  return far >= 0 ? near : null
}
export function rayCircle(
  origin: Vec2,
  direction: Vec2,
  position: Vec2,
  radius: number,
): number | null {
  const x = origin.xCm - position.xCm,
    y = origin.yCm - position.yCm
  const c = x * x + y * y - radius * radius
  if (c <= 0) return 0
  const b = x * direction.xCm + y * direction.yCm,
    disc = b * b - c
  if (disc < -EPS) return null
  const t = -b - Math.sqrt(Math.max(0, disc))
  return t >= 0 ? t : null
}
export function hitsObstacle(p: Vec2, radius: number, o: Obstacle): boolean {
  if (!o.solid) return false
  if (o.kind === 'circle')
    return Math.hypot(p.xCm - o.position.xCm, p.yCm - o.position.yCm) < radius + o.radiusCm - EPS
  const x = Math.max(o.position.xCm, Math.min(p.xCm, o.position.xCm + o.widthCm))
  const y = Math.max(o.position.yCm, Math.min(p.yCm, o.position.yCm + o.heightCm))
  return Math.hypot(p.xCm - x, p.yCm - y) < radius - EPS
}
/** Closed zone boundaries. Equal priority resolves by stable lexicographic ID. */
export function containsZone(p: Vec2, z: FloorZone): boolean {
  if (z.kind === 'rectangle')
    return (
      p.xCm >= z.position.xCm &&
      p.yCm >= z.position.yCm &&
      p.xCm <= z.position.xCm + z.widthCm &&
      p.yCm <= z.position.yCm + z.heightCm
    )
  let inside = false
  for (let i = 0, j = z.points.length - 1; i < z.points.length; j = i++) {
    const a = z.points[i]!,
      b = z.points[j]!
    const cross = (p.xCm - a.xCm) * (b.yCm - a.yCm) - (p.yCm - a.yCm) * (b.xCm - a.xCm)
    if (
      Math.abs(cross) < EPS &&
      p.xCm >= Math.min(a.xCm, b.xCm) &&
      p.xCm <= Math.max(a.xCm, b.xCm) &&
      p.yCm >= Math.min(a.yCm, b.yCm) &&
      p.yCm <= Math.max(a.yCm, b.yCm)
    )
      return true
    if (
      a.yCm > p.yCm !== b.yCm > p.yCm &&
      p.xCm < ((b.xCm - a.xCm) * (p.yCm - a.yCm)) / (b.yCm - a.yCm) + a.xCm
    )
      inside = !inside
  }
  return inside
}
export function transformOffset(position: Vec2, heading: number, offset: Vec2): Vec2 {
  const r = (heading * Math.PI) / 180
  return {
    xCm: position.xCm + offset.xCm * Math.cos(r) - offset.yCm * Math.sin(r),
    yCm: position.yCm + offset.xCm * Math.sin(r) + offset.yCm * Math.cos(r),
  }
}
