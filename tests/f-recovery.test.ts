import { expect, it } from 'vitest'
import { rebuildSnapshot } from '../src/interpreter/source-replay'
import { makeWorld, DEFAULT_SENSOR } from '../src/engine/world'
import { execute } from '../src/interpreter/interpreter'
import { thresholdProgram } from '../src/missions/catalog'
import { stableHash } from '../src/domain/invariants'
import { replayAt } from '../src/engine/replay'
it('regenerates an evicted snapshot from original hashed inputs/seed without recorded trace mutation', async () => {
  const world = { ...makeWorld(), sensorConfig: { ...DEFAULT_SENSOR, noiseSeed: 123 } },
    program = thresholdProgram()
  const run = execute(world, program),
    original = JSON.stringify(run)
  const proof = {
    worldHash: await stableHash(world),
    programHash: await stableHash(program),
    traceHash: await stableHash(run.events),
    eventCursor: 5,
  }
  const snapshot = await rebuildSnapshot(world, program, proof)
  expect(snapshot.robot).toEqual(replayAt(world, run.events, 5))
  expect(snapshot.seed).toBe(123)
  expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  expect(JSON.stringify(run)).toBe(original)
  expect(
    (await rebuildSnapshot(world, program, { ...proof, eventCursor: run.events.length })).robot,
  ).toEqual(run.robot)
})
it('rejects changed world, program, trace proof and invalid cursor instead of guessing recovery', async () => {
  const world = makeWorld(),
    program = thresholdProgram(),
    run = execute(world, program)
  const proof = {
    worldHash: await stableHash(world),
    programHash: await stableHash(program),
    traceHash: await stableHash(run.events),
    eventCursor: 1,
  }
  await expect(rebuildSnapshot(makeWorld(30), program, proof)).rejects.toThrow('world checksum')
  await expect(rebuildSnapshot(world, thresholdProgram(30), proof)).rejects.toThrow(
    'program checksum',
  )
  await expect(
    rebuildSnapshot(world, program, { ...proof, traceHash: '0'.repeat(64) }),
  ).rejects.toThrow('trace checksum')
  await expect(rebuildSnapshot(world, program, { ...proof, eventCursor: 99999 })).rejects.toThrow(
    'cursor',
  )
})
it('supports real rebuild cancellation without changing any source record', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(
    rebuildSnapshot(
      makeWorld(),
      thresholdProgram(),
      {
        worldHash: '0'.repeat(64),
        programHash: '0'.repeat(64),
        traceHash: '0'.repeat(64),
        eventCursor: 0,
      },
      controller.signal,
    ),
  ).rejects.toThrow('cancelled')
})
