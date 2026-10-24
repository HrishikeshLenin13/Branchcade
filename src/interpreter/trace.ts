import type { ExecutionEvent, Prediction } from '../domain/types'
/** First actual actuator instruction, never inferred from a final robot position. */
export function actualAction(events: readonly ExecutionEvent[]): Prediction['action'] {
  const event = events.find(
    (e) => e.kind === 'move' || e.kind === 'stop' || e.kind === 'turn' || e.kind === 'wait',
  )
  return event?.kind === 'move'
    ? 'move'
    : event?.kind === 'turn'
      ? 'turn'
      : event?.kind === 'wait'
        ? 'wait'
        : 'stop'
}
export function branchFacts(events: readonly ExecutionEvent[]): string {
  return events.find((e) => e.kind === 'branch')?.facts.join('. ') ?? 'No branch was executed'
}
/** Branch facts when a decision ran; otherwise the recorded reason the run ended. */
export function runFacts(events: readonly ExecutionEvent[]): string {
  if (events.some((e) => e.kind === 'branch')) return branchFacts(events)
  const end = events.findLast((e) => e.kind === 'program_stop')
  const reason = end?.facts[0]?.replace('PROGRAM_STOP: ', '') ?? 'no stop recorded'
  return `No if/else decision ran. The run ended by ${reason === 'completion' ? 'finishing its blocks' : reason === 'explicit stop' ? 'a stop block' : reason}`
}
