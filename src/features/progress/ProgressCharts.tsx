import { useEffect, useMemo, useRef, useState } from 'react'
import type { Attempt } from '../../domain/types'
import { MISSION_CATALOG } from '../../missions/catalog'
import {
  progressChartData,
  type PredictionOutcome,
  type TimelinePoint,
} from '../../learning/progress-charts'
import type { ConceptEvidence } from '../../learning/mastery'
import './progress-charts.css'

const OUTCOMES: { key: PredictionOutcome; label: string }[] = [
  { key: 'matched', label: 'Matched the run' },
  { key: 'different', label: 'Different from the run' },
  { key: 'unsure', label: 'Not sure yet' },
]
const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.key, o.label])) as Record<
  PredictionOutcome,
  string
>

/** Charts for the learning notebook. Every number comes from the saved attempts passed in. */
export function ProgressCharts({
  attempts,
  completed,
  evidence,
}: {
  attempts: readonly Attempt[]
  completed: number
  evidence: readonly ConceptEvidence[]
}) {
  const data = useMemo(() => progressChartData(attempts, MISSION_CATALOG), [attempts])
  const understood = evidence.filter((c) => c.status === 'evidence_of_understanding').length
  const { totals, transfers } = data
  return (
    <section className="paper progress-charts" aria-labelledby="progress-charts-title">
      <h2 id="progress-charts-title">Your progress in pictures</h2>
      <p className="muted">
        Made from the attempts saved on this device. A different prediction is how scientists learn
        — it is not a wrong grade.
      </p>
      <div className="stat-tiles" data-testid="progress-stats">
        <Stat value={completed} of={MISSION_CATALOG.length} label="missions completed" />
        <Stat
          value={totals.matched}
          of={totals.attempts}
          label="predictions matched the real run"
        />
        <Stat value={transfers.correct} of={transfers.total} label="new-numbers challenges right" />
        <Stat value={understood} of={evidence.length} label="concepts with evidence" />
      </div>
      <MissionBars rows={data.byMission} />
      <Timeline points={data.timeline} />
    </section>
  )
}

function Stat({ value, of, label }: { value: number; of: number; label: string }) {
  return (
    <div className="stat-tile">
      <strong>
        {value}
        {of > 0 && <span className="stat-of"> of {of}</span>}
      </strong>
      <span>{label}</span>
    </div>
  )
}

function Legend({ items }: { items: { key: string; label: string }[] }) {
  return (
    <ul className="chart-legend" aria-hidden>
      {items.map((item) => (
        <li key={item.key}>
          <span className={`chart-swatch series-${item.key}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

type Tip = { x: number; y: number; title: string; lines: string[] } | null

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null
  return (
    <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }} aria-hidden>
      <strong>{tip.title}</strong>
      {tip.lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  )
}

function MissionBars({ rows }: { rows: ReturnType<typeof progressChartData>['byMission'] }) {
  const [tip, setTip] = useState<Tip>(null)
  const box = useRef<HTMLDivElement>(null)
  const max = Math.max(1, ...rows.map((r) => r.matched + r.different + r.unsure))
  const place = (event: React.MouseEvent, title: string, lines: string[]) => {
    const rect = box.current!.getBoundingClientRect()
    setTip({ x: event.clientX - rect.left, y: event.clientY - rect.top, title, lines })
  }
  return (
    <figure className="chart" data-testid="chart-by-mission">
      <figcaption>
        <h3>Predictions in each mission</h3>
        <p className="muted">Each bar shows every attempt you saved for that mission.</p>
      </figcaption>
      <Legend items={OUTCOMES} />
      <div className="bar-rows" ref={box} onMouseLeave={() => setTip(null)}>
        {rows.map((row) => {
          const total = row.matched + row.different + row.unsure
          return (
            <div className="bar-row" key={row.missionId}>
              <span className="bar-label" title={row.title}>
                <span className="mono">{row.label}</span> {row.title}
              </span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(total / max) * 100}%` }}>
                  {OUTCOMES.filter((o) => row[o.key] > 0).map((o) => (
                    <span
                      key={o.key}
                      className={`bar-seg series-${o.key}`}
                      style={{ flexGrow: row[o.key] }}
                      onMouseMove={(e) =>
                        place(e, `${row.label} · ${row.title}`, [
                          `${o.label}: ${row[o.key]}`,
                          `All attempts: ${total}`,
                        ])
                      }
                    />
                  ))}
                </span>
                <span className="bar-total">{total}</span>
              </span>
            </div>
          )
        })}
        <Tooltip tip={tip} />
      </div>
      <details className="chart-table">
        <summary>Show these numbers as a table</summary>
        <table>
          <caption className="sr-only">Predictions in each mission</caption>
          <thead>
            <tr>
              <th>Mission</th>
              {OUTCOMES.map((o) => (
                <th key={o.key}>{o.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.missionId}>
                <td>
                  {row.label} · {row.title}
                </td>
                <td>{row.matched}</td>
                <td>{row.different}</td>
                <td>{row.unsure}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Width of an element, kept current as the page resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth || 600)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth || 600))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function Timeline({ points }: { points: TimelinePoint[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  if (points.length < 2)
    return (
      <figure className="chart" data-testid="chart-timeline">
        <figcaption>
          <h3>Matched predictions over time</h3>
        </figcaption>
        <p className="muted">Save one more attempt to see your line grow.</p>
      </figure>
    )
  const height = 220,
    pad = { left: 36, right: 16, top: 14, bottom: 34 }
  const n = points.length,
    yMax = points[n - 1]!.attempts
  const x = (i: number) => pad.left + ((i - 1) / (n - 1)) * (width - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - v / yMax) * (height - pad.top - pad.bottom)
  const path = (key: 'attempts' | 'matched') =>
    points.map((p, i) => `${i ? 'L' : 'M'}${x(p.attempt)},${y(p[key])}`).join('')
  const ticks =
    yMax <= 6
      ? Array.from({ length: yMax + 1 }, (_, i) => i)
      : [...new Set([0, Math.round(yMax / 2), yMax])]
  const xTicks =
    n <= 10 ? points.map((p) => p.attempt) : [...new Set([1, Math.round((n + 1) / 2), n])]
  const active = hover === null ? null : points[hover]
  const pick = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const step = (event.clientX - rect.left) / Math.max(1, rect.width)
    setHover(Math.min(n - 1, Math.max(0, Math.round(step * (n - 1)))))
  }
  const last = points[n - 1]!
  return (
    <figure className="chart" data-testid="chart-timeline">
      <figcaption>
        <h3>Matched predictions over time</h3>
        <p className="muted">
          The gray line counts every attempt. The blue line counts the predictions that matched.
        </p>
      </figcaption>
      <Legend
        items={[
          { key: 'all', label: 'All attempts' },
          { key: 'matched', label: 'Matched the run' },
        ]}
      />
      <div className="timeline" ref={ref}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`After ${last.attempts} attempts, ${last.matched} ${last.matched === 1 ? 'prediction' : 'predictions'} matched the real run.`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="axis" x={pad.left - 8} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} className="axis" x={x(t)} y={height - 14} textAnchor="middle">
              {t}
            </text>
          ))}
          <text className="axis" x={width - pad.right} y={height - 1} textAnchor="end">
            attempt number
          </text>
          {active && (
            <line
              className="crosshair"
              x1={x(active.attempt)}
              x2={x(active.attempt)}
              y1={pad.top}
              y2={height - pad.bottom}
            />
          )}
          <path className="line series-all" d={path('attempts')} />
          <path className="line series-matched" d={path('matched')} />
          {active && (
            <>
              <circle
                className="dot series-all"
                cx={x(active.attempt)}
                cy={y(active.attempts)}
                r={5}
              />
              <circle
                className="dot series-matched"
                cx={x(active.attempt)}
                cy={y(active.matched)}
                r={5}
              />
            </>
          )}
          <rect
            className="hit"
            x={pad.left}
            y={pad.top}
            width={Math.max(0, width - pad.left - pad.right)}
            height={height - pad.top - pad.bottom}
            onMouseMove={pick}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
        {active && (
          <Tooltip
            tip={{
              x: x(active.attempt),
              y: y(active.matched),
              title: `Attempt ${active.attempt} · ${active.missionId === 'lab' ? 'Free lab' : active.missionId.toUpperCase()}`,
              lines: [
                OUTCOME_LABEL[active.outcome],
                `Matched so far: ${active.matched} of ${active.attempts}`,
              ],
            }}
          />
        )}
      </div>
      <details className="chart-table">
        <summary>Show these numbers as a table</summary>
        <table>
          <caption className="sr-only">Matched predictions over time</caption>
          <thead>
            <tr>
              <th>Attempt</th>
              <th>Mission</th>
              <th>Prediction</th>
              <th>Matched so far</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.attempt}>
                <td>{p.attempt}</td>
                <td>{p.missionId === 'lab' ? 'Free lab' : p.missionId.toUpperCase()}</td>
                <td>{OUTCOME_LABEL[p.outcome]}</td>
                <td>
                  {p.matched} of {p.attempts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
