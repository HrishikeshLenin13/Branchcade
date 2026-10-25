import { z } from 'zod'
import { GoalSchema, MissionSchema } from '../domain/schemas'
import snapshot from './mission-data/v2-revised.json'

/** Frozen version-2 judging rules for missions revised after Part H. M03 v3 (OPUS-002)
 * also requires the robot to drive on in its far-wall scenarios. Attempts and team results
 * recorded under v2 keep exactly these goals and scenarios, so the revision never
 * rewrites an earlier verdict. Generated once from the v2 catalog; never edit by hand. */
const RevisedV2 = z.strictObject({
  id: z.string(),
  version: z.literal(2),
  successPredicate: z.array(GoalSchema).min(1),
  successScenarios: MissionSchema.shape.successScenarios,
})
export const LEGACY_V2: readonly z.infer<typeof RevisedV2>[] = z.array(RevisedV2).parse(snapshot)
export const legacyV2Rules = (id: string) => LEGACY_V2.find((m) => m.id === id)
/** Versions a saved record of this mission may carry. */
export function supportedMissionVersion(mission: { id: string; version: number }, v: number) {
  return v === mission.version || (v === 2 && Boolean(legacyV2Rules(mission.id)))
}
