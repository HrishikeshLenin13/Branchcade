import type { Vec2, World } from '../domain/types'
/** Globally nearest legal 1cm-grid spawn. Sweep each legal integer row, union the
 * open x-intervals forbidden by inflated solids, and project onto the remaining
 * gaps. At most 2,000 rows × 100 intervals; no 4-million-point brute force or teleport. */
export function nearestLegalSpawn(world: World, requested: Vec2): Vec2 | null {
  if (![requested.xCm, requested.yCm].every(Number.isFinite)) return null
  const radius = world.spawn.radiusCm,
    epsilon = 1e-9
  const minX = Math.ceil(radius),
    maxX = Math.floor(world.widthCm - radius)
  let best: Vec2 | null = null,
    bestDistance = Infinity
  const considerGap = (left: number, right: number, y: number) => {
    const low = Math.max(minX, Math.ceil(left - epsilon)),
      high = Math.min(maxX, Math.floor(right + epsilon))
    if (low > high) return
    const x = Math.max(
      low,
      Math.min(high, Math.floor(requested.xCm) + (requested.xCm % 1 > 0.5 ? 1 : 0)),
    )
    const distance = (x - requested.xCm) ** 2 + (y - requested.yCm) ** 2
    if (
      distance < bestDistance - epsilon ||
      (Math.abs(distance - bestDistance) < epsilon &&
        (!best || y < best.yCm || (y === best.yCm && x < best.xCm)))
    ) {
      best = { xCm: x, yCm: y }
      bestDistance = distance
    }
  }
  for (let y = Math.ceil(radius); y <= world.heightCm - radius; y++) {
    if ((y - requested.yCm) ** 2 > bestDistance) continue
    const intervals: [number, number][] = []
    for (const o of world.obstacles) {
      if (!o.solid) continue
      if (o.kind === 'circle') {
        const r = radius + o.radiusCm - epsilon,
          dy = y - o.position.yCm
        if (Math.abs(dy) >= r) continue
        const dx = Math.sqrt(r * r - dy * dy)
        intervals.push([o.position.xCm - dx, o.position.xCm + dx])
      } else {
        const dy = Math.max(o.position.yCm - y, y - o.position.yCm - o.heightCm, 0)
        const r = radius - epsilon
        if (dy >= r) continue
        const dx = Math.sqrt(r * r - dy * dy)
        intervals.push([o.position.xCm - dx, o.position.xCm + o.widthCm + dx])
      }
    }
    intervals.sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const interval of intervals) {
      const last = merged.at(-1)
      if (last && interval[0] < last[1]) last[1] = Math.max(last[1], interval[1])
      else merged.push([...interval])
    }
    let left = minX
    for (const [a, b] of merged) {
      considerGap(left, a, y)
      left = Math.max(left, b)
    }
    considerGap(left, maxX, y)
  }
  return best
}
