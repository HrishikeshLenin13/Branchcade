import type { ExecutionEvent, World } from '../domain/types'
import { initialRobot } from './robot'
export function replayAt(world: World, events: readonly ExecutionEvent[], cursor: number) {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > events.length)
    throw new Error('Trace cursor outside range')
  return cursor === 0 ? initialRobot(world) : structuredClone(events[cursor - 1]!.after)
}
