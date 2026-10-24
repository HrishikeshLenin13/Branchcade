import type { ConceptId } from './concepts'

/** Part G1 misconception taxonomy. Every entry is a *hypothesis* about a possible mix-up,
 * never a diagnosis. Each one is paired with an executable mental model in
 * mental-models.ts (the real interpreter with exactly one rule changed), at least two
 * probe templates in probe-templates.ts, and a counterexample search family in
 * counterexamples.ts. Student-facing wording is written for roughly ages 9–13. */
export const HYPOTHESIS_CODES = [
  'SENSOR_IS_ACTION',
  'SENSOR_RANGE_REVERSED',
  'COMPARATOR_DIRECTION',
  'STRICT_VS_INCLUSIVE',
  'ELSE_EXECUTES_TOO',
  'ELSE_NEVER',
  'SENSOR_NULL_ZERO',
  'COLOR_LOCATION',
  'LOOP_COUNT',
  'WHILE_PRETEST',
  'FUNCTION_DEFINITION_EXECUTES',
  'FUNCTION_CALL_SKIPPED',
  'VARIABLE_STALE_VALUE',
  'MOVEMENT_VS_SENSOR_REFRESH',
] as const
export type HypothesisCode = (typeof HYPOTHESIS_CODES)[number]
/** The "no mix-up" model: the learner understands and the first answer was a slip. */
export const NO_MISCONCEPTION = 'NO_MISCONCEPTION' as const
export type ModelCode = HypothesisCode | typeof NO_MISCONCEPTION

export type CounterexampleFamily =
  | 'obstacle-distance'
  | 'threshold'
  | 'comparator'
  | 'floor-color'
  | 'loop-count'
  | 'function-call'
  | 'variable-value'

export interface TaxonomyEntry {
  code: HypothesisCode
  concept: ConceptId
  /** Short neutral title used in the evidence summary. */
  title: string
  /** "You might be…" sentence. Always phrased as a possibility. */
  learnerText: string
  /** The correct idea, explained simply. */
  correctIdea: string
  /** What answers we would expect to see if a learner held this idea. */
  responsePatterns: string[]
  /** Probe template ids (probe-templates.ts) designed to test this idea. At least two. */
  probes: string[]
  /** Counterexample search families that can produce an informative change. */
  counterexamples: CounterexampleFamily[]
  /** The learning objective to revisit first if this idea seems likely. */
  prerequisiteObjective: string
  /** G6 sentence that introduces the next experiment. */
  tryNext: string
}

export const TAXONOMY: Record<HypothesisCode, TaxonomyEntry> = {
  SENSOR_IS_ACTION: {
    code: 'SENSOR_IS_ACTION',
    concept: 'sensor-readings',
    title: 'Sensor versus instruction',
    learnerText:
      'You might be expecting the sensor to stop the robot by itself when it sees something close.',
    correctIdea:
      'A sensor only measures. The robot stops only when the program runs a stop instruction (or when it physically bumps into something).',
    responsePatterns: [
      'Predicts STOP whenever a wall is close, even when the program says move',
      'Predicts a robot with only a move block will stop before reaching a nearby wall',
    ],
    probes: ['move-only', 'drive-to-wall', 'branch-at'],
    counterexamples: ['obstacle-distance', 'threshold'],
    prerequisiteObjective: 'Tell the difference between measuring (sensor) and acting (blocks).',
    tryNext: 'Let’s run a program with no stop block near a wall and watch what really stops it.',
  },
  SENSOR_RANGE_REVERSED: {
    code: 'SENSOR_RANGE_REVERSED',
    concept: 'sensor-readings',
    title: 'Which way the reading changes',
    learnerText:
      'You might be thinking the distance number gets bigger as the robot gets closer to a wall.',
    correctIdea:
      'Distance is how far away the wall is. Driving toward the wall makes the number smaller.',
    responsePatterns: [
      'Says the reading grows while driving toward a wall',
      'Expects “keep going while distance > 20” never to end',
    ],
    probes: ['reading-change', 'approach-loop'],
    counterexamples: ['obstacle-distance'],
    prerequisiteObjective: 'Read a distance sensor in centimeters and predict how it changes.',
    tryNext: 'Let’s move the wall closer and farther and watch which way the number goes.',
  },
  COMPARATOR_DIRECTION: {
    code: 'COMPARATOR_DIRECTION',
    concept: 'comparisons',
    title: 'Comparison direction',
    learnerText: 'You might be reading “<” the other way around, as if it were “>”.',
    correctIdea:
      '“a < b” is true only when the left number is smaller. 10 < 20 is true; 24 < 20 is false.',
    responsePatterns: [
      'Chooses the then-branch when the left number is bigger',
      'Says 10 < 20 is false',
    ],
    probes: ['branch-at', 'compare-numbers', 'which-branch'],
    counterexamples: ['threshold', 'obstacle-distance', 'comparator'],
    prerequisiteObjective: 'Evaluate <, <=, > and >= with two numbers.',
    tryNext: 'Let’s try one smaller number and one bigger number with the same comparison.',
  },
  STRICT_VS_INCLUSIVE: {
    code: 'STRICT_VS_INCLUSIVE',
    concept: 'comparisons',
    title: 'Equal numbers',
    learnerText: 'You might be treating “<” as if it also includes “equal to”.',
    correctIdea: '20 < 20 is false because 20 is not smaller than 20. 20 <= 20 is true.',
    responsePatterns: [
      'Says 20 < 20 is true',
      'Picks the then-branch when the reading equals the threshold',
    ],
    probes: ['equality-sensor', 'compare-numbers'],
    counterexamples: ['threshold', 'comparator'],
    prerequisiteObjective: 'Tell < apart from <= when both numbers are equal.',
    tryNext: 'Let’s put the wall exactly at the threshold and compare < with <=.',
  },
  ELSE_EXECUTES_TOO: {
    code: 'ELSE_EXECUTES_TOO',
    concept: 'conditionals',
    title: 'Running both branches',
    learnerText: 'You might be expecting both the “if” part and the “otherwise” part to run.',
    correctIdea: 'An if/else runs exactly one of its two parts, never both.',
    responsePatterns: [
      'Predicts the then-branch action even when the condition is false',
      'Answers “both parts run”',
    ],
    probes: ['which-branch', 'else-path', 'branch-at'],
    counterexamples: ['threshold', 'obstacle-distance'],
    prerequisiteObjective: 'Trace an if/else and name the single branch that runs.',
    tryNext: 'Let’s give each part a different action so we can see which one really runs.',
  },
  ELSE_NEVER: {
    code: 'ELSE_NEVER',
    concept: 'conditionals',
    title: 'Skipping the “otherwise” part',
    learnerText:
      'You might be expecting nothing to happen when the condition is false, skipping the “otherwise” part.',
    correctIdea: 'When the condition is false, the “otherwise” (else) part runs instead.',
    responsePatterns: [
      'Predicts the robot does nothing when the condition is false',
      'Answers “neither part runs”',
    ],
    probes: ['which-branch', 'else-path'],
    counterexamples: ['threshold', 'obstacle-distance'],
    prerequisiteObjective: 'Find the instruction that runs when an if condition is false.',
    tryNext: 'Let’s make the condition false and watch the “otherwise” part.',
  },
  SENSOR_NULL_ZERO: {
    code: 'SENSOR_NULL_ZERO',
    concept: 'sensor-readings',
    title: 'Nothing in range',
    learnerText:
      'You might be thinking “no reading” means 0 cm, as if the wall were touching the robot.',
    correctIdea:
      'When nothing is within range the sensor reports no reading at all. That is the opposite of 0 cm, which would mean touching.',
    responsePatterns: [
      'Says an out-of-range sensor reads 0',
      'Expects “is detected AND distance < 20” to be true in an empty room',
    ],
    probes: ['null-guard', 'null-reading'],
    counterexamples: ['obstacle-distance'],
    prerequisiteObjective: 'Explain what “out of range” means for a distance sensor.',
    tryNext: 'Let’s move the wall out of range and see what the sensor really reports.',
  },
  COLOR_LOCATION: {
    code: 'COLOR_LOCATION',
    concept: 'sensor-readings',
    title: 'Where the color sensor looks',
    learnerText:
      'You might be expecting the color sensor to report a color it can see ahead, instead of the floor right underneath it.',
    correctIdea:
      'The floor color sensor reads the small spot of floor directly under it, not colors farther ahead.',
    responsePatterns: [
      'Says the sensor reads black while the robot is still on white before a black line',
      'Predicts a stop before the robot reaches the line',
    ],
    probes: ['color-read', 'color-ahead'],
    counterexamples: ['floor-color'],
    prerequisiteObjective: 'Find the color sensor’s sample point on the floor.',
    tryNext: 'Let’s put a black line ahead and check what the sensor reads before reaching it.',
  },
  LOOP_COUNT: {
    code: 'LOOP_COUNT',
    concept: 'loops',
    title: 'Counting repeats',
    learnerText: 'You might be counting one extra time through a repeat loop.',
    correctIdea:
      '“Repeat 3” runs its blocks exactly 3 times: once, twice, three times, then stops.',
    responsePatterns: [
      'Predicts 4 turns for “repeat 3: move, turn”',
      'Predicts the robot drives one extra side',
    ],
    probes: ['repeat-turns', 'repeat-distance'],
    counterexamples: ['loop-count'],
    prerequisiteObjective: 'Count loop iterations in a trace.',
    tryNext: 'Let’s change the repeat count by one and count the turns together.',
  },
  WHILE_PRETEST: {
    code: 'WHILE_PRETEST',
    concept: 'loops',
    title: 'When a while loop checks',
    learnerText:
      'You might be expecting a while loop to run its blocks once before it checks the condition.',
    correctIdea:
      'A while loop checks its condition first. If the condition is already false, the blocks inside never run.',
    responsePatterns: [
      'Predicts one move even though the loop condition starts false',
      'Says the loop body runs at least once',
    ],
    probes: ['while-start-false', 'while-start-black'],
    counterexamples: ['obstacle-distance', 'threshold', 'floor-color'],
    prerequisiteObjective: 'Trace when a while loop checks its condition.',
    tryNext: 'Let’s start with the condition already false and watch the loop.',
  },
  FUNCTION_DEFINITION_EXECUTES: {
    code: 'FUNCTION_DEFINITION_EXECUTES',
    concept: 'functions-state',
    title: 'Defining versus calling',
    learnerText: 'You might be expecting a helper to run as soon as it is defined.',
    correctIdea:
      'Defining a helper only saves its instructions. They run when a call block uses the helper’s name.',
    responsePatterns: [
      'Predicts the helper’s turn happens even with no call block',
      'Counts the helper’s actions twice when it is defined and called',
    ],
    probes: ['helper-defined', 'helper-called'],
    counterexamples: ['function-call'],
    prerequisiteObjective: 'Find the call event that makes a helper run.',
    tryNext: 'Let’s remove the call block and see whether the helper still runs.',
  },
  FUNCTION_CALL_SKIPPED: {
    code: 'FUNCTION_CALL_SKIPPED',
    concept: 'functions-state',
    title: 'What a call does',
    learnerText:
      'You might be expecting a call block to do nothing, or to skip over the helper’s instructions.',
    correctIdea:
      'A call jumps into the helper, runs all of its instructions, then comes back to the next block.',
    responsePatterns: [
      'Predicts no turn even though the helper with a turn is called',
      'Predicts the robot stops right after the call',
    ],
    probes: ['helper-called', 'helper-skip'],
    counterexamples: ['function-call'],
    prerequisiteObjective: 'Follow a call into a helper and back out.',
    tryNext: 'Let’s add a call block and count what the helper does.',
  },
  VARIABLE_STALE_VALUE: {
    code: 'VARIABLE_STALE_VALUE',
    concept: 'functions-state',
    title: 'Updated variables',
    learnerText: 'You might be using a variable’s first value even after a later block changed it.',
    correctIdea: 'A variable always holds the most recent value set into it.',
    responsePatterns: [
      'Uses the first value of a variable after it was set again',
      'Predicts the branch for the old value',
    ],
    probes: ['variable-branch', 'variable-value'],
    counterexamples: ['variable-value'],
    prerequisiteObjective: 'Read a variable’s latest value from the Variables tab.',
    tryNext: 'Let’s change the second value and see which number the condition uses.',
  },
  MOVEMENT_VS_SENSOR_REFRESH: {
    code: 'MOVEMENT_VS_SENSOR_REFRESH',
    concept: 'sensor-readings',
    title: 'Fresh sensor readings',
    learnerText: 'You might be expecting the sensor value to stay the same while the robot moves.',
    correctIdea:
      'Each time the program reads the sensor it gets a fresh value from where the robot is now.',
    responsePatterns: [
      'Says the reading stays the same after the robot moves',
      'Expects a while loop that checks distance never to stop',
    ],
    probes: ['reading-change', 'approach-loop'],
    counterexamples: ['obstacle-distance', 'threshold'],
    prerequisiteObjective: 'Compare sensor readings at two moments in the trace.',
    tryNext: 'Let’s step through the loop and compare the reading after every move.',
  },
}
