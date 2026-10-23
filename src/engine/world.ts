import { WorldSchema, SensorConfigSchema } from '../domain/schemas'
export function makeWorld(distanceCm = 24) {
  return WorldSchema.parse({
    schemaVersion: 1,
    id: `threshold-${distanceCm}`,
    widthCm: 180,
    heightCm: 100,
    obstacles: [
      {
        id: 'obstacle',
        kind: 'rectangle',
        position: { xCm: 46 + distanceCm, yCm: 25 },
        widthCm: 8,
        heightCm: 50,
        solid: true,
        material: 'wood',
      },
    ],
    floorZones: [],
    waypoints: [],
    spawn: { position: { xCm: 40, yCm: 50 }, headingDeg: 0, radiusCm: 6 },
    goals: [],
    collisionConstraints: { stopOnCollision: true, allowOverlap: false },
    difficulty: 'beginner',
  })
}
export const DEFAULT_SENSOR = SensorConfigSchema.parse({
  schemaVersion: 1,
  maxRangeCm: 100,
  originOffset: { xCm: 6, yCm: 0 },
  readingHz: 20,
  colorOffset: { xCm: 0, yCm: 0 },
  normalization: 'null-out-of-range;heading-0-360;cm',
})
/** Nominal Part-F workbench; compact authored missions keep their explicit scale. */
export function makeDefaultWorld() {
  return WorldSchema.parse({
    ...makeWorld(),
    id: 'default-lab',
    widthCm: 600,
    heightCm: 360,
    spawn: { position: { xCm: 100, yCm: 100 }, headingDeg: 0, radiusCm: 16 },
    sensorConfig: { ...DEFAULT_SENSOR, maxRangeCm: 500, originOffset: { xCm: 16, yCm: 0 } },
    obstacles: [
      {
        id: 'obstacle',
        kind: 'rectangle',
        position: { xCm: 140, yCm: 50 },
        widthCm: 20,
        heightCm: 100,
        solid: true,
        material: 'wood',
      },
    ],
  })
}
