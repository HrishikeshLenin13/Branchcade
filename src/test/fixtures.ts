import { FIRST_MISSION } from '../missions/catalog'
import { LearnerProfileSchema } from '../domain/schemas'
import { DEFAULT_SETTINGS } from '../storage/migrations'
export const fixtureWorld = FIRST_MISSION.world
export const fixtureProgram = FIRST_MISSION.starterProgram
export const fixtureMission = FIRST_MISSION
export const fixtureProfile = LearnerProfileSchema.parse({
  schemaVersion: 1,
  id: 'test-learner',
  nickname: 'Test Robot',
  settings: DEFAULT_SETTINGS,
  completedMissions: [],
  responses: [],
  evidence: [],
  conceptProgress: [],
})
