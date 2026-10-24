/** LEGACY (pre-Part G) fixed probe registry. New investigations use the adaptive,
 * executable probes in probe-templates.ts. These ids remain only so attempts saved before
 * Part G can still be reviewed and re-validated on import exactly as they were recorded. */
import { ProbeSchema } from '../domain/schemas'
import { makeWorld } from '../engine/world'
import { thresholdProgram, findMission, REFERENCE_PROGRAMS } from '../missions/catalog'
import type { Mission, Probe, Program } from '../domain/types'
import { execute } from '../interpreter/interpreter'
import { actualAction } from '../interpreter/trace'
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

/** Each additional prompt has executable ground truth; answers never come from a UI flag. */
const extra = (
  id: string,
  target: string,
  program: Program,
  world = makeWorld(),
  wrong = 'move',
) => {
  const correct = actualAction(execute(world, program).events)
  return ProbeSchema.parse({
    schemaVersion: 1,
    id,
    targetHypotheses: [target],
    scenario: { world, program },
    choices: [
      {
        id: correct,
        label: `The program first ${correct === 'stop' ? 'stops' : correct === 'move' ? 'moves' : correct === 'turn' ? 'turns' : 'waits'}`,
      },
      {
        id: wrong,
        label: `The program first ${wrong === 'move' ? 'moves' : wrong === 'stop' ? 'stops' : wrong}`,
      },
    ],
    correctChoice: correct,
    rationale: `Executing this isolated program gives ${correct} as its first actuator instruction. Read its trace before returning to the mission.`,
    discrimination: [{ hypothesisId: target, choiceId: wrong }],
  })
}
const functionDefinition = extra(
  'function-definition',
  'definition-runs',
  findMission('m06')!.starterProgram,
)
const functionCall = extra(
  'function-call',
  'definition-runs',
  REFERENCE_PROGRAMS.m06!,
  findMission('m06')!.world,
  'stop',
)
const whilePretest = extra('while-pretest', 'loop-pretest', REFERENCE_PROGRAMS.m05!, makeWorld(10))
const repeatReference = REFERENCE_PROGRAMS.m04!
const repeatRun = execute(findMission('m04')!.world, repeatReference)
const repeatProbe = ProbeSchema.parse({
  schemaVersion: 1,
  id: 'repeat-count',
  targetHypotheses: ['loop-pretest'],
  scenario: { world: findMission('m04')!.world, program: repeatReference },
  choices: [
    { id: 'three', label: 'Three turn instructions' },
    { id: 'four', label: 'Four turn instructions' },
  ],
  correctChoice: 'three',
  rationale: `The actual trace contains ${repeatRun.events.filter((e) => e.kind === 'turn').length} turns: one after each of three repeated moves.`,
  discrimination: [{ hypothesisId: 'loop-pretest', choiceId: 'four' }],
})
const booleanAnd = extra(
  'boolean-and',
  'and-or',
  REFERENCE_PROGRAMS.m07!,
  findMission('m07')!.world,
  'stop',
)
const colorPretest = extra('color-pretest', 'loop-pretest', REFERENCE_PROGRAMS.m02!, {
  ...findMission('m02')!.world,
  id: 'already-on-black',
  spawn: { ...findMission('m02')!.world.spawn, position: { xCm: 62, yCm: 50 } },
})
export const EXTRA_PROBES: Probe[] = [
  functionDefinition,
  functionCall,
  whilePretest,
  repeatProbe,
  booleanAnd,
  colorPretest,
]
Object.assign(PROBE_QUESTIONS, {
  'function-definition': 'A helper is defined but never called. What executes first?',
  'function-call': 'This time the helper is called before stop. What executes first?',
  'while-pretest': 'The distance is 10 cm. While distance > 12: move 2 cm. What happens first?',
  'repeat-count': 'Repeat move and turn three times. How many turn instructions execute?',
  'boolean-and':
    'The wall is close, but the floor is white. With AND, does this program move or stop?',
  'color-pretest': 'The robot starts on black. While floor is white: move. What happens first?',
})
export function probesForMission(mission: Mission): Probe[] {
  if (mission.conceptGoals.includes('functions')) return [functionDefinition, functionCall]
  if (mission.id === 'm04') return [repeatProbe, whilePretest]
  if (mission.id === 'm02') return [colorPretest, whilePretest]
  if (mission.conceptGoals.includes('loops')) return [whilePretest, repeatProbe]
  if (mission.id === 'm07') return [booleanAnd]
  return PROBES
}
export function probeQuestion(probe: Probe) {
  return (
    PROBE_QUESTIONS[probe.id] ?? 'Follow this isolated program. Which instruction executes first?'
  )
}
