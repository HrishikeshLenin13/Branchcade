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
