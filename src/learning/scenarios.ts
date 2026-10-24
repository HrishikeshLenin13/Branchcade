import type { Expression, Program, Statement, World } from '../domain/types'
import { makeWorld } from '../engine/world'

/** Small AST builders for generated learning scenarios. Every scenario is ordinary
 * validated data executed by the real interpreter; nothing here is executable text. */
export const lit = (nodeId: string, value: number): Expression => ({
  nodeId,
  kind: 'literal',
  type: 'number',
  value,
})
export const colorLit = (nodeId: string, value: 'white' | 'black' | 'red'): Expression => ({
  nodeId,
  kind: 'literal',
  type: 'color',
  value,
})
export const distance = (nodeId = 'distance'): Expression => ({
  nodeId,
  kind: 'sensor',
  type: 'number',
  sensor: 'distance',
})
export const floor = (nodeId = 'floor'): Expression => ({
  nodeId,
  kind: 'sensor',
  type: 'color',
  sensor: 'color',
})
export type Op = '<' | '<=' | '>' | '>=' | '==' | '!='
export const compare = (
  nodeId: string,
  op: Op,
  left: Expression,
  right: Expression,
): Expression => ({
  nodeId,
  kind: 'compare',
  type: 'boolean',
  op,
  left,
  right,
})
export const move = (nodeId: string, cm: number): Statement => ({
  nodeId,
  kind: 'move',
  distance: lit(`${nodeId}-cm`, cm),
})
export const turn = (nodeId: string, deg: number): Statement => ({
  nodeId,
  kind: 'turn',
  angle: lit(`${nodeId}-deg`, deg),
})
export const stop = (nodeId = 'stop'): Statement => ({ nodeId, kind: 'stop' })
export const program = (id: string, body: Statement[]): Program => ({ schemaVersion: 1, id, body })

/** Compact 180×100 cm world from the authored missions: the obstacle is placed so the
 * front sensor reads exactly `d` cm at the start. `null` means no obstacle at all. */
export const wallWorld = (d: number | null): World =>
  d === null ? { ...makeWorld(), id: 'open-room', obstacles: [] } : makeWorld(d)
/** A black (or other) line `gap` cm ahead of the color sample point; white underneath. */
export function lineWorld(gap: number, color: 'black' | 'red' = 'black', under = false): World {
  const base = wallWorld(null)
  const x = base.spawn.position.xCm + (under ? -4 : gap)
  return {
    ...base,
    id: `line-${gap}-${color}-${under ? 'under' : 'ahead'}`,
    floorZones: [
      {
        id: 'line',
        kind: 'rectangle',
        position: { xCm: x, yCm: 20 },
        widthCm: 8,
        heightCm: 60,
        color,
        priority: 1,
      },
    ],
  }
}
export const OP_WORDS: Record<string, Op> = { lt: '<', le: '<=', gt: '>', ge: '>=' }
