import type { AppExport } from '../domain/types'
import { LIMITS } from '../domain/constants'
import { canonicalJson, stableHash } from '../domain/invariants'
import { migrateData } from './migrations'
import { validateProgram } from '../interpreter/validate'
import { execute } from '../interpreter/interpreter'
import { judgeGoals } from '../missions/goals'
import { FIRST_MISSION } from '../missions/catalog'
import { PROBES } from '../learning/probes'
import { actualAction } from '../interpreter/trace'
export function parseImport(raw: string): AppExport {
  if (new TextEncoder().encode(raw).byteLength > LIMITS.importBytes)
    throw new Error('Import exceeds 500 KB limit')
  return migrateData(JSON.parse(raw) as unknown)
}
export async function validateImport(raw: string): Promise<AppExport> {
  const data = parseImport(raw)
  const predictionIds = new Set<string>()
  for (const a of data.attempts) {
    if (predictionIds.has(a.prediction.id))
      throw new Error('Each reattempt needs a new prediction ID')
    predictionIds.add(a.prediction.id)
    if (
      data.profile?.id !== a.learnerId &&
      !data.teams.some((t) => t.members.some((m) => m.learnerId === a.learnerId))
    )
      throw new Error('Attempt references an unknown local learner')
    validateProgram(a.program)
    if (
      a.prediction.programHash !== (await stableHash(a.program)) ||
      a.prediction.worldHash !== (await stableHash(a.world))
    )
      throw new Error('Attempt identity checksum mismatch')
    const run = execute(a.world, a.program)
    if (a.traceHash !== (await stableHash(run.events)))
      throw new Error('Attempt trace checksum mismatch')
    if (!['m01', 'lab'].includes(a.missionId))
      throw new Error('Unrecognized mission in this release')
    const expected =
      a.missionId === 'lab'
        ? { passed: false, facts: ['Free exploration is not a scored mission'] }
        : judgeGoals(a.world, run, FIRST_MISSION.successPredicate)
    if (canonicalJson(expected) !== canonicalJson(a.goalOutcome))
      throw new Error('Goal outcome does not match actual execution')
    if (
      a.diagnosticResponses.some(
        (r, i) =>
          PROBES[i]?.id !== r.probeId || !PROBES[i]?.choices.some((c) => c.id === r.choiceId),
      )
    )
      throw new Error('Invalid or reordered diagnostic responses')
    if (a.reassessment) {
      const variant = FIRST_MISSION.variants[0]!,
        t = a.reassessment
      if (
        t.worldHash !== (await stableHash(variant.world)) ||
        t.programHash !== (await stableHash(variant.program)) ||
        t.worldHash === a.prediction.worldHash ||
        t.actualAction !== actualAction(execute(variant.world, variant.program).events)
      )
        throw new Error('Transfer result does not match a distinct executed scenario')
    }
  }
  if (
    data.profile?.completedMissions.some(
      (id) =>
        !data.attempts.some(
          (a) =>
            a.learnerId === data.profile?.id &&
            a.missionId === id &&
            a.goalOutcome.passed &&
            a.reassessment?.correct,
        ),
    )
  )
    throw new Error('Completion claim lacks actual mission and transfer evidence')
  for (const team of data.teams) {
    if (team.currentMission !== 'm01') throw new Error('Unknown team mission')
    const [worldHash, programHash] = await Promise.all([
      stableHash(FIRST_MISSION.world),
      stableHash(FIRST_MISSION.starterProgram),
    ])
    if (team.predictions.some((p) => p.worldHash !== worldHash || p.programHash !== programHash))
      throw new Error('Team prediction scenario checksum mismatch')
  }
  return data
}
export function exportJson(data: AppExport) {
  return canonicalJson({ ...data, exportedAt: new Date().toISOString() })
}
export function downloadFile(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
export function exportCsv(data: AppExport) {
  const escape = (v: string) => `"${v.replaceAll('"', '""').replace(/^[=+@-]/, "'$&")}"`
  return [
    'alias,mission,prediction,goal_met,completed_at',
    ...data.attempts.map((a) =>
      [
        data.profile?.id === a.learnerId ? data.profile.nickname : 'local alias',
        a.missionId,
        a.prediction.action,
        String(a.goalOutcome.passed),
        a.completedAt,
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\n')
}
