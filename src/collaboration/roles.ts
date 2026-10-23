export const ROLES = [
  'driver',
  'predictor',
  'sensor-reader',
  'trace-reader',
  'experimenter',
  'explainer',
] as const
export const ROLE_TASKS: Record<(typeof ROLES)[number], string> = {
  driver: 'Run the shared program after everyone predicts.',
  predictor: 'Choose the action before the result appears.',
  'sensor-reader': 'Read the distance and units aloud.',
  'trace-reader': 'Explain which branch ran and why.',
  experimenter: 'Change one parameter and compare the result.',
  explainer: 'Summarize the evidence without labeling a teammate.',
}
