import type { Attempt, Mission } from '../domain/types'

/** Part H completion rule, shared by the workstation, Progress and import validation.
 * Completion is never a flag: each check reads the immutable attempt record.
 * - Every mission: the goals were met (in every success scenario for v2 data) and a
 *   new-numbers transfer was predicted correctly.
 * - Version ≥2: the prediction was committed (not "not sure yet").
 * - Capstone (version ≥2): also a written reason and at least one experiment answer. */
export interface CompletionCheck {
  id: 'goal' | 'transfer' | 'committed' | 'reason' | 'experiment'
  label: string
  met: boolean
}
export function completionChecks(attempt: Attempt, mission: Mission): CompletionCheck[] {
  const v2 = (attempt.missionVersion ?? 1) >= 2
  const checks: CompletionCheck[] = [
    {
      id: 'goal',
      label:
        v2 && mission.successScenarios?.length
          ? 'Mission goals met in every scenario'
          : 'Mission goals met',
      met: attempt.goalOutcome.passed,
    },
    {
      id: 'transfer',
      label: 'A new-numbers challenge predicted correctly',
      met: Boolean(
        attempt.reassessment?.correct || attempt.transferRetries?.some((r) => r.correct),
      ),
    },
  ]
  if (v2)
    checks.push({
      id: 'committed',
      label: 'Prediction committed before the run (not “not sure yet”)',
      met: !attempt.prediction.uncertain,
    })
  if (v2 && mission.capstone)
    checks.push(
      {
        id: 'reason',
        label: 'Your explanation written in the prediction',
        met: (attempt.prediction.reasoning ?? '').trim().length >= 10,
      },
      {
        id: 'experiment',
        label: 'At least one counterexample experiment predicted and run',
        met: (attempt.experimentResponses?.length ?? 0) > 0,
      },
    )
  return checks
}
export const missionComplete = (attempt: Attempt, mission: Mission) =>
  completionChecks(attempt, mission).every((c) => c.met)
