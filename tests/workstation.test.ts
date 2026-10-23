import { describe, expect, it } from 'vitest'
import * as Blockly from 'blockly/core'
import { MISSION_CATALOG, REFERENCE_PROGRAMS, thresholdProgram } from '../src/missions/catalog'
import { makeWorld } from '../src/engine/world'
import { execute } from '../src/interpreter/interpreter'
import { actualAction } from '../src/interpreter/trace'
import { WorldSchema } from '../src/domain/schemas'
import { readSensors } from '../src/engine/sensors'
import { initialRobot } from '../src/engine/robot'
import { editableProgram, programWorkspace } from '../src/features/lab/program-workspace'
import {
  addObstacle,
  editDemoCondition,
  parseWorldImport,
  positionObstacle,
  presetWorld,
  worldExport,
  WORLD_PRESETS,
} from '../src/features/lab/world-tools'

describe('world authoring uses authoritative validation and sensor geometry', () => {
  for (const preset of WORLD_PRESETS)
    it(`${preset} produces a legal, executable initial world`, () => {
      const world = presetWorld(preset)
      expect(WorldSchema.safeParse(world).success).toBe(true)
      expect(execute(world, thresholdProgram()).error).toBeNull()
    })
  it('positions circles by their radius, rejects spawn overlap and keeps actual distance accurate', () => {
    const world = makeWorld(),
      moved = positionObstacle(world, 'obstacle', 85)
    expect(readSensors(moved, initialRobot(moved)).distanceCm).toBe(39)
    expect(() => positionObstacle(world, 'obstacle', 42)).toThrow(/Spawn overlaps/)
    const circle = addObstacle(presetWorld('Empty Room'), 'circle', 'new-circle')
    const clamped = positionObstacle(circle, 'new-circle', -50, 200)
    expect(clamped.obstacles[0]?.position).toEqual({ xCm: 7, yCm: 93 })
    expect(world.obstacles[0]?.position.xCm).toBe(70)
  })
  it('finds a collision-free added box and rejects a duplicate object ID', () => {
    const world = addObstacle(makeWorld(), 'rectangle', 'new-box')
    expect(world.obstacles).toHaveLength(2)
    expect(WorldSchema.safeParse(world).success).toBe(true)
    expect(() => addObstacle(world, 'circle', 'new-box')).toThrow(/No legal space/)
  })
  it('range changes null readings and the interpreter branch from the same configuration', () => {
    const world = makeWorld(),
      limited = {
        ...world,
        sensorConfig: {
          schemaVersion: 1 as const,
          maxRangeCm: 10,
          originOffset: { xCm: 6, yCm: 0 },
          readingHz: 20 as const,
          colorOffset: { xCm: 0, yCm: 0 },
          normalization: 'null-out-of-range;heading-0-360;cm' as const,
        },
      }
    expect(readSensors(limited, initialRobot(limited)).distanceCm).toBeNull()
    const program = editDemoCondition(thresholdProgram(), 20, '>')
    expect(actualAction(execute(world, program).events)).toBe('stop')
    expect(actualAction(execute(limited, program).events)).toBe('move')
  })
  it('changes only the designated first comparison and never silently replaces a custom program', () => {
    const before = thresholdProgram(),
      after = editDemoCondition(before, 30, '>=')
    expect(before.body).not.toEqual(after.body)
    expect(
      before.body[0]?.kind === 'if' &&
        before.body[0].condition.kind === 'compare' &&
        before.body[0].condition.op,
    ).toBe('<')
    expect(after.body[0]?.kind === 'if' && after.body[0].then).toEqual(
      before.body[0]?.kind === 'if' && before.body[0].then,
    )
    expect(() =>
      editDemoCondition(
        { schemaVersion: 1, id: 'custom', body: [{ nodeId: 'stop', kind: 'stop' }] },
        20,
        '<',
      ),
    ).toThrow(/no first numeric comparison/)
  })
})

describe('world transfer is previewable and integrity checked', () => {
  it('round-trips checksummed exports and legacy raw worlds', async () => {
    const world = presetWorld('Colored Line'),
      file = await worldExport(world)
    expect(await parseWorldImport(JSON.stringify(file))).toEqual(world)
    expect(await parseWorldImport(JSON.stringify(world))).toEqual(world)
    await expect(
      parseWorldImport(JSON.stringify({ ...file, world: { ...world, widthCm: 181 } })),
    ).rejects.toThrow(/checksum/)
    await expect(parseWorldImport(JSON.stringify({ ...file, schemaVersion: 2 }))).rejects.toThrow(
      /version/,
    )
    await expect(
      parseWorldImport(JSON.stringify({ ...file, externalUrl: 'https://invalid.example' })),
    ).rejects.toThrow(/Unexpected/)
    await expect(
      parseWorldImport(JSON.stringify({ ...world, externalUrl: 'https://invalid.example' })),
    ).rejects.toThrow()
    await expect(parseWorldImport(' '.repeat(500001))).rejects.toThrow(/500 KB/)
  })
})

describe('editable Blockly round-trip preserves all curriculum behavior', () => {
  for (const mission of MISSION_CATALOG) {
    for (const [label, program] of [
      ['starter', mission.starterProgram],
      ['reference', REFERENCE_PROGRAMS[mission.id]!],
    ] as const) {
      it(`${mission.id} ${label} preserves actual execution including functions, variables, loops and colors`, () => {
        const workspace = new Blockly.Workspace()
        try {
          Blockly.serialization.workspaces.load(programWorkspace(program), workspace)
          const converted = editableProgram(workspace),
            before = execute(mission.world, program),
            after = execute(mission.world, converted)
          expect(after.error).toBe(before.error)
          expect(after.robot).toEqual(before.robot)
          expect(
            after.events.map((event) => ({
              kind: event.kind,
              facts: event.facts,
              nodeId: event.nodeId,
              variables: event.variables,
              evaluation: event.evaluation,
            })),
          ).toEqual(
            before.events.map((event) => ({
              kind: event.kind,
              facts: event.facts,
              nodeId: event.nodeId,
              variables: event.variables,
              evaluation: event.evaluation,
            })),
          )
        } finally {
          workspace.dispose()
        }
      })
    }
  }
  it('rejects disconnected instructions rather than silently executing one stack', () => {
    const workspace = new Blockly.Workspace()
    try {
      workspace.newBlock('bc_stop')
      workspace.newBlock('bc_move')
      expect(() => editableProgram(workspace)).toThrow(/Connect all blocks/)
    } finally {
      workspace.dispose()
    }
  })
})
