import type { Prediction, Program, World } from '../domain/types'
import { PredictionSchema } from '../domain/schemas'
import { stableHash, opaqueId, immutable } from '../domain/invariants'
export async function recordPrediction(
  learnerId: string,
  world: World,
  program: Program,
  action: Prediction['action'],
  confidence: number,
  reasoning = '',
): Promise<Readonly<Prediction>> {
  const [worldHash, programHash] = await Promise.all([stableHash(world), stableHash(program)])
  return immutable(
    PredictionSchema.parse({
      schemaVersion: 1,
      id: opaqueId(),
      question: 'What will this program do first?',
      worldHash,
      programHash,
      learnerId,
      action,
      branch: null,
      distanceRange: null,
      confidence,
      reasoning,
      recordedAt: new Date().toISOString(),
    }),
  )
}
