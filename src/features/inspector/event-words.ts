import type { ExecutionEvent } from '../../domain/types'

/** One plain sentence per trace event, for younger learners. The exact recorded facts are
 * still shown underneath; this never replaces or edits them. */
const PLAIN: Record<ExecutionEvent['kind'], string> = {
  sensor_read: 'The robot read its sensor.',
  compare: 'The program compared two values.',
  branch: 'The program made a decision.',
  move: 'The robot moved.',
  turn: 'The robot turned.',
  wait: 'The robot waited.',
  stop: 'The program said stop.',
  set: 'The program changed a variable.',
  call: 'The program used a helper.',
  inspect: 'The program looked at a value.',
  error: 'Something went wrong.',
  repeat_iteration: 'The loop started another round.',
  loop_start: 'A loop started.',
  loop_end: 'The loop finished.',
  function_return: 'The helper finished.',
  function_defined: 'The program learned a helper.',
  collision: 'The robot bumped into something!',
  program_stop: 'The program finished.',
}

export function plainEvent(event: ExecutionEvent): string {
  const fact = event.facts[0] ?? ''
  const read = /^SENSOR_READ: (\w+) = (.+)$/.exec(fact)
  if (event.kind === 'sensor_read' && read) {
    const name = read[1] === 'distance_cm' ? 'distance' : read[1]!.replace(/_/g, ' ')
    return `The robot read its ${name}: ${read[2]}${read[1] === 'distance_cm' ? ' cm' : ''}.`
  }
  const moved = /delta ([\d.]+) cm/.exec(fact)
  if (event.kind === 'move' && moved) return `The robot moved ${moved[1]} cm.`
  const all = event.facts.join(' ')
  if (event.kind === 'branch' && /else branch selected/i.test(all))
    return 'The program made a decision: it chose the “else” part.'
  if (event.kind === 'branch' && /then branch selected/i.test(all))
    return 'The program made a decision: it chose the “if” part.'
  return PLAIN[event.kind]
}

/** Names for the trace's "Event type" filter. */
export const KIND_NAME: Record<ExecutionEvent['kind'], string> = {
  sensor_read: 'Sensor readings',
  compare: 'Comparisons',
  branch: 'Decisions',
  move: 'Moves',
  turn: 'Turns',
  wait: 'Waits',
  stop: 'Stops',
  set: 'Variable changes',
  call: 'Helper calls',
  inspect: 'Value checks',
  error: 'Errors',
  repeat_iteration: 'Loop rounds',
  loop_start: 'Loop starts',
  loop_end: 'Loop ends',
  function_return: 'Helper finishes',
  function_defined: 'Helper definitions',
  collision: 'Bumps',
  program_stop: 'Program end',
}
