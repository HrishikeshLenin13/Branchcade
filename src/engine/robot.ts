import type { RobotState, World } from '../domain/types'
import { FIXED_STEP_MS } from '../domain/constants'
import { hitsObstacle } from './geometry'
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
/** Fixed 50ms motion with <= radius/2 substeps; no CSS or wall-clock inputs. */
export function advanceRobot(state: RobotState, world: World): RobotState {
  if (state.status !== 'running') return structuredClone(state)
  const dt = FIXED_STEP_MS / 1000
  const next = structuredClone(state)
  const distance = state.speedCmPerSec * dt
  const segments = Math.max(1, Math.ceil(Math.abs(distance) / (state.radiusCm / 2)))
  const r = (state.headingDeg * Math.PI) / 180
  for (let i = 0; i < segments; i++) {
    const position = {
      xCm: next.position.xCm + (Math.cos(r) * distance) / segments,
      yCm: next.position.yCm + (Math.sin(r) * distance) / segments,
    }
    const wall =
      position.xCm < state.radiusCm ||
      position.yCm < state.radiusCm ||
      position.xCm > world.widthCm - state.radiusCm ||
      position.yCm > world.heightCm - state.radiusCm
    const obstacle = world.obstacles.find((o) => hitsObstacle(position, state.radiusCm, o))
    if (wall || obstacle) {
      next.status = 'stopped'
      next.collision = wall ? 'world-boundary' : obstacle!.id
      next.stopReason = 'collision'
      next.speedCmPerSec = 0
      break
    }
    next.position = position
  }
  next.headingDeg = (((next.headingDeg + state.turnDegPerSec * dt) % 360) + 360) % 360
  next.tick++
  next.simTimeMs += FIXED_STEP_MS
  return next
}
