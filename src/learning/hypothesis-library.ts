import type { Hypothesis } from '../domain/types'
export function initialHypotheses(concepts?: readonly string[]): Hypothesis[] {
  if (concepts?.some((c) => c.includes('function')))
    return [
      hypothesis(
        'definition-runs',
        'Definition and invocation',
        'You may expect defining a helper to run its instructions.',
        'function-definition',
      ),
    ]
  if (concepts?.some((c) => c.includes('loop')))
    return [
      hypothesis(
        'loop-pretest',
        'Loop conditions and counts',
        'You may expect another loop action before its condition is checked.',
        'while-pretest',
      ),
    ]
  if (concepts?.includes('color-sensors') && concepts?.includes('distance-sensors'))
    return [
      hypothesis(
        'and-or',
        'Combining two conditions',
        'You may be treating AND as if either condition were enough.',
        'boolean-and',
      ),
    ]
  return [
    {
      schemaVersion: 1,
      code: 'reversed-comparison',
      title: 'Comparison direction',
      learnerText: 'You may be reading “less than” in the opposite direction.',
      evidence: [],
      contradictions: [],
      status: 'unverified',
      supportScore: 0,
      nextProbeId: 'compare-rule',
    },
    {
      schemaVersion: 1,
      code: 'sensor-stops',
      title: 'Sensor versus instruction',
      learnerText: 'You may expect a distance sensor to stop the robot by itself.',
      evidence: [],
      contradictions: [],
      status: 'unverified',
      supportScore: 0,
      nextProbeId: 'sensor-action',
    },
  ]
}

function hypothesis(
  code: string,
  title: string,
  learnerText: string,
  nextProbeId: string,
): Hypothesis {
  return {
    schemaVersion: 1,
    code,
    title,
    learnerText,
    evidence: [],
    contradictions: [],
    status: 'unverified',
    supportScore: 0,
    nextProbeId,
  }
}
