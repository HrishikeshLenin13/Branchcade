import type { ExecutionEvent } from '../../domain/types'
import { Button } from '../../components/ui/button'
export function TraceView({
  events,
  cursor,
  onCursor,
}: {
  events: ExecutionEvent[]
  cursor: number
  onCursor: (cursor: number) => void
}) {
  return (
    <section className="trace-panel">
      <div className="panel-header">
        <h2>Execution trace</h2>
        <span className="mono">{events.length} events</span>
      </div>
      <div className="button-row">
        <Button
          variant="outline"
          disabled={cursor === 0}
          title={cursor === 0 ? 'At the initial state' : 'View the previous event'}
          onClick={() => onCursor(cursor - 1)}
        >
          Step back
        </Button>
        <Button
          variant="outline"
          disabled={cursor === events.length}
          title={cursor === events.length ? 'At the last event' : 'View the next event'}
          onClick={() => onCursor(cursor + 1)}
        >
          Step forward
        </Button>
        <span className="mono">
          {cursor} / {events.length}
        </span>
      </div>
      <ol className="trace-list">
        {events.map((e, i) => (
          <li key={e.seq}>
            <button
              className={cursor === i + 1 ? 'trace-event selected' : 'trace-event'}
              aria-pressed={cursor === i + 1}
              onClick={() => onCursor(i + 1)}
            >
              <span className="mono">
                {String(e.seq + 1).padStart(2, '0')} / {e.elapsedMs}ms
              </span>
              <strong>{e.kind}</strong>
              <span>{e.facts.join('. ')}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="muted">
        Select an event to inspect its recorded robot state. Rewinding does not alter the run.
      </p>
    </section>
  )
}
