export const ROLES = [
  'driver',
  'predictor',
  'sensor-reader',
  'trace-reader',
  'experimenter',
  'explainer',
] as const
export const ROLE_NAMES: Record<(typeof ROLES)[number], string> = {
  driver: 'Programmer',
  predictor: 'Evidence Recorder',
  'sensor-reader': 'Sensor Analyst',
  'trace-reader': 'Debugger',
  experimenter: 'Tester',
  explainer: 'Navigator',
}
export const ROLE_TASKS: Record<(typeof ROLES)[number], string> = {
  driver: 'Read the program. Record a code change you would try and explain why.',
  predictor: 'Record your predicted action and the condition that supports it.',
  'sensor-reader': 'Record the actual sensor reading, its units, and what it measures.',
  'trace-reader':
    'Identify the condition you will inspect in the trace and what would disprove your prediction.',
  experimenter: 'Propose changing one world or program parameter and predict its effect.',
  explainer: 'Explain how the starting position and heading affect the sensor ray.',
}
