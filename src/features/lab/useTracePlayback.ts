import { useEffect, useEffectEvent, useState } from 'react'
import type { ExecutionEvent, RobotState, World } from '../../domain/types'
import { interpolateRobot } from '../../interpreter/debugger'
import { replayAt } from '../../engine/replay'
/** A single wall-clock rAF schedule reveals immutable states; it never integrates physics. */
export function useTracePlayback(
  world: World,
  events: ExecutionEvent[] | undefined,
  cursor: number,
  playing: boolean,
  speed: number,
  onCursor: (cursor: number) => void,
  onEnd: () => void,
  reduced = false,
  stopAt?: number,
) {
  const [frame, setFrame] = useState<{ cursor: number; robot: RobotState } | null>(null)
  const getCursor = useEffectEvent(() => cursor)
  const reveal = useEffectEvent((next: number) => onCursor(next))
  const finish = useEffectEvent(() => onEnd())
  useEffect(() => {
    if (!playing || !events) return
    const limit = Math.min(stopAt ?? events.length, events.length)
    let next = getCursor(),
      id = 0,
      started: number | null = null
    const origin = events[next - 1]?.elapsedMs ?? 0
    const tick = (now: number) => {
      started ??= now
      const time = origin + (now - started) * speed
      const before = next
      while (next < limit && events[next]!.elapsedMs <= time) next++
      if (next !== before) reveal(next)
      if (next >= limit) {
        finish()
        return
      }
      const event = events[next]!,
        previousTime = events[next - 1]?.elapsedMs ?? 0
      const duration = event.elapsedMs - previousTime
      if (!reduced && duration > 0)
        setFrame({
          cursor: next,
          robot: interpolateRobot(
            replayAt(world, events, next),
            event.after,
            (time - previousTime) / duration,
          ),
        })
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [world, events, playing, speed, reduced, stopAt])
  return playing && frame?.cursor === cursor ? frame.robot : null
}
