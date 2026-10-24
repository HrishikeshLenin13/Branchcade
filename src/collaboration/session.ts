import { TeamSessionSchema } from '../domain/schemas'
import type { TeamSession, Prediction } from '../domain/types'
import { opaqueId } from '../domain/invariants'
import { ROLES } from './roles'
export function createTeam(
  aliases: string[],
  missionId = 'm01',
  name = 'Local investigation',
): TeamSession {
  const clean = aliases.map((alias) =>
    alias
      .trim()
      .split('')
      .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
      .join('')
      .slice(0, 32),
  )
  if (clean.some((a) => !a) || new Set(clean.map((a) => a.toLowerCase())).size !== clean.length)
    throw new Error('Use a different non-empty alias for each teammate')
  const members = clean.map((alias, i) => ({ learnerId: opaqueId(), alias, role: ROLES[i % 6]! }))
  return TeamSessionSchema.parse({
    schemaVersion: 1,
    id: opaqueId(),
    name:
      name
        .trim()
        .split('')
        .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
        .join('')
        .slice(0, 30) || 'Local investigation',
    members,
    rotationIndex: 0,
    currentMission: missionId,
    evidenceBoard: [],
    predictions: [],
    actions: [],
    status: 'active',
    phase: 'collecting',
    roleHistory: members.map((m) => ({ learnerId: m.learnerId, role: m.role, round: 0 })),
    createdAt: new Date().toISOString(),
  })
}
export function addTeamPrediction(team: TeamSession, prediction: Prediction): TeamSession {
  if (team.status !== 'active' || (team.phase && team.phase !== 'collecting'))
    throw new Error('This round is not collecting predictions')
  if (team.predictions.some((p) => p.learnerId === prediction.learnerId))
    throw new Error('This member already predicted this round')
  return TeamSessionSchema.parse({
    ...team,
    predictions: [...team.predictions, prediction],
    predictionHistory: [...team.predictionHistory, { round: team.rotationIndex, prediction }],
    actions: [
      ...team.actions,
      { learnerId: prediction.learnerId, kind: 'predict', recordedAt: prediction.recordedAt },
    ],
  })
}
export function submitTurn(
  team: TeamSession,
  prediction: Prediction,
  contribution: string,
): TeamSession {
  const member = team.members.find((m) => m.learnerId === prediction.learnerId),
    text = contribution.trim()
  if (!member) throw new Error('Unknown local teammate')
  if (!text || text.length > 500)
    throw new Error('Record a contribution of 1–500 characters before handoff')
  if (
    team.contributions.some(
      (c) => c.round === team.rotationIndex && c.learnerId === member.learnerId,
    )
  )
    throw new Error('A handed-off contribution cannot be edited')
  const next = addTeamPrediction(team, prediction),
    recordedAt = new Date().toISOString()
  return TeamSessionSchema.parse({
    ...next,
    contributions: [
      ...next.contributions,
      {
        learnerId: member.learnerId,
        role: member.role,
        round: team.rotationIndex,
        text,
        recordedAt,
      },
    ],
    actions: [
      ...next.actions,
      { learnerId: member.learnerId, kind: 'observe', recordedAt },
      { learnerId: member.learnerId, kind: 'handoff', recordedAt },
    ],
  })
}
export function contributionsReady(team: TeamSession) {
  return team.members.every(
    (m) =>
      team.predictions.some((p) => p.learnerId === m.learnerId) &&
      team.contributions.some((c) => c.learnerId === m.learnerId && c.round === team.rotationIndex),
  )
}
export function startHuddle(team: TeamSession): TeamSession {
  if (team.status !== 'active' || !contributionsReady(team))
    throw new Error('Every teammate must hand off a prediction and role contribution')
  return TeamSessionSchema.parse({ ...team, phase: 'huddle' })
}
export function chooseHypothesis(team: TeamSession, hypothesis: string): TeamSession {
  if (team.status !== 'active' || team.phase !== 'huddle' || !contributionsReady(team))
    throw new Error('Collect all contributions before the team huddle')
  if (!hypothesis.trim()) throw new Error('Record the group’s hypothesis before running')
  return TeamSessionSchema.parse({
    ...team,
    teamHypothesis: hypothesis.trim(),
    actions: [
      ...team.actions,
      {
        learnerId: team.members[0]!.learnerId,
        kind: 'huddle',
        recordedAt: new Date().toISOString(),
      },
    ],
  })
}
export function pauseTeam(team: TeamSession): TeamSession {
  if (!['active', 'completed'].includes(team.status))
    throw new Error('Only an active or completed round can pause')
  return TeamSessionSchema.parse({
    ...team,
    status: 'paused',
    actions: [
      ...team.actions,
      {
        learnerId: team.members[0]!.learnerId,
        kind: 'pause',
        recordedAt: new Date().toISOString(),
      },
    ],
  })
}
export function resumeTeam(team: TeamSession): TeamSession {
  if (team.status !== 'paused') throw new Error('Only a paused session can resume')
  return TeamSessionSchema.parse({
    ...team,
    status: team.phase === 'result' && team.results.at(-1)?.goalPassed ? 'completed' : 'active',
    actions: [
      ...team.actions,
      {
        learnerId: team.members[0]!.learnerId,
        kind: 'resume',
        recordedAt: new Date().toISOString(),
      },
    ],
  })
}
