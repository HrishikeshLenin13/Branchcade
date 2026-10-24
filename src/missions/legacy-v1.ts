import { z } from 'zod'
import { GoalSchema, ProgramSchema, WorldSchema } from '../domain/schemas'
import snapshot from './mission-data/v1.json'

/** Frozen version-1 mission data (Parts A–G), byte-for-byte what earlier releases ran.
 * Attempts and team results recorded without a missionVersion are judged against these
 * worlds and success predicates, so improving a mission (Part H) never rewrites history. */
const LegacyMission = z.strictObject({
  id: z.string(),
  version: z.literal(1),
  world: WorldSchema,
  starterProgram: ProgramSchema,
  successPredicate: z.array(GoalSchema).min(1),
  variants: z.array(z.strictObject({ id: z.string(), world: WorldSchema, program: ProgramSchema })),
  referenceProgram: ProgramSchema,
})
export type LegacyMission = z.infer<typeof LegacyMission>
export const LEGACY_V1: readonly LegacyMission[] = z.array(LegacyMission).parse(snapshot)
export const legacyMission = (id: string) => LEGACY_V1.find((m) => m.id === id)
