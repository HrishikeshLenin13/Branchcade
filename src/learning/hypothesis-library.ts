import type { Hypothesis } from '../domain/types'
export function initialHypotheses(): Hypothesis[] {
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
