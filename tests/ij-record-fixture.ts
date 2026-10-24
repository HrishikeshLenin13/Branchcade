import type { AppExport, Attempt } from '../src/domain/types'
import { emptyData } from '../src/storage/migrations'
import { fixtureProfile } from '../src/test/fixtures'
import { makeWorld } from '../src/engine/world'
import { thresholdProgram } from '../src/missions/catalog'
import { execute } from '../src/interpreter/interpreter'
import { recordPrediction } from '../src/learning/predictions'
import { stableHash } from '../src/domain/invariants'
/** Synthetic local records only: every checksum/outcome is produced by actual execution. */
export async function attemptCollection(count = 50): Promise<AppExport> {
  const attempts: Attempt[] = []
  for (let index = 0; index < count; index++) {
    const world = makeWorld(12 + (index % 30)),
      program = thresholdProgram(15 + (index % 30)),
      startedAt = new Date().toISOString(),
      prediction = await recordPrediction(
        fixtureProfile.id,
        world,
        program,
        'move',
        3,
        'Synthetic I/J stress fixture; not student evidence.',
      ),
      run = execute(world, program)
    if (run.error) throw new Error(`Invalid record fixture: ${run.error}`)
    attempts.push({
      schemaVersion: 1,
      engineVersion: 2,
      id: `ij-record-${index}`,
      learnerId: fixtureProfile.id,
      missionId: 'lab',
      attemptIndex: index + 1,
      startedAt,
      completedAt: new Date().toISOString(),
      prediction,
      world,
      program,
      traceHash: await stableHash(run.events),
      diagnosticResponses: [],
      reassessment: null,
      goalOutcome: { passed: false, facts: ['Free exploration is not a scored mission'] },
    })
  }
  return { ...emptyData(), profile: fixtureProfile, attempts }
}
