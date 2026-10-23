import type { World, Program, Obstacle } from '../../domain/types'
import { WorldSchema } from '../../domain/schemas'
import { assertBounded, stableHash } from '../../domain/invariants'
import { makeWorld } from '../../engine/world'

export const WORLD_PRESETS = [
  'Empty Room',
  'Wall Approach',
  'Colored Line',
  'Maze',
  'Threshold Playground',
  'Function Route',
] as const
export type WorldPreset = (typeof WORLD_PRESETS)[number]

export function presetWorld(preset: WorldPreset): World {
  const world = makeWorld()
  world.id = preset.toLowerCase().replaceAll(' ', '-')
  if (preset === 'Empty Room' || preset === 'Colored Line' || preset === 'Function Route')
    world.obstacles = []
  if (preset === 'Colored Line')
    world.floorZones = [
      {
        id: 'line',
        kind: 'rectangle',
        position: { xCm: 20, yCm: 45 },
        widthCm: 140,
        heightCm: 10,
        color: 'black',
        priority: 1,
      },
    ]
  if (preset === 'Maze')
    world.obstacles = [
      {
        id: 'wall-a',
        kind: 'rectangle',
        position: { xCm: 70, yCm: 15 },
        widthCm: 8,
        heightCm: 60,
        material: 'wood',
        solid: true,
      },
      {
        id: 'wall-b',
        kind: 'rectangle',
        position: { xCm: 115, yCm: 35 },
        widthCm: 8,
        heightCm: 60,
        material: 'wood',
        solid: true,
      },
    ]
  if (preset === 'Function Route') {
    world.waypoints = [
      { xCm: 80, yCm: 50 },
      { xCm: 80, yCm: 80 },
      { xCm: 120, yCm: 80 },
    ]
    world.floorZones = [
      {
        id: 'destination',
        kind: 'rectangle',
        position: { xCm: 112, yCm: 72 },
        widthCm: 16,
        heightCm: 16,
        color: 'green',
        priority: 1,
      },
    ]
  }
  return WorldSchema.parse(world)
}

export function positionObstacle(world: World, id: string, xCm: number, yCm?: number): World {
  if (!Number.isFinite(xCm) || (yCm !== undefined && !Number.isFinite(yCm)))
    throw new Error('Coordinates must be finite numbers.')
  const next = structuredClone(world),
    object = next.obstacles.find((o) => o.id === id)
  if (!object) throw new Error('Select an obstacle first.')
  const radius = object.kind === 'circle' ? object.radiusCm : 0
  object.position = {
    xCm: Math.max(
      radius,
      Math.min(next.widthCm - (object.kind === 'circle' ? radius : object.widthCm), xCm),
    ),
    yCm: Math.max(
      radius,
      Math.min(
        next.heightCm - (object.kind === 'circle' ? radius : object.heightCm),
        yCm ?? object.position.yCm,
      ),
    ),
  }
  return WorldSchema.parse(next)
}

/** Finds a legal position by validating the same solids/spawn invariants as execution. */
export function addObstacle(world: World, kind: 'rectangle' | 'circle', id: string): World {
  for (let yCm = 15; yCm < world.heightCm - 12; yCm += 15) {
    for (let xCm = 15; xCm < world.widthCm - 12; xCm += 15) {
      const object: Obstacle =
        kind === 'circle'
          ? { id, kind, position: { xCm, yCm }, radiusCm: 7, material: 'foam', solid: true }
          : {
              id,
              kind,
              position: { xCm, yCm },
              widthCm: 12,
              heightCm: 12,
              material: 'wood',
              solid: true,
            }
      const checked = WorldSchema.safeParse({ ...world, obstacles: [...world.obstacles, object] })
      if (checked.success) return checked.data
    }
  }
  throw new Error('No legal space for another obstacle. Move or remove an object first.')
}

export function editDemoCondition(
  program: Program,
  threshold: number,
  comparator: '<' | '<=' | '>' | '>=' | '==' | '!=',
): Program {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)
    throw new Error('Threshold must be between 0 and 100 cm.')
  const next = structuredClone(program),
    first = next.body[0]
  if (
    first?.kind !== 'if' ||
    first.condition.kind !== 'compare' ||
    first.condition.right.kind !== 'literal' ||
    first.condition.right.type !== 'number'
  ) {
    throw new Error(
      'This program has no first numeric comparison. Edit its blocks instead; no other code was changed.',
    )
  }
  first.condition.op = comparator
  first.condition.right.value = threshold
  return next
}

export async function worldExport(world: World) {
  const checked = WorldSchema.parse(world)
  return {
    kind: 'branchcade-world',
    schemaVersion: 1,
    checksum: await stableHash(checked),
    world: checked,
  }
}

export async function parseWorldImport(text: string): Promise<World> {
  if (new TextEncoder().encode(text).byteLength > 500_000) throw new Error('World exceeds 500 KB.')
  const value: unknown = JSON.parse(text)
  assertBounded(value)
  if (value && typeof value === 'object' && 'kind' in value && value.kind === 'branchcade-world') {
    if (
      !('schemaVersion' in value) ||
      value.schemaVersion !== 1 ||
      !('world' in value) ||
      !('checksum' in value)
    )
      throw new Error('Unknown world export version.')
    const world = WorldSchema.parse(value.world)
    if (value.checksum !== (await stableHash(world)))
      throw new Error('World checksum does not match its contents.')
    if (
      Object.keys(value).some(
        (key) => !['kind', 'schemaVersion', 'checksum', 'world'].includes(key),
      )
    )
      throw new Error('Unexpected world export fields.')
    return world
  }
  return WorldSchema.parse(value)
}
