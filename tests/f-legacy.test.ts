import { it, expect } from 'vitest'
import golden from '../docs/evidence/f/legacy-golden.json'
import { MISSION_CATALOG, REFERENCE_PROGRAMS } from '../src/missions/catalog'
import { executeRecorded } from '../src/interpreter/interpreter'
import { stableHash } from '../src/domain/invariants'
import type { Program, World } from '../src/domain/types'
it('replays all pre-F starter/reference/transfer fingerprints without rewriting history', async () => {
  const scenarios: [string, World, Program][] = MISSION_CATALOG.flatMap((m) => [
    [m.id + '-starter', m.world, m.starterProgram] as [string, World, Program],
    [m.id + '-reference', m.world, REFERENCE_PROGRAMS[m.id]!] as [string, World, Program],
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
