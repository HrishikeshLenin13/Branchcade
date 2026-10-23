import type { Vec2, World } from '../domain/types'

const EPS = 1e-9
/** First inward contact of a moving circle, including rounded rectangle corners.
 * Tangential travel and travel away from an already-touching surface remain legal. */
export function sweepCircle(from: Vec2, delta: Vec2, radius: number, world: World) {
  let fraction = 1
  let collision: string | null = null
  const accept = (t: number, id: string) => {
    if (t >= -EPS && t <= fraction + EPS && t <= 1 + EPS) {
      if (collision === null || t < fraction - EPS) {
        fraction = Math.max(0, Math.min(1, t))
        collision = id
      }
    }
  }
  const side = (
    axis: 'xCm' | 'yCm',
    edge: number,
    normal: number,
    id: string,
    min = -Infinity,
    max = Infinity,
  ) => {
    if (delta[axis] * normal >= -EPS) return
    const t = (edge - from[axis]) / delta[axis]
    const other = axis === 'xCm' ? 'yCm' : 'xCm'
    const at = from[other] + delta[other] * t
    if (at >= min - EPS && at <= max + EPS) accept(t, id)
  }
  side('xCm', radius, 1, 'world-boundary')
  side('xCm', world.widthCm - radius, -1, 'world-boundary')
  side('yCm', radius, 1, 'world-boundary')
  side('yCm', world.heightCm - radius, -1, 'world-boundary')
  const circle = (center: Vec2, r: number, id: string) => {
    const x = from.xCm - center.xCm,
      y = from.yCm - center.yCm
    const a = delta.xCm ** 2 + delta.yCm ** 2
    if (a < EPS * EPS) return
    const b = x * delta.xCm + y * delta.yCm
    const disc = b * b - a * (x * x + y * y - r * r)
    if (disc < -EPS) return
    const t = (-b - Math.sqrt(Math.max(0, disc))) / a
    // A tangent is not an inward crossing.
    if ((x + delta.xCm * t) * delta.xCm + (y + delta.yCm * t) * delta.yCm < -EPS) accept(t, id)
  }
  for (const o of world.obstacles) {
    if (!o.solid) continue
    if (o.kind === 'circle') circle(o.position, radius + o.radiusCm, o.id)
    else {
      const x = o.position.xCm,
        y = o.position.yCm
      const right = x + o.widthCm,
        bottom = y + o.heightCm
      side('xCm', x - radius, -1, o.id, y, bottom)
      side('xCm', right + radius, 1, o.id, y, bottom)
      side('yCm', y - radius, -1, o.id, x, right)
      side('yCm', bottom + radius, 1, o.id, x, right)
      for (const cx of [x, right])
        for (const cy of [y, bottom]) circle({ xCm: cx, yCm: cy }, radius, o.id)
    }
  }
  return { fraction, collision }
}
