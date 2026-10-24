import type { Mission, Program, World } from '../domain/types'
import { readSensors } from '../engine/sensors'
import { initialRobot } from '../engine/robot'
import { REFERENCE_PROGRAMS } from './catalog'
import {
  approachProgram,
  blindLineProgram,
  compositeProgram,
  helperProgram,
  lapProgram,
} from './catalog'
import { MISSION_META } from './catalog'
import { missionConcepts } from '../learning/concepts'
import { buildProbe } from '../learning/probe-templates'
import { transferPool } from '../learning/transfer'
import type { QuestionKind } from '../learning/mental-models'
import {
  colorLit,
  compare,
  distance,
  floor,
  lit,
  move,
  program,
  stop,
  turn,
} from '../learning/scenarios'

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

CURRICULUM.m04 = {
  narrative:
    'The robot should trace three sides of a square and park at the last corner. The starter repeats one time too many and ends up back where it began. Count the loop iterations in the trace and fix the count.',
  targetConcept: 'How many times a repeat loop runs its blocks',
  vocabulary: [
    { term: 'repeat loop', meaning: 'Runs the blocks inside it an exact number of times.' },
    { term: 'iteration', meaning: 'One trip through the blocks inside a loop.' },
    { term: 'heading', meaning: 'The direction the robot faces, in degrees.' },
  ],
  expectedPrediction: { action: 'move', reason: 'The first block inside the loop is move 10 cm.' },
  failureExamples: [
    'Repeat 4 draws a whole square and returns to the start.',
    'Copying move-turn three times without a loop reaches the corner but skips the loop concept.',
  ],
  teacherNote:
    'Off-by-one counting is common: learners often count corners or sides differently. The waypoint goal makes “three sides” concrete, and the loop-iteration goal makes the loop itself required rather than hand-copied moves.',
  probeIds: ['g.repeat-turns.3', 'g.repeat-distance.2'],
  hints: [
    'In the timeline, find the REPEAT_ITERATION rows. How many are there?',
    'Each iteration drives one side and turns once. Four iterations make four sides, a full square. Two iterations would make an L shape.',
    'Compare this different program: repeat 2 → move 10 cm, turn 90°. Where would it end, and how many turns would it make?',
  ],
  hintExample: lapProgram(2),
  mistakeVariants: [
    {
      id: 'extra-lap',
      label: 'Starter: repeat 4',
      program: lapProgram(4),
      fails: 'Goal 1 (reach): not met',
      explanation: 'The fourth side brings the robot back to the start.',
    },
    {
      id: 'short-lap',
      label: 'Repeat 2',
      program: lapProgram(2),
      fails: 'Goal 1 (reach): not met',
      explanation: 'Two sides end at the second corner.',
    },
    {
      id: 'unrolled',
      label: 'Hand-copied moves, no loop',
      program: program('m04-unrolled', [
        move('s1', 10),
        turn('c1', 90),
        move('s2', 10),
        turn('c2', 90),
        move('s3', 10),
        turn('c3', 90),
        stop(),
      ]),
      fails: 'Concept check: the robot got there',
      explanation: 'It reaches the corner, but this mission practises the repeat loop.',
    },
  ],
  detail: { question: 'turn-count', prompt: 'How many times will the robot turn in total?' },
}

const whileDistance = (id: string, threshold: number, step: number): Program =>
  program(id, [
    {
      nodeId: 'approach',
      kind: 'while',
      condition: compare('room', '>', distance('reading'), lit('limit', threshold)),
      body: [move('step', step)],
    },
    stop(),
  ])

CURRICULUM.m05 = {
  narrative:
    'The robot should creep toward the wall in small steps and park 10–14 cm away. The starter loop never even starts. Fix the condition so the loop keeps going while there is room and ends by itself.',
  targetConcept: 'While loops that re-read a sensor each time they check their condition',
  vocabulary: [
    {
      term: 'while loop',
      meaning: 'Checks its condition first, then repeats while it stays true.',
    },
    {
      term: 'terminate',
      meaning: 'For a loop: stop repeating because the condition became false.',
    },
    { term: 'safe stopping distance', meaning: 'How close to the wall the robot may finish.' },
  ],
  expectedPrediction: {
    action: 'stop',
    reason: '44 < 12 is false at the very first check, so the loop body never runs.',
  },
  failureExamples: [
    'Using < instead of > ends the loop before it starts.',
    'Driving a fixed 40 cm ignores the sensor and ends far too close.',
    'Looping while distance > 2 parks almost touching the wall.',
  ],
  teacherNote:
    'Two ideas matter here: a while loop checks before running, and the distance is read again after every step. If a learner expects the loop to “never end”, ask what the reading is after each 2 cm move.',
  probeIds: ['g.while-start-false.10', 'g.approach-loop.40', 'g.reading-change.40'],
  hints: [
    'Look at the very first branch row in the timeline. Is the loop condition true or false?',
    'The loop runs only while its condition is true. 44 < 12 is false, so nothing inside runs. A simpler example: “while 5 > 3” would run.',
    'Compare this different program: while distance > 30 → move 5 cm, then stop. Where would it finish?',
  ],
  hintExample: whileDistance('hint-m05', 30, 5),
  mistakeVariants: [
    {
      id: 'starter',
      label: 'Starter: while distance < 12',
      program: approachProgram('<'),
      fails: 'Goal 2 (final-distance): not met',
      explanation: 'The loop never starts, so the robot stops 44 cm away.',
    },
    {
      id: 'blind',
      label: 'Fixed 20 × 2 cm, no sensor',
      program: program('m05-blind', [
        { nodeId: 'blind', kind: 'repeat', count: lit('n', 20), body: [move('step', 2)] },
        stop(),
      ]),
      fails: 'Goal 2 (final-distance): not met',
      explanation: 'It always drives 40 cm and ends 4 cm from the wall.',
    },
    {
      id: 'too-close',
      label: 'while distance > 2',
      program: whileDistance('m05-close', 2, 2),
      fails: 'Goal 2 (final-distance): not met',
      explanation: 'It keeps creeping until only 2 cm are left.',
    },
  ],
  detail: { question: 'move-count', prompt: 'How many times will the move block run?' },
}

CURRICULUM.m06 = {
  narrative:
    'A helper called goCorner already knows the route around the corner, but the robot never uses it. Find out why defining a helper is not the same as running it, then make the robot reach the corner.',
  targetConcept: 'Defining a function versus calling it',
  vocabulary: [
    { term: 'function (helper)', meaning: 'A named group of blocks you can reuse.' },
    { term: 'define', meaning: 'Save the helper’s blocks under a name. Nothing moves yet.' },
    { term: 'call', meaning: 'Run the helper’s blocks now, then come back.' },
  ],
  expectedPrediction: {
    action: 'stop',
    reason: 'The definition only saves goCorner; the next block that runs is stop.',
  },
  failureExamples: [
    'Leaving only the definition: the robot stays at the start.',
    'Copying the helper’s moves by hand reaches the corner but skips the function idea.',
    'Calling the helper twice drives past the corner.',
  ],
  teacherNote:
    'Look for FUNCTION_DEFINED versus FUNCTION_CALL rows in the timeline. A learner who expects the definition to run should predict a turn first; the second question (how many turns?) makes that visible.',
  probeIds: ['g.helper-defined.90', 'g.helper-called.1', 'g.helper-skip.90'],
  hints: [
    'In the timeline, is there a FUNCTION_CALL row, or only FUNCTION_DEFINED?',
    'A definition is a recipe card; a call is cooking it. Here goCorner is defined but never called, so the robot only runs stop.',
    'Compare this different program: define wiggle (turn 45°, turn −45°), then call wiggle, then stop. Which rows would you see?',
  ],
  hintExample: program('hint-m06', [
    {
      nodeId: 'define-wiggle',
      kind: 'function',
      name: 'wiggle',
      body: [turn('wiggle-right', 45), turn('wiggle-left', -45)],
    },
    { nodeId: 'call-wiggle', kind: 'call', name: 'wiggle' },
    stop(),
  ]),
  mistakeVariants: [
    {
      id: 'definition-only',
      label: 'Starter: defined, never called',
      program: helperProgram(false),
      fails: 'Goal 1 (event): not met',
      explanation: 'Without a call block the helper never runs.',
    },
    {
      id: 'by-hand',
      label: 'Route copied by hand, no call',
      program: program('m06-by-hand', [
        move('hand-forward', 10),
        turn('hand-turn', 90),
        move('hand-north', 10),
        stop(),
      ]),
      fails: 'Concept check: the robot got there',
      explanation: 'It reaches the corner, but this mission practises calling the helper.',
    },
    {
      id: 'double-call',
      label: 'Helper called twice',
      program: {
        ...helperProgram(true),
        id: 'm06-double',
        body: [
          helperProgram(true).body[0]!,
          { nodeId: 'call-1', kind: 'call', name: 'goCorner' },
          { nodeId: 'call-2', kind: 'call', name: 'goCorner' },
          stop(),
        ],
      },
      fails: 'Goal 2 (reach): not met',
      explanation: 'The second call drives the route again and misses the corner.',
    },
  ],
  detail: { question: 'turn-count', prompt: 'How many times will the robot turn?' },
}

const ifFloorBlack = (id: string): Program =>
  program(id, [
    {
      nodeId: 'decision',
      kind: 'if',
      condition: compare(
        'is-black',
        '==',
        floor('floor-reading'),
        colorLit('black-value', 'black'),
      ),
      then: [stop('stop-close')],
      else: [move('move-clear', 10), stop('stop-done')],
    },
  ])

CURRICULUM.m07 = {
  narrative:
    'The robot should stop only at its charging dock: a black floor tile right in front of a wall. A close wall on white floor is not the dock, and neither is black floor far from a wall. Choose between AND and OR so the decision is right every time.',
  targetConcept: 'Combining two sensor checks with AND versus OR',
  vocabulary: [
    { term: 'AND', meaning: 'True only when both checks are true.' },
    { term: 'OR', meaning: 'True when at least one check is true.' },
    { term: 'short-circuit', meaning: 'AND stops checking as soon as one part is false.' },
  ],
  expectedPrediction: {
    action: 'stop',
    reason: 'With OR, “distance < 20” alone is true at 12 cm, so the robot stops.',
  },
  failureExamples: [
    'OR stops at any close wall, even on white floor.',
    'Checking only the colour stops on black floor even when the wall is far away.',
  ],
  teacherNote:
    'Four combinations (near/far × white/black) make the truth table physical. The success scenarios include two of them, and the extra transfer worlds are chosen so AND and OR really disagree.',
  probeIds: ['g.branch-at.10-lt', 'g.null-guard.empty', 'g.color-ahead.12'],
  hints: [
    'There are two checks in the condition. What is each one, true or false, right now?',
    'Here the wall check is true (12 < 20) and the floor check is false (white). OR needs one true part; AND needs both. A simpler example: “true AND false” is false.',
    'Compare this different program: if floor = black → stop, otherwise → move. Which of the four floor/wall situations would it get wrong?',
  ],
  hintExample: ifFloorBlack('hint-m07'),
  mistakeVariants: [
    {
      id: 'or',
      label: 'Starter: OR',
      program: compositeProgram('or'),
      fails: 'Goal 1 (branch): not met',
      explanation: 'The close wall alone makes OR true, so it stops on white floor.',
    },
    {
      id: 'distance-only',
      label: 'Only the distance check',
      program: ifDistance('m07-distance-only', '<', 20),
      fails: 'Goal 1 (branch): not met',
      explanation: 'Any close wall stops it, whatever the floor colour.',
    },
    {
      id: 'colour-only',
      label: 'Only the floor check',
      program: ifFloorBlack('m07-colour-only'),
      fails: 'Scenario “far wall on black floor”: not met',
      explanation: 'Black floor alone stops it, even with the wall far away.',
    },
  ],
}
