import type { Hypothesis } from '../domain/types'
export function nextHypothesis(hypotheses: Hypothesis[]): string {
  return (
    [...hypotheses].sort(
      (a, b) => b.supportScore - a.supportScore || a.code.localeCompare(b.code, 'en'),
    )[0]?.code ?? 'reversed-comparison'
  )
}
