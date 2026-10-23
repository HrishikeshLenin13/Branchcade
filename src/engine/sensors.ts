import type { World, RobotState, SensorSnapshot, SensorConfig } from '../domain/types'
import { rayCircle, rayRectangle, containsZone, transformOffset } from './geometry'
import { DEFAULT_SENSOR } from './world'
/** Passive measurement. Reading sensors never changes robot state. */
export function readSensors(
  world: World,
  robot: RobotState,
  config: SensorConfig = world.sensorConfig ?? DEFAULT_SENSOR,
): SensorSnapshot {
  const origin = transformOffset(robot.position, robot.headingDeg, config.originOffset)
  const r = (robot.headingDeg * Math.PI) / 180,
    direction = { xCm: Math.cos(r), yCm: Math.sin(r) }
  const wallDistances = [
    direction.xCm > 1e-9
      ? (world.widthCm - origin.xCm) / direction.xCm
      : direction.xCm < -1e-9
        ? -origin.xCm / direction.xCm
        : Infinity,
    direction.yCm > 1e-9
      ? (world.heightCm - origin.yCm) / direction.yCm
      : direction.yCm < -1e-9
        ? -origin.yCm / direction.yCm
        : Infinity,
  ]
  let distance =
      world.boundaryDetectable === false
        ? Infinity
        : Math.min(...wallDistances.filter((t) => t >= 0)),
    hitId: string | null = world.boundaryDetectable === false ? null : 'world-boundary'
  for (const o of world.obstacles.filter((o) => o.solid)) {
    const t =
      o.kind === 'rectangle'
        ? rayRectangle(origin, direction, o.position, o.widthCm, o.heightCm)
        : rayCircle(origin, direction, o.position, o.radiusCm)
    if (t !== null && t < distance) {
      distance = t
      hitId = o.id
    }
  }
  const inRange = distance <= config.maxRangeCm
  // A stateless per-tick seeded perturbation stays reproducible and never changes hit geometry.
  let seed = ((config.noiseSeed ?? 0) ^ robot.tick) >>> 0
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0
  const noise = config.noiseSeed === undefined ? 0 : ((seed % 1001) / 1000 - 0.5) * 0.1
  const measured = inRange
    ? Math.max(0, Math.min(config.maxRangeCm, distance + noise))
    : config.maxRangeCm
  const point = transformOffset(robot.position, robot.headingDeg, config.colorOffset)
  const floor = [...world.floorZones]
    .sort((a, b) => b.priority - a.priority)
    .find((z) => containsZone(point, z))
  return {
    schemaVersion: 1,
    distanceCm: inRange ? measured : null,
    surfaceColor: floor?.color ?? 'white',
    position: { ...robot.position },
    headingDeg: robot.headingDeg,
    tick: robot.tick,
    ray: {
      origin,
      end: {
        xCm: origin.xCm + direction.xCm * measured,
        yCm: origin.yCm + direction.yCm * measured,
      },
      hitId: inRange ? hitId : null,
      maxRangeCm: config.maxRangeCm,
    },
  }
}
