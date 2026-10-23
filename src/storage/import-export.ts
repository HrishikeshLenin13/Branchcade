import type { AppExport, Attempt, LearnerProfile } from '../domain/types'
import { ExportSchema } from '../domain/schemas'
import { LIMITS } from '../domain/constants'
import { canonicalJson, stableHash } from '../domain/invariants'
import { migrateData } from './migrations'
import { validateProgram } from '../interpreter/validate'
import { execute } from '../interpreter/interpreter'
import { judgeGoals } from '../missions/goals'
import { MISSION_CATALOG } from '../missions/catalog'
import { probesForMission } from '../learning/probes'
import { actualAction } from '../interpreter/trace'
import { supportedConceptHashes, trimConceptProgress } from './progress-records'
export function parseImport(raw: string): AppExport {
  if (new TextEncoder().encode(raw).byteLength > LIMITS.importBytes)
    throw new Error('Import exceeds 500 KB limit')
  try {
    return migrateData(JSON.parse(raw) as unknown)
  } catch (e) {
    if (e && typeof e === 'object' && 'issues' in e && Array.isArray(e.issues)) {
      const issue = e.issues[0] as { path: (string | number)[]; message: string }
      throw new Error(`Invalid record at ${issue.path.join('.') || 'root'}: ${issue.message}`)
    }
    throw e
  }
}
const profiles = (data: AppExport) => [...(data.profile ? [data.profile] : []), ...data.profiles]
export async function validateImport(raw: string): Promise<AppExport> {
  const data = parseImport(raw),
    predictionIds = new Set<string>()
  for (const saved of [...data.savedLabs, ...data.drafts]) validateProgram(saved.program)
  for (const d of data.drafts) {
    if (!profiles(data).some((p) => p.id === d.learnerId))
      throw new Error('Draft references an unknown local learner')
    if (d.missionId !== 'lab' && !MISSION_CATALOG.some((m) => m.id === d.missionId))
      throw new Error('Draft references an unknown mission')
    if (
      d.attemptId &&
      !data.attempts.some(
        (a) => a.id === d.attemptId && a.learnerId === d.learnerId && a.missionId === d.missionId,
      )
    )
      throw new Error('Draft references an incompatible attempt')
  }
  for (const a of data.attempts) {
    if (predictionIds.has(a.prediction.id))
      throw new Error('Each reattempt needs a new prediction ID')
    predictionIds.add(a.prediction.id)
    if (
      !profiles(data).some((p) => p.id === a.learnerId) &&
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
    const mission = MISSION_CATALOG.find((m) => m.id === a.missionId)
    if (!mission && a.missionId !== 'lab') throw new Error('Unrecognized mission in this release')
    const expected = mission
      ? judgeGoals(a.world, run, mission.successPredicate)
      : { passed: false, facts: ['Free exploration is not a scored mission'] }
    if (canonicalJson(expected) !== canonicalJson(a.goalOutcome))
      throw new Error('Goal outcome does not match actual execution')
    const missionProbes = mission ? probesForMission(mission) : []
    if (
      a.diagnosticResponses.some(
        (r, i) =>
          missionProbes[i]?.id !== r.probeId ||
          !missionProbes[i]?.choices.some((c) => c.id === r.choiceId),
      )
    )
      throw new Error('Invalid or reordered diagnostic responses')
    for (const t of [...(a.reassessment ? [a.reassessment] : []), ...(a.transferRetries ?? [])]) {
      let matches = false
      for (const variant of mission?.variants ?? []) {
        if (
          t.worldHash === (await stableHash(variant.world)) &&
          t.programHash === (await stableHash(variant.program)) &&
          t.worldHash !== a.prediction.worldHash &&
          t.actualAction === actualAction(execute(variant.world, variant.program).events)
        )
          matches = true
      }
      if (!matches) throw new Error('Transfer result does not match a distinct executed scenario')
    }
  }
  for (const p of profiles(data)) {
    for (const progress of p.conceptProgress) {
      const supported = supportedConceptHashes(data.attempts, p.id, progress.concept)
      const count = new Set(progress.distinctScenarioHashes).size
      if (
        !MISSION_CATALOG.some((m) => m.conceptGoals.includes(progress.concept)) ||
        count !== progress.distinctScenarioHashes.length ||
        count !== progress.independentSuccesses ||
        progress.distinctScenarioHashes.some((hash) => !supported.has(hash)) ||
        (progress.status === 'developing' && count < 2) ||
        (progress.status === 'not_started' && count > 0)
      )
        throw new Error('Concept progress claim lacks distinct independent transfer evidence')
    }
    if (
      p.completedMissions.some(
        (id) =>
          !data.attempts.some(
            (a) =>
              a.learnerId === p.id &&
              a.missionId === id &&
              a.goalOutcome.passed &&
              (a.reassessment?.correct || a.transferRetries?.some((r) => r.correct)),
          ),
      )
    )
      throw new Error('Completion claim lacks actual mission and transfer evidence')
  }
  for (const team of data.teams) {
    const mission = MISSION_CATALOG.find((m) => m.id === team.currentMission)
    if (!mission) throw new Error('Unknown team mission')
    const [worldHash, programHash] = await Promise.all([
      stableHash(mission.world),
      stableHash(team.program ?? mission.starterProgram),
    ])
    if (team.predictions.some((p) => p.worldHash !== worldHash || p.programHash !== programHash))
      throw new Error('Team prediction scenario checksum mismatch')
    for (const h of team.predictionHistory) {
      const result = team.results.find((r) => r.round === h.round)
      const historicalWorldHash = await stableHash(result?.world ?? mission.world)
      const historicalProgramHash = await stableHash(
        result?.program ?? team.program ?? mission.starterProgram,
      )
      if (
        h.prediction.worldHash !== historicalWorldHash ||
        h.prediction.programHash !== historicalProgramHash
      )
        throw new Error('Historical team prediction checksum mismatch')
    }
    validateProgram(team.program ?? mission.starterProgram)
    for (const r of team.results) {
      const world = r.world ?? mission.world,
        program = r.program ?? mission.starterProgram
      validateProgram(program)
      const run = execute(world, program),
        traceHash = await stableHash(run.events),
        goal = judgeGoals(world, run, mission.successPredicate)
      if (r.traceHash !== traceHash || r.goalPassed !== goal.passed)
        throw new Error('Team result does not match actual execution')
    }
  }
  if (data.assignments.some((a) => !MISSION_CATALOG.some((m) => m.id === a.missionId)))
    throw new Error('Assignment references an unknown mission')
  return data
}
export function exportJson(data: AppExport) {
  return canonicalJson(
    ExportSchema.parse({
      ...data,
      sourceAppVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
    }),
  )
}
export function downloadFile(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
export function csvCell(v: string) {
  // Spreadsheet engines can ignore leading whitespace before interpreting a formula.
  const safe = /^[=+@-]/u.test(v.trimStart()) ? `'${v}` : v
  return `"${safe.replaceAll('"', '""')}"`
}
export function exportCsv(data: AppExport) {
  return [
    'alias,mission,prediction,goal_met,completed_at',
    ...data.attempts.map((a) =>
      [
        profiles(data).find((p) => p.id === a.learnerId)?.nickname ??
          data.teams.flatMap((t) => t.members).find((m) => m.learnerId === a.learnerId)?.alias ??
          'local alias',
        a.missionId,
        a.prediction.uncertain ? 'not sure yet' : a.prediction.action,
        String(a.goalOutcome.passed),
        a.completedAt,
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\n')
}
/** Explicit merge policy: existing IDs win; new IDs are appended. Never rewrites an existing attempt. */
export function mergeData(current: AppExport, incoming: AppExport): AppExport {
  const unique = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a,
    ...b.filter((x) => !a.some((y) => y.id === x.id)),
  ]
  const all = unique(profiles(current), profiles(incoming)),
    active = current.profile ?? incoming.profile
  return ExportSchema.parse({
    ...current,
    profile: active,
    profiles: all.filter((p) => p.id !== active?.id),
    attempts: unique(current.attempts, incoming.attempts),
    teams: unique(current.teams, incoming.teams),
    savedLabs: unique(current.savedLabs, incoming.savedLabs),
    drafts: unique(current.drafts, incoming.drafts),
    assignments: unique(current.assignments, incoming.assignments),
  })
}
/** A scoped envelope retains only completion claims supported by included attempts. */
export function scopedData(
  data: AppExport,
  attempts: Attempt[],
  learnerIds: string[],
  teamIds: string[] = [],
): AppExport {
  const trim = (p: LearnerProfile) => ({
    ...p,
    conceptProgress: trimConceptProgress(p, attempts),
    completedMissions: p.completedMissions.filter((id) =>
      attempts.some(
        (a) =>
          a.learnerId === p.id &&
          a.missionId === id &&
          a.goalOutcome.passed &&
          (a.reassessment?.correct || a.transferRetries?.some((r) => r.correct)),
      ),
    ),
    responses: p.responses.filter((r) => attempts.some((a) => a.prediction.id === r.id)),
    evidence: p.evidence.filter((e) =>
      attempts.some(
        (a) =>
          a.prediction.id === e.answerId ||
          a.diagnosticResponses.some((r) => `${a.id}-${r.probeId}` === e.answerId),
      ),
    ),
  })
  const people = profiles(data)
      .filter((p) => learnerIds.includes(p.id))
      .map(trim),
    teams = data.teams.filter((t) => teamIds.includes(t.id))
  return ExportSchema.parse({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: people[0] ?? null,
    profiles: people.slice(1),
    attempts,
    teams,
    savedLabs: [],
    drafts: [],
    assignments: data.assignments.filter((a) => teamIds.includes(a.teamId)),
  })
}
