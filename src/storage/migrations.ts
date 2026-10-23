import { ExportSchema } from '../domain/schemas'
import { assertBounded } from '../domain/invariants'
export const DEFAULT_SETTINGS = {
  schemaVersion: 1,
  theme: 'light',
  reducedMotion: false,
  audioEnabled: false,
  hintsMode: 'guided',
  textSize: 'standard',
  highContrast: false,
  shortcutsOverlay: true,
  lastOpenedMission: null,
} as const
export function emptyData() {
  return ExportSchema.parse({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: null,
    attempts: [],
    teams: [],
  })
}
/** Only the documented pre-release v0 alias/settings shape migrates. No guessing future data. */
export function migrateData(input: unknown) {
  assertBounded(input)
  if (input && typeof input === 'object' && 'schemaVersion' in input && input.schemaVersion === 0) {
    const old = input as { schemaVersion: 0; alias?: unknown }
    if (
      Object.keys(old).some((k) => !['schemaVersion', 'alias'].includes(k)) ||
      typeof old.alias !== 'string' ||
      old.alias.length > 32 ||
      !old.alias.length
    )
      throw new Error('Unrecognized legacy data; original data left untouched')
    return ExportSchema.parse({
      ...emptyData(),
      exportedAt: '1970-01-01T00:00:00.000Z',
      profile: {
        schemaVersion: 1,
        id: 'legacy-local-profile',
        nickname: old.alias,
        settings: DEFAULT_SETTINGS,
        completedMissions: [],
        responses: [],
        evidence: [],
        conceptProgress: [],
      },
    })
  }
  return ExportSchema.parse(input)
}
