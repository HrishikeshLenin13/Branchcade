import type { Attempt, Mission } from '../domain/types'
import { executeRecorded } from '../interpreter/interpreter'
import { actualAction } from '../interpreter/trace'

/** Chart data for the Progress page, derived only from saved attempts. A prediction "matched"
 * when the learner committed an action and re-executing the saved world and program produces
 * that same first action. "Not sure" answers are their own group, never counted as wrong. */
export type PredictionOutcome = 'matched' | 'different' | 'unsure'

export function predictionOutcome(a: Attempt): PredictionOutcome {
  if (a.prediction.uncertain) return 'unsure'
  const actual = actualAction(executeRecorded(a.world, a.program, a.engineVersion).events)
  return a.prediction.action === actual ? 'matched' : 'different'
}

export interface MissionPredictionRow {
  missionId: string
  label: string
  title: string
  matched: number
  different: number
  unsure: number
}

export interface TimelinePoint {
  /** 1-based position in the order the attempts were completed. */
  attempt: number
  missionId: string
  outcome: PredictionOutcome
  /** Running totals up to and including this attempt. */
  attempts: number
  matched: number
}

export interface ProgressChartData {
  byMission: MissionPredictionRow[]
  timeline: TimelinePoint[]
  totals: { attempts: number; matched: number; different: number; unsure: number }
  transfers: { correct: number; total: number }
}

export function progressChartData(
  attempts: readonly Attempt[],
  missions: readonly Mission[],
): ProgressChartData {
  const sorted = [...attempts].sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const rows = new Map<string, MissionPredictionRow>()
  const timeline: TimelinePoint[] = []
  const totals = { attempts: 0, matched: 0, different: 0, unsure: 0 }
  const transfers = { correct: 0, total: 0 }
  for (const a of sorted) {
    const outcome = predictionOutcome(a)
    const mission = missions.find((m) => m.id === a.missionId)
    const row = rows.get(a.missionId) ?? {
      missionId: a.missionId,
      label: mission ? a.missionId.toUpperCase() : 'Lab',
      title: mission?.title ?? 'Free lab',
      matched: 0,
      different: 0,
      unsure: 0,
    }
    row[outcome]++
    rows.set(a.missionId, row)
    totals.attempts++
    totals[outcome]++
    timeline.push({
      attempt: totals.attempts,
      missionId: a.missionId,
      outcome,
      attempts: totals.attempts,
      matched: totals.matched,
    })
    for (const t of [...(a.reassessment ? [a.reassessment] : []), ...(a.transferRetries ?? [])]) {
      transfers.total++
      if (t.correct) transfers.correct++
    }
  }
  // Missions in catalog order, then the free lab last.
  const order = (id: string) => {
    const i = missions.findIndex((m) => m.id === id)
    return i < 0 ? missions.length : i
  }
  const byMission = [...rows.values()].sort((a, b) => order(a.missionId) - order(b.missionId))
  return { byMission, timeline, totals, transfers }
}
