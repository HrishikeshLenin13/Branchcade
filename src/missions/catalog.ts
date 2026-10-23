import type { Program } from '../domain/types'
import { MissionSchema } from '../domain/schemas'
import { makeWorld } from '../engine/world'
export function thresholdProgram(threshold = 20): Program {
  return {
    schemaVersion: 1,
    id: 'threshold-program',
    body: [
      {
        nodeId: 'decision',
        kind: 'if',
        condition: {
          nodeId: 'condition',
          type: 'boolean',
          kind: 'compare',
          op: '<',
          left: { nodeId: 'sensor', type: 'number', kind: 'sensor', sensor: 'distance' },
          right: { nodeId: 'threshold', type: 'number', kind: 'literal', value: threshold },
        },
        then: [{ nodeId: 'stop-close', kind: 'stop' }],
        else: [
          {
            nodeId: 'move-clear',
            kind: 'move',
            distance: { nodeId: 'travel', type: 'number', kind: 'literal', value: 10 },
          },
          { nodeId: 'stop-done', kind: 'stop' },
        ],
      },
    ],
  }
}
export const FIRST_MISSION = MissionSchema.parse({
  schemaVersion: 1,
  id: 'm01',
  version: 1,
  title: 'The 20 cm question',
  conceptGoals: ['conditionals', 'distance-sensors'],
  prerequisiteIds: [],
  world: makeWorld(),
  starterProgram: thresholdProgram(),
  successPredicate: [
    { kind: 'branch', nodeId: 'decision', expected: false },
    { kind: 'distance', minCm: 9.9 },
  ],
  failureExplanation: 'Inspect the reading and the comparison before choosing a branch.',
  variants: [{ id: 'transfer', world: makeWorld(32), program: thresholdProgram(35) }],
  roleEvidenceAssignments: [
    { role: 'predictor', task: 'Predict the selected branch before the run' },
    { role: 'trace-reader', task: 'Read the actual operands from the trace' },
  ],
  targetCompletionSteps: 7,
  recommendedProbeIds: ['compare-rule', 'sensor-action'],
})
export const MISSION_CATALOG = [FIRST_MISSION]
