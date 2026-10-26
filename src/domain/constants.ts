export const SCHEMA_VERSION = 1 as const
export const FIXED_STEP_MS = 50
export const LIMITS = {
  importBytes: 500_000,
  storedNodes: 1_000_000, // Whole local envelope; import preflight stays at 20,000 nodes.
  nodes: 2_000,
  depth: 32,
  events: 5_000,
  instructions: 5_000,
  ticks: 20_000,
  stack: 16,
  callDepth: 8,
  stackFrames: 64,
  traceBytes: 4_000_000,
  attempts: 200,
  obstacles: 100,
} as const
export const COPY = {
  name: 'Branchcade',
  tagline: 'Make the logic click.',
  promise:
    'Discover why your code behaves the way it does. Turn predictions, sensor readings, and real execution into hands-on experiments.',
  uncertainty: 'One answer is not a diagnosis. Let’s gather more evidence.',
} as const
export const LEARNING_CYCLE = [
  'Observe',
  'Predict',
  'Execute',
  'Compare',
  'Investigate',
  'Experiment',
  'Reassess',
] as const
export const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow'] as const
/** Learner-facing names for the robot's first action. */
export const ACTION_LABELS = {
  move: 'Move forward',
  stop: 'Stop in place',
  turn: 'Turn',
  wait: 'Wait',
} as const
