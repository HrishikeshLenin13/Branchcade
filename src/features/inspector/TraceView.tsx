import { useState } from 'react'
import type { ExecutionEvent, World, Program, RobotState } from '../../domain/types'
import { readSensors } from '../../engine/sensors'
import { pseudocode } from '../../interpreter/pseudocode'
import { LIMITS } from '../../domain/constants'
import { Button } from '../../components/ui/button'
const TABS = ['Live state', 'Timeline', 'Why?', 'Variables', 'Program'] as const
export function TraceView({
  events,
  cursor,
  onCursor,
  world,
  robot,
  program,
  runId,
  error,
}: {
  events: ExecutionEvent[]
  cursor: number
  onCursor: (cursor: number) => void
  world?: World
  robot?: RobotState
  program?: Program
  runId?: string
  error?: string | null
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Timeline'),
    [query, setQuery] = useState(''),
    [kind, setKind] = useState('all'),
    [page, setPage] = useState(0)
  const current = events[cursor - 1],
    branch = events.slice(0, cursor).findLast((event) => event.kind === 'branch'),
    state = robot ?? current?.after,
    sensor = world && state ? readSensors(world, state) : current?.sensor,
    filtered = events.filter(
      (event) =>
        (kind === 'all' || event.kind === kind) &&
        `${event.nodeId} ${event.kind} ${event.facts.join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
    pageSize = 60,
    pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    safePage = Math.min(page, pages - 1)
  const variables = Object.entries(current?.variables ?? {})
  return (
    <section className="trace-panel" aria-label="Execution inspector">
      <div className="panel-header">
        <h2>Execution trace</h2>
        <span className="mono">{events.length} events</span>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="Inspector views">
        {TABS.map((name) => (
          <button
            key={name}
            id={`inspector-${name.replaceAll(' ', '-')}`}
            type="button"
            role="tab"
            aria-selected={tab === name}
            aria-controls="inspector-content"
            tabIndex={tab === name ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              const next =
                TABS[
                  (TABS.indexOf(name) + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) %
                    TABS.length
                ]!
              setTab(next)
              document.getElementById(`inspector-${next.replaceAll(' ', '-')}`)?.focus()
            }}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="button-row trace-steps">
        <Button
          variant="outline"
          disabled={cursor === 0}
          title={cursor === 0 ? 'At the initial state' : 'View the previous recorded event'}
          onClick={() => onCursor(cursor - 1)}
        >
          Step back
        </Button>
        <Button
          variant="outline"
          disabled={cursor === events.length}
          title={cursor === events.length ? 'At the last event' : 'View the next recorded event'}
          onClick={() => onCursor(cursor + 1)}
        >
          Step forward
        </Button>
        <span className="mono">
          {cursor} / {events.length}
        </span>
      </div>
      <div
        id="inspector-content"
        role="tabpanel"
        aria-labelledby={`inspector-${tab.replaceAll(' ', '-')}`}
      >
        {tab === 'Live state' && (
          <dl className="state-list">
            <dt>Position</dt>
            <dd>
              {state
                ? `${state.position.xCm.toFixed(1)}, ${state.position.yCm.toFixed(1)} cm`
                : 'Initial state'}
            </dd>
            <dt>Heading</dt>
            <dd>{state?.headingDeg.toFixed(1) ?? 0}°</dd>
            <dt>Distance</dt>
            <dd>
              {sensor?.distanceCm === null
                ? 'Out of range (null)'
                : `${sensor?.distanceCm.toFixed(1) ?? '—'} cm`}
            </dd>
            <dt>Floor color</dt>
            <dd>{sensor?.surfaceColor ?? '—'}</dd>
            <dt>Branch</dt>
            <dd>
              {branch?.evaluation?.result === true
                ? 'Then'
                : branch?.evaluation?.result === false
                  ? 'Else'
                  : 'None executed'}
            </dd>
            <dt>Clock</dt>
            <dd>
              {state?.simTimeMs ?? 0} ms / tick {state?.tick ?? 0}
            </dd>
            <dt>Status</dt>
            <dd>
              {state?.status ?? 'ready'}
              {state?.collision ? ` · collision ${state.collision}` : ''}
            </dd>
          </dl>
        )}
        {tab === 'Timeline' && (
          <>
            <div className="trace-filters">
              <label>
                Search events
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(0)
                  }}
                />
              </label>
              <label>
                Event type
                <select
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value)
                    setPage(0)
                  }}
                >
                  <option value="all">All events</option>
                  {[...new Set(events.map((event) => event.kind))].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
            <ol className="trace-list" start={safePage * pageSize + 1}>
              {filtered.slice(safePage * pageSize, (safePage + 1) * pageSize).map((event) => (
                <li key={event.seq}>
                  <button
                    aria-label={`Event ${event.seq + 1}: ${event.kind}, ${event.elapsedMs} milliseconds, block ${event.nodeId}. ${event.facts.join('. ')}`}
                    className={cursor === event.seq + 1 ? 'trace-event selected' : 'trace-event'}
                    aria-pressed={cursor === event.seq + 1}
                    onClick={() => onCursor(event.seq + 1)}
                  >
                    <span className="mono">
                      {String(event.seq + 1).padStart(2, '0')} / {event.elapsedMs}ms
                    </span>
                    <strong>
                      {event.kind} · {event.nodeId}
                    </strong>
                    <span>{event.facts.join('. ')}</span>
                  </button>
                </li>
              ))}
            </ol>
            {!filtered.length && (
              <p>No matching events. Clear the filter to see the recorded run.</p>
            )}
            {pages > 1 && (
              <div className="button-row">
                <Button
                  variant="outline"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous events
                </Button>
                <span>
                  {safePage + 1} / {pages}
                </span>
                <Button
                  variant="outline"
                  disabled={safePage + 1 >= pages}
                  onClick={() => setPage(safePage + 1)}
                >
                  More events
                </Button>
              </div>
            )}
            <p className="muted">
              Each row is a preserved event. Movement rows are 50 ms ticks; a turn or wait may span
              several ticks. Select a row to restore its exact snapshot and highlight its program
              node.
            </p>
          </>
        )}
        {tab === 'Why?' && (
          <div className="inspector-copy">
            <h3>{branch ? 'The recorded decision' : 'No decision executed yet'}</h3>
            <p>
              {branch?.facts.join('. ') ??
                'Advance to a branch event to see its operands and selected path.'}
            </p>
            {branch?.evaluation && (
              <p>
                Operands: {branch.evaluation.operands.map(String).join(', ')}. Result:{' '}
                {String(branch.evaluation.result)}.
              </p>
            )}
            <p>
              {current?.cause
                ? `Execution stopped because ${current.cause}.`
                : 'A sensor supplies a value. Only an executed instruction changes the robot.'}
            </p>
          </div>
        )}
        {tab === 'Variables' &&
          (variables.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Last change</th>
                </tr>
              </thead>
              <tbody>
                {variables.map(([name, value]) => {
                  const last = events
                    .slice(0, cursor)
                    .findLast(
                      (event) =>
                        event.kind === 'set' &&
                        event.facts.some((fact) => fact.startsWith(`${name} = `)),
                    )
                  return (
                    <tr key={name}>
                      <th>{name}</th>
                      <td>{String(value)}</td>
                      <td>{last ? `Event ${last.seq + 1}` : 'Initial'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="inspector-copy">
              No variables have been assigned at this position in the trace.
            </p>
          ))}
        {tab === 'Program' && (
          <div className="inspector-copy">
            <p>
              Run ID: <span className="mono">{runId || 'Unsaved preview'}</span>
            </p>
            <p>
              {error ? `Execution issue: ${error}` : 'Bounded interpreter completed.'}{' '}
              {events.length} / {LIMITS.events} events; {events.at(-1)?.tick ?? 0} / {LIMITS.ticks}{' '}
              ticks. Instruction budget {LIMITS.instructions}; call depth limit {LIMITS.stack}.
            </p>
            {program && <pre className="code-preview">{pseudocode(program)}</pre>}
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
