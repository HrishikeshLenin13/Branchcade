import type { Mission, Program, World } from '../domain/types'
import { readSensors } from '../engine/sensors'
import { initialRobot } from '../engine/robot'
import { REFERENCE_PROGRAMS } from './catalog'
import { MISSION_META } from './catalog'
import { missionConcepts } from '../learning/concepts'
import { buildProbe } from '../learning/probe-templates'
import { transferPool } from '../learning/transfer'
import type { QuestionKind } from '../learning/mental-models'
import { compare, distance, lit, move, program, stop } from '../learning/scenarios'

/** Part H authored teaching material for each mission. Programs and worlds here are
 * ordinary validated data; every claim about them is checked by tests/h-curriculum. */
export interface MistakeVariant {
  id: string
  label: string
  program: Program
  /** Text that must appear in a goal fact that is NOT met (proves it fails as intended). */
  fails: string
  explanation: string
}
export interface MissionCurriculum {
  /** Narrative of at most three sentences. */
  narrative: string
  targetConcept: string
  vocabulary: { term: string; meaning: string }[]
  expectedPrediction: { action: 'move' | 'stop' | 'turn' | 'wait'; reason: string }
  failureExamples: string[]
  teacherNote: string
  /** Executable g.* probe ids used for this mission's investigation bank. */
  probeIds: string[]
  /** Hint ladder: 1 = where to look, 2 = the data plus a simpler example, 3 = a related
   * but different program (hintExample). None of them edits the learner's program. */
  hints: [string, string, string]
  hintExample: Program
  mistakeVariants: MistakeVariant[]
  /** Optional mission-specific second prediction, read with the G observables. */
  detail?: { question: QuestionKind; prompt: string }
}
export const CURRICULUM: Partial<Record<string, MissionCurriculum>> = {}
export const curriculumFor = (id: string) => CURRICULUM[id]

/** Live starting readings in plain words, computed from the world (never typed in). */
export function situation(world: World) {
  const s = readSensors(world, initialRobot(world))
  return {
    distance: s.distanceCm,
    color: s.surfaceColor,
    text: `${s.distanceCm === null ? 'The distance sensor sees nothing within range' : `The distance sensor reads ${s.distanceCm.toFixed(1)} cm`} and the floor sensor reads ${s.surfaceColor}.`,
  }
}

/** The spec's mission authoring export (Part H "Mission authoring verification"). */
export function missionAuthoring(mission: Mission) {
  const c = curriculumFor(mission.id)
  return {
    starterWorld: mission.world,
    starterAST: mission.starterProgram,
    referenceSolutionAST: REFERENCE_PROGRAMS[mission.id]!,
    objective: MISSION_META[mission.id]!.objective,
    concepts: missionConcepts(mission),
    mistakeVariants: c?.mistakeVariants ?? [],
    probeBank: (c?.probeIds ?? []).map((id) => buildProbe(id)),
    transferVariants: transferPool(mission),
  }
}

const ifDistance = (id: string, op: '<' | '>' | '<=', threshold: number): Program =>
  program(id, [
    {
      nodeId: 'decision',
      kind: 'if',
      condition: compare('condition', op, distance('sensor'), lit('threshold', threshold)),
      then: [stop('stop-close')],
      else: [move('move-clear', 10), stop('stop-done')],
    },
  ])

CURRICULUM.m01 = {
  narrative:
    'Your robot is rolling toward a wall. Its program checks the distance sensor once and must decide: stop now, or drive a little closer and then stop. Predict the decision before you press Run.',
  targetConcept: 'Reading a distance sensor and choosing one branch of an if/else',
  vocabulary: [
    { term: 'distance sensor', meaning: 'Measures how many centimeters away the wall is.' },
    { term: 'condition', meaning: 'A true-or-false question, like “distance < 20”.' },
    { term: 'branch', meaning: 'One of the two paths an if/else can take.' },
  ],
  expectedPrediction: {
    action: 'move',
    reason: '24 < 20 is false, so the “otherwise” branch runs and the robot moves 10 cm first.',
  },
  failureExamples: [
    'Changing the number to 30 makes the robot stop at 24 cm, too early for this mission.',
    'Removing the check and driving 30 cm hits the wall: a bump is not a programmed stop.',
  ],
  teacherNote:
    'Many beginners answer STOP because the wall “looks close”. The investigation separates reading the comparison backwards from expecting the sensor itself to stop the robot. Ask the learner to read the condition aloud with the real number in it.',
  probeIds: [
    'g.branch-at.10-lt',
    'g.which-branch.40',
    'g.move-only.24',
    'g.compare-numbers.30-lt-20',
  ],
  hints: [
    'Before anything moves, what number does the distance sensor show?',
    'Put that number into the condition: is 24 < 20 true or false? A smaller example: 10 < 20 is true, 30 < 20 is false.',
    'Here is a different program to compare: if distance < 30 → stop, otherwise → move. With the same 24 cm reading, which branch would that one pick?',
  ],
  hintExample: ifDistance('hint-m01', '<', 30),
  mistakeVariants: [
    {
      id: 'threshold-30',
      label: 'Threshold changed to 30',
      program: ifDistance('m01-threshold-30', '<', 30),
      fails: 'Goal 1 (branch): not met',
      explanation: '24 < 30 is true, so the robot stops at once instead of driving closer.',
    },
    {
      id: 'reversed',
      label: 'Comparison reversed to >',
      program: ifDistance('m01-reversed', '>', 20),
      fails: 'Goal 1 (branch): not met',
      explanation: '24 > 20 is true, so the “if” branch stops the robot immediately.',
    },
    {
      id: 'no-check',
      label: 'No sensor check, just drive',
      program: program('m01-no-check', [move('drive', 30), stop('stop-late')]),
      fails: 'Goal 3 (programmed-stop): not met',
      explanation: 'The robot bumps the wall before the stop block runs. A bump is not a stop.',
    },
  ],
}
