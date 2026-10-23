import { ProbeSchema } from '../domain/schemas'
import { makeWorld } from '../engine/world'
import { thresholdProgram } from '../missions/catalog'
export const PROBES = [
  ProbeSchema.parse({
    schemaVersion: 1,
    id: 'compare-rule',
    targetHypotheses: ['reversed-comparison'],
    scenario: { world: makeWorld(), program: thresholdProgram() },
    choices: [
      { id: 'true', label: 'True: 24 is less than 20' },
      { id: 'false', label: 'False: 24 is greater than 20' },
    ],
    correctChoice: 'false',
    rationale: 'The measured reading is 24 cm. 24 < 20 is false, so only the else branch runs.',
    discrimination: [{ hypothesisId: 'reversed-comparison', choiceId: 'true' }],
  }),
  ProbeSchema.parse({
    schemaVersion: 1,
    id: 'sensor-action',
    targetHypotheses: ['sensor-stops'],
    scenario: {
      world: makeWorld(12),
      program: { schemaVersion: 1, id: 'passive-sensor', body: [] },
    },
    choices: [
      { id: 'automatic', label: 'Yes, the sensor stops it automatically' },
      { id: 'program', label: 'No, a program instruction must stop it' },
    ],
    correctChoice: 'program',
    rationale:
      'A sensor measures. It does not issue a movement or stop instruction. Only the program does.',
    discrimination: [{ hypothesisId: 'sensor-stops', choiceId: 'automatic' }],
  }),
]
export const PROBE_QUESTIONS: Record<string, string> = {
  'compare-rule': 'Before thinking about movement: is 24 < 20 true?',
  'sensor-action':
    'A robot is already moving. Does a sensor alone stop it, without a stop instruction?',
}
