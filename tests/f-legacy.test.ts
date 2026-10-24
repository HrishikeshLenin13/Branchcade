import { it, expect } from 'vitest'
import golden from '../docs/evidence/f/legacy-golden.json'
import { LEGACY_V1 } from '../src/missions/legacy-v1'
import { executeRecorded } from '../src/interpreter/interpreter'
import { stableHash } from '../src/domain/invariants'
import type { Program, World } from '../src/domain/types'
it('replays all pre-F starter/reference/transfer fingerprints without rewriting history', async () => {
  // The frozen v1 snapshot is the fixture: later mission versions may add variants.
  const scenarios: [string, World, Program][] = LEGACY_V1.flatMap((m) => [
    [m.id + '-starter', m.world, m.starterProgram] as [string, World, Program],
    [m.id + '-reference', m.world, m.referenceProgram] as [string, World, Program],
    ...m.variants.map((v) => [v.id, v.world, v.program] as [string, World, Program]),
  ])
  expect(scenarios).toHaveLength(golden.length)
  for (const [index, [, world, program]] of scenarios.entries()) {
    const old = golden[index]!,
      run = executeRecorded(world, program)
    expect(await stableHash(run.events)).toBe(old.hash)
    expect(run.robot).toEqual(old.robot)
    expect(run.error).toEqual(old.error)
  }
})
it('the frozen v1 snapshot still matches today’s version-1 mission data', async () => {
  const { MISSION_CATALOG, REFERENCE_PROGRAMS } = await import('../src/missions/catalog')
  for (const m of MISSION_CATALOG.filter((x) => x.version === 1)) {
    const frozen = LEGACY_V1.find((x) => x.id === m.id)!
    expect(frozen.successPredicate).toEqual(m.successPredicate)
    expect(frozen.world).toEqual(m.world)
    expect(frozen.referenceProgram).toEqual(REFERENCE_PROGRAMS[m.id])
  }
})
