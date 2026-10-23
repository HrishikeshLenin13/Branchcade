import { useMemo, useState } from 'react'
import type { Attempt } from '../../domain/types'
import { execute } from '../../interpreter/interpreter'
import { actualAction, branchFacts } from '../../interpreter/trace'
import { initialRobot } from '../../engine/robot'
import { Stage } from '../../components/illustration/Stage'
import { TraceView } from '../inspector/TraceView'
import { PROBES } from '../../learning/probes'
export function AttemptReview({ attempt }: { attempt: Attempt }) {
  const result = useMemo(() => execute(attempt.world, attempt.program), [attempt]),
    [cursor, setCursor] = useState(0)
  const robot = result.events[cursor - 1]?.after ?? initialRobot(attempt.world)
  return (
    <section className="paper attempt-review" aria-label={`Attempt ${attempt.attemptIndex} replay`}>
      <h2>Attempt {attempt.attemptIndex}: actual trace</h2>
      <p className="muted">
        Read-only replay of the saved world and program. Stepping through the trace never changes
        this attempt.
      </p>
      <p>
        Prediction:{' '}
        <strong>
          {attempt.prediction.uncertain ? 'Not sure yet (unanswered)' : attempt.prediction.action}
        </strong>{' '}
        · actual first action: <strong>{actualAction(result.events)}</strong> · confidence{' '}
        {attempt.prediction.confidence}/5.
      </p>
      <p>{attempt.prediction.reasoning || 'No prediction reasoning recorded.'}</p>
      <p className="fact">{branchFacts(result.events)}</p>
      <p>{attempt.goalOutcome.facts.join('. ')}</p>
      <Stage world={attempt.world} robot={robot} events={result.events} cursor={cursor} />
      <TraceView events={result.events} cursor={cursor} onCursor={setCursor} />
      <h3>Diagnostic timeline</h3>
      <ol>
        <li>Prediction locked: {new Date(attempt.prediction.recordedAt).toLocaleString()}</li>
        <li>Execution recorded: {new Date(attempt.completedAt).toLocaleString()}</li>
        {attempt.diagnosticResponses.map((r, i) => {
          const probe = PROBES.find((p) => p.id === r.probeId)
          return (
            <li key={i}>
              {probe?.rationale ?? r.probeId} · answer:{' '}
              {probe?.choices.find((c) => c.id === r.choiceId)?.label ?? r.choiceId} ·{' '}
              {new Date(r.recordedAt).toLocaleString()}
            </li>
          )
        })}
        <li>
          {attempt.reassessment
            ? `Transfer: predicted ${attempt.reassessment.predictedAction}, actual ${attempt.reassessment.actualAction}; ${attempt.reassessment.correct ? 'matched' : 'needs another example'}.`
            : attempt.assessmentSkipped
              ? 'Transfer check skipped by this learner.'
              : 'No transfer check recorded.'}
        </li>
      </ol>
      <p>Hints requested: {attempt.hintIds?.join(', ') || 'None recorded'}</p>
      <details>
        <summary>Reproducibility checksums</summary>
        <p className="record-hash">Trace SHA-256: {attempt.traceHash}</p>
        <p className="record-hash">World SHA-256: {attempt.prediction.worldHash}</p>
        <p className="record-hash">Program SHA-256: {attempt.prediction.programHash}</p>
      </details>
    </section>
  )
}
