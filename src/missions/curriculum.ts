import type { Mission, Program, World } from '../domain/types'
import { readSensors } from '../engine/sensors'
import { initialRobot } from '../engine/robot'
import { REFERENCE_PROGRAMS } from './catalog'
import { blindLineProgram } from './catalog'
import { MISSION_META } from './catalog'
import { missionConcepts } from '../learning/concepts'
import { buildProbe } from '../learning/probe-templates'
import { transferPool } from '../learning/transfer'
import type { QuestionKind } from '../learning/mental-models'
import { colorLit, compare, distance, floor, lit, move, program, stop } from '../learning/scenarios'

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

const whileFloor = (id: string, op: '==' | '!=', color: 'white' | 'black', step = 1): Program =>
  program(id, [
    {
      nodeId: 'follow',
      kind: 'while',
      condition: compare('floor-check', op, floor('floor-color'), colorLit('floor-value', color)),
      body: [move('step', step)],
    },
    stop(),
  ])

CURRICULUM.m02 = {
  narrative:
    'A black tape line marks the parking spot. The starter program just drives 30 cm and never looks at the floor. Use the floor colour sensor so the robot stops on the line, wherever the line is.',
  targetConcept: 'Using the floor colour sensor in a loop condition to make a programmed stop',
  vocabulary: [
    {
      term: 'floor colour sensor',
      meaning: 'Reads the colour of the small spot of floor under it.',
    },
    { term: 'while loop', meaning: 'Repeats its blocks as long as its condition stays true.' },
    { term: 'footprint', meaning: 'The exact spot the sensor reads, shown under the robot.' },
  ],
  expectedPrediction: { action: 'move', reason: 'The repeat block starts with move 1 cm.' },
  failureExamples: [
    'Driving a fixed 30 cm rolls right over the line and stops on white.',
    'Stopping a few centimetres late still misses the 2-tick window after the sensor reaches black.',
  ],
  teacherNote:
    'Watch for learners who expect the colour sensor to “see” the line ahead. The line only counts once the sensor footprint is on it; the second scenario moves and thins the line so a hard-coded distance cannot pass.',
  probeIds: ['g.color-read.12', 'g.color-ahead.12', 'g.while-start-black.black'],
  hints: [
    'Which sensor can tell the difference between white floor and the black line?',
    'The floor sensor reads white until its footprint reaches the tape, then black. A simpler example: “while floor = white: move 1 cm” keeps going only on white.',
    'Compare this different program: while floor ≠ black → move 1 cm, then stop. How is its condition different from “floor = white”?',
  ],
  hintExample: whileFloor('hint-m02', '!=', 'black'),
  mistakeVariants: [
    {
      id: 'blind',
      label: 'Starter: fixed 30 cm, no sensor',
      program: blindLineProgram(),
      fails: 'Goal 1 (color-stop-within): not met',
      explanation: 'The robot drives over the line and stops on white.',
    },
    {
      id: 'late-stop',
      label: 'Fixed 25 cm then stop',
      program: program('m02-late', [move('drive', 25), stop()]),
      fails: 'Goal 1 (color-stop-within): not met',
      explanation: 'It reaches black at 20 cm but only stops 5 cm (5 ticks) later.',
    },
    {
      id: 'wrong-colour',
      label: 'Loop while floor = black',
      program: whileFloor('m02-wrong', '==', 'black'),
      fails: 'Goal 1 (color-stop-within): not met',
      explanation:
        'The floor starts white, so the loop never runs and the robot never reaches the line.',
    },
  ],
  detail: {
    question: 'distance-travelled',
    prompt: 'How far does the robot drive before it stops?',
  },
}

CURRICULUM.m03 = {
  narrative:
    'Someone wrote this obstacle check in a hurry and the robot does the opposite of what they meant. Predict what it does with the wall 12 cm away, find the deciding comparison in the trace, and repair it so it works for every wall position.',
  targetConcept: 'Comparison direction and the difference between < and <= at equality',
  vocabulary: [
    { term: '<', meaning: '“Is the left number smaller than the right?”' },
    { term: '<=', meaning: '“Smaller than OR equal to?” — true when both are the same.' },
    { term: 'threshold', meaning: 'The number the reading is compared against.' },
  ],
  expectedPrediction: {
    action: 'move',
    reason: 'The starter asks 12 > 20, which is false, so it moves toward the wall.',
  },
  failureExamples: [
    'Using <= works at 12 cm but stops at exactly 20 cm, where the mission wants it to keep going.',
    'Raising the threshold to 25 also breaks the 20 cm case.',
  ],
  teacherNote:
    'The equality scenario (wall exactly 20 cm away) is what separates < from <=. Learners who “fix” the bug by adding = pass the main world but fail that scenario; ask them to evaluate 20 < 20 and 20 <= 20 out loud.',
  probeIds: ['g.compare-numbers.20-lt-20', 'g.equality-sensor.lt', 'g.branch-at.10-lt'],
  hints: [
    'Find the compare event in the timeline. Which two numbers does it compare, and in what order?',
    'It asks 12 > 20, which is false, so the robot moves. A simpler example: 5 > 9 is false and 5 < 9 is true.',
    'Compare this different program: if distance <= 15 → stop, otherwise → move. What would it do at exactly 15 cm?',
  ],
  hintExample: ifDistance('hint-m03', '<=', 15),
  mistakeVariants: [
    {
      id: 'starter',
      label: 'Starter: comparison reversed (>)',
      program: ifDistance('m03-starter', '>', 20),
      fails: 'Goal 1 (branch): not met',
      explanation: '12 > 20 is false, so the close robot drives toward the wall.',
    },
    {
      id: 'inclusive',
      label: 'Repaired with <=',
      program: ifDistance('m03-inclusive', '<=', 20),
      fails: 'Scenario “wall exactly 20 cm away”: not met',
      explanation: '20 <= 20 is true, so it stops at the equality case it should drive past.',
    },
    {
      id: 'threshold-25',
      label: 'Threshold raised to 25',
      program: ifDistance('m03-25', '<', 25),
      fails: 'Scenario “wall exactly 20 cm away”: not met',
      explanation: '20 < 25 is true, so it stops too early at 20 cm.',
    },
  ],
}
