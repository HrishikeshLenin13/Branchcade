import type { Program, World } from '../domain/types'
import { stableHash } from '../domain/invariants'
import { replayAt } from '../engine/replay'
import { executeAsync } from './interpreter'
export type ReplayProof = {
  programHash: string
  worldHash: string
  traceHash: string
  eventCursor: number
}
/** Cache-independent recovery: restart the same bounded program/world/seed, verify
 * every identity and the resulting trace, then restore the exact selected event.
 * Returns a separate serializable snapshot; never edits a recorded attempt. */
export async function rebuildSnapshot(
  world: World,
  program: Program,
  proof: ReplayProof,
  signal?: AbortSignal,
) {
  const cancelled = () => {
    if (signal?.aborted) throw new Error('Replay rebuild cancelled')
  }
  cancelled()
  const [worldHash, programHash] = await Promise.all([stableHash(world), stableHash(program)])
  if (worldHash !== proof.worldHash) throw new Error('Replay world checksum mismatch')
  if (programHash !== proof.programHash) throw new Error('Replay program checksum mismatch')
  cancelled()
  const run = await executeAsync(world, program, signal)
  cancelled()
  if ((await stableHash(run.events)) !== proof.traceHash)
    throw new Error('Replay trace checksum mismatch')
  cancelled()
  const robot = replayAt(world, run.events, proof.eventCursor)
  return {
    robot,
    eventCursor: proof.eventCursor,
    variables: { ...(run.events[proof.eventCursor - 1]?.variables ?? {}) },
    seed: world.sensorConfig?.noiseSeed ?? null,
    traceHash: proof.traceHash,
  }
}
