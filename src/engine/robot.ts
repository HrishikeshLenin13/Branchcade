import type { RobotState, World } from '../domain/types'
import { FIXED_STEP_MS } from '../domain/constants'
import { sweepCircle } from './sweep'
export function initialRobot(world: World): RobotState {
  return {
    schemaVersion: 1,
    position: { ...world.spawn.position },
    headingDeg: world.spawn.headingDeg,
    radiusCm: world.spawn.radiusCm,
    speedCmPerSec: 0,
    turnDegPerSec: 0,
    status: 'idle',
    collision: null,
    simTimeMs: 0,
    tick: 0,
    stopReason: null,
  }
}
/** Fixed 50ms motion, swept to exact first contact; no wall-clock inputs. */
export function advanceRobot(state: RobotState, world: World): RobotState {
  if (state.status !== 'running') return structuredClone(state)
  const dt = FIXED_STEP_MS / 1000
  const next = structuredClone(state)
  const distance = state.speedCmPerSec * dt
  const r = (state.headingDeg * Math.PI) / 180
  const delta = { xCm: Math.cos(r) * distance, yCm: Math.sin(r) * distance }
  const { fraction, collision } = sweepCircle(state.position, delta, state.radiusCm, world)
  next.position = {
    xCm: state.position.xCm + delta.xCm * fraction,
    yCm: state.position.yCm + delta.yCm * fraction,
  }
  if (collision) {
    next.status = 'stopped'
    next.collision = collision
    next.stopReason = 'collision'
    next.speedCmPerSec = 0
    next.turnDegPerSec = 0
  }
  next.headingDeg =
    (((next.headingDeg + (collision ? 0 : state.turnDegPerSec * dt)) % 360) + 360) % 360
  next.tick++
  next.simTimeMs += FIXED_STEP_MS
  return next
}
