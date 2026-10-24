import type { ExecutionEvent, RobotState, World, Program } from '../domain/types'
import { replayAt } from '../engine/replay'
export { replayAt as inspectEvent } from '../engine/replay'
const motionKinds = new Set(['move', 'turn', 'wait'])
/** Advances to the end of one statement/branch; motor ticks of one invocation group. */
export function nextCodeCursor(events: readonly ExecutionEvent[], cursor: number) {
  if (cursor >= events.length) return events.length
  let i = cursor
  while (i < events.length && ['sensor_read', 'compare'].includes(events[i]!.kind)) i++
  const first = events[i]
  if (!first) return events.length
  i++
  if (motionKinds.has(first.kind))
    while (
      i < events.length &&
      events[i]!.kind === first.kind &&
      events[i]!.nodeId === first.nodeId
    )
      i++
  return i
}
/** Advances exactly one logical 50ms tick, traversing intervening zero-time events.
 * At completion it leaves the cursor unchanged; terminal events use Step code. */
export function nextTickCursor(events: readonly ExecutionEvent[], cursor: number) {
  const tick = events[cursor - 1]?.after.tick ?? 0
  let i = cursor
  while (i < events.length) {
    if (events[i++]!.after.tick > tick) return i
  }
  return cursor
}
/** Renderer-only interpolation. Authoritative snapshots, comparisons and hashes never use it. */
export function interpolateRobot(before: RobotState, after: RobotState, alpha: number): RobotState {
  const t = Math.max(0, Math.min(1, alpha))
  const angle = ((after.headingDeg - before.headingDeg + 540) % 360) - 180
  return {
    ...before,
    position: {
      xCm: before.position.xCm + (after.position.xCm - before.position.xCm) * t,
      yCm: before.position.yCm + (after.position.yCm - before.position.yCm) * t,
    },
    headingDeg: (((before.headingDeg + angle * t) % 360) + 360) % 360,
  }
}
/** Bounded 64-slot snapshot ring, every 20th tick; evictions fall back to immutable
 * event snapshots from the initial state. Full traces have their own 4MB hard cap. */
export class ReplayTimeline {
  private ring: { cursor: number; state: RobotState }[] = []
  private slot = 0
  private world: World
  private events: readonly ExecutionEvent[]
  constructor(world: World, events: readonly ExecutionEvent[]) {
    this.world = world
    this.events = events
    this.record(0, replayAt(world, events, 0))
    let tick = -1
    events.forEach((event, index) => {
      if ((event.tick % 20 === 0 && event.tick !== tick) || index === events.length - 1) {
        this.record(index + 1, event.after)
        tick = event.tick
      }
    })
  }
  private record(cursor: number, state: RobotState) {
    this.ring[this.slot] = { cursor, state: structuredClone(state) }
    this.slot = (this.slot + 1) % 64
  }
  at(cursor: number): RobotState {
    const cached = this.ring.find((item) => item.cursor === cursor)
    return cached ? structuredClone(cached.state) : replayAt(this.world, this.events, cursor)
  }
  get snapshotCount() {
    return this.ring.length
  }
}

/** Exact comparison descendants of the branch's own AST condition, never an
 * unrelated earlier inspect/assignment that happened to emit a comparison. */
export function conditionComparisonIds(
  program: Program | undefined,
  nodeId: string | undefined,
): Set<string> {
  const ids = new Set<string>(nodeId ? [nodeId] : [])
  if (!program || !nodeId) return ids
  const pending: unknown[] = [program]
  let root: unknown
  while (pending.length) {
    const item = pending.pop()
    if (item && typeof item === 'object') {
      if ('nodeId' in item && item.nodeId === nodeId) {
        root = item
        break
      }
      pending.push(...Object.values(item))
    }
  }
  const children: unknown[] = root ? [root] : []
  while (children.length) {
    const item = children.pop()
    if (item && typeof item === 'object') {
      if (
        'kind' in item &&
        item.kind === 'compare' &&
        'nodeId' in item &&
        typeof item.nodeId === 'string'
      )
        ids.add(item.nodeId)
      children.push(...Object.values(item))
    }
  }
  return ids
}
