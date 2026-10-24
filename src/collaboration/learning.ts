import type { TeamSession, World } from '../domain/types'
import { TeamSessionSchema } from '../domain/schemas'
import { opaqueId } from '../domain/invariants'
import { findMission } from '../missions/catalog'
import { curriculumFor } from '../missions/curriculum'
import { detailChoices } from '../learning/diagnosis'
import { answerLabel } from '../learning/probe-templates'
import { observe, runModel } from '../learning/mental-models'
export type TeamHelpKind = TeamSession['assistance'][number]['kind']
export function recordTeamAssistance(team: TeamSession, kind: TeamHelpKind): TeamSession {
  if (team.status !== 'active' && team.status !== 'completed')
    throw new Error('Resume the team before opening shared help')
  const mission = findMission(team.currentMission)
  if (!mission || !curriculumFor(mission.id))
    throw new Error('No compatible hint ladder is available for this mission')
  const seen = team.assistance.filter((h) => h.round === team.rotationIndex)
  if (seen.some((h) => h.kind === kind)) return team
  const previous =
    kind === 'hint-2'
      ? 'hint-1'
      : kind === 'hint-3'
        ? 'hint-2'
        : kind === 'show-solution'
          ? 'hint-3'
          : null
  if (previous && !seen.some((h) => h.kind === previous))
    throw new Error('Read the hint ladder in order before revealing the solution')
  return TeamSessionSchema.parse({
    ...team,
    assistance: [
      ...team.assistance,
      {
        id: opaqueId(),
        round: team.rotationIndex,
        kind,
        missionVersion: mission.version,
        recordedAt: new Date().toISOString(),
        afterRun: team.results.some((r) => r.round === team.rotationIndex),
        afterPredictionIds: team.predictions.map((p) => p.id),
      },
    ],
  })
}
export function teamDetailOptions(team: TeamSession) {
  const mission = findMission(team.currentMission),
    detail = curriculumFor(team.currentMission)?.detail
  if (!mission || !detail) return []
  const program = team.program ?? mission.starterProgram
  return detailChoices(
    `team-detail:${JSON.stringify([mission.world, program])}`,
    mission.world,
    program,
    detail.question,
  )
}
export function teamDetailTruth(team: TeamSession) {
  const mission = findMission(team.currentMission),
    detail = curriculumFor(team.currentMission)?.detail
  if (!mission || !detail) return null
  const result = team.results.find((r) => r.round === team.rotationIndex),
    world = (result?.world ?? mission.world) as World,
    program = result?.program ?? team.program ?? mission.starterProgram
  // H's question observables are v2 only. Historical records retain their first-action replay.
  if (result && result.engineVersion !== 2) return null
  const answer = observe(
    detail.question,
    runModel(`team-truth:${JSON.stringify([world, program])}`, world, program, 'NO_MISCONCEPTION'),
  )
  return {
    question: detail.question,
    answer,
    label: answerLabel(detail.question, answer),
    prompt: detail.prompt,
  }
}
/** Untrusted team help and second answers are checked independently of solo mastery. */
export function validateTeamLearning(team: TeamSession) {
  const mission = findMission(team.currentMission)
  if (!mission) throw new Error('Unknown team mission')
  const detail = curriculumFor(mission.id)?.detail
  for (const h of team.assistance) {
    if (h.missionVersion !== mission.version)
      throw new Error('Unsupported team assistance mission version')
    if (
      h.afterRun &&
      !team.results.some(
        (r) => r.round === h.round && Date.parse(r.recordedAt) <= Date.parse(h.recordedAt),
      )
    )
      throw new Error('Team assistance references a run that has not happened')
    const roundResult = team.results.find((r) => r.round === h.round)
    if (!h.afterRun && roundResult && Date.parse(h.recordedAt) > Date.parse(roundResult.recordedAt))
      throw new Error('Team assistance marked before execution was recorded after its run')
    const previous =
      h.kind === 'hint-2'
        ? 'hint-1'
        : h.kind === 'hint-3'
          ? 'hint-2'
          : h.kind === 'show-solution'
            ? 'hint-3'
            : null
    if (
      previous &&
      !team.assistance.some(
        (p) =>
          p.round === h.round &&
          p.kind === previous &&
          Date.parse(p.recordedAt) <= Date.parse(h.recordedAt),
      )
    )
      throw new Error('Invalid team hint ladder sequence')
    const predictions = team.predictionHistory
      .filter((p) => p.round === h.round)
      .map((p) => p.prediction)
    for (const p of h.round === team.rotationIndex ? team.predictions : [])
      if (!predictions.some((x) => x.id === p.id)) predictions.push(p)
    if (
      h.afterPredictionIds.some(
        (id) =>
          !predictions.some(
            (p) => p.id === id && Date.parse(p.recordedAt) <= Date.parse(h.recordedAt),
          ),
      ) ||
      predictions.some(
        (p) =>
          Date.parse(p.recordedAt) < Date.parse(h.recordedAt) &&
          !h.afterPredictionIds.includes(p.id),
      )
    )
      throw new Error('Team assistance prediction chronology does not match')
  }
  for (const r of team.results) {
    if (r.assistanceIds !== undefined) {
      const expected = team.assistance
        .filter((h) => h.round === r.round && !h.afterRun)
        .map((h) => h.id)
      if (expected.some((id) => !r.assistanceIds!.includes(id)))
        throw new Error('Team result omitted assistance viewed before execution')
    }
  }
  const predictions = [
    ...team.predictionHistory.map((h) => ({ round: h.round, prediction: h.prediction })),
    ...team.predictions
      .filter((p) => !team.predictionHistory.some((h) => h.prediction.id === p.id))
      .map((prediction) => ({ round: team.rotationIndex, prediction })),
  ]
  for (const h of predictions) {
    if (!h.prediction.detail) continue
    const result = team.results.find((r) => r.round === h.round),
      world = (result?.world ?? mission.world) as World,
      program = result?.program ?? team.program ?? mission.starterProgram
    if (
      !detail ||
      h.prediction.detail.question !== detail.question ||
      !detailChoices(
        `team-import:${JSON.stringify([world, program])}`,
        world,
        program,
        detail.question,
      ).some((c) => c.id === h.prediction.detail!.answer)
    )
      throw new Error('Invalid optional team prediction question or answer')
  }
}
// Public collaboration learning entrypoint; round execution remains a focused module.
export { runTeamRound, advanceTeamRound } from './round'
