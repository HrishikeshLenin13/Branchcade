import type { Attempt, Mission, TeamSession } from '../domain/types'
import { missionComplete } from '../missions/completion'
import { attemptObservations } from './investigation'
import { conceptEvidence } from './mastery'

/** Descriptive stamps derived on demand, never persisted award flags or run counters.
 * Callers supply only the selected learner's attempts. Removing that evidence removes
 * the stamp; a later contradictory answer can remove Sensor Detective. */
export function soloAchievements(attempts: readonly Attempt[], missions: readonly Mission[]) {
  const investigation = attempts.find((a) =>
    attemptObservations(
      a,
      missions.find((m) => m.id === a.missionId),
    ).some((o) => o.source === 'probe'),
  )
  const sensor = conceptEvidence(attempts, missions).find((c) => c.concept === 'sensor-readings')
  const completed = missions.flatMap((mission) => {
    const proof = attempts.find((a) => a.missionId === mission.id && missionComplete(a, mission))
    return proof ? [{ missionId: mission.id, title: mission.title, attemptId: proof.id }] : []
  })
  return {
    firstTrace: investigation ? { attemptId: investigation.id } : null,
    sensorDetective: sensor?.status === 'evidence_of_understanding' ? sensor.rule : null,
    completed,
  }
}

/** Role variety belongs to the team report, never to a solo learner's concept mastery.
 * A role counts only after its round ran, its prediction was handed off and its own
 * role contribution was saved. Merely rotating or skipping does not earn a stamp. */
export function teamRoleVariety(team: TeamSession) {
  return team.members.map((member) => {
    const roles = [
      ...new Set(
        team.roleHistory
          .filter(
            (h) =>
              h.learnerId === member.learnerId &&
              team.results.some((r) => r.round === h.round) &&
              team.predictionHistory.some(
                (p) => p.round === h.round && p.prediction.learnerId === member.learnerId,
              ) &&
              team.contributions.some(
                (c) =>
                  c.round === h.round &&
                  c.learnerId === member.learnerId &&
                  c.role === h.role &&
                  c.text.trim().length > 0,
              ),
          )
          .map((h) => h.role),
      ),
    ]
    return { learnerId: member.learnerId, alias: member.alias, roles, earned: roles.length >= 2 }
  })
}
