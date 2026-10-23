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
