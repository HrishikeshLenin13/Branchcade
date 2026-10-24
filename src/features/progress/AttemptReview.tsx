import { useMemo, useState } from 'react'
import type { Attempt } from '../../domain/types'
import { executeRecorded } from '../../interpreter/interpreter'
import { actualAction, branchFacts } from '../../interpreter/trace'
import { initialRobot } from '../../engine/robot'
import { Stage } from '../../components/illustration/Stage'
import { TraceView } from '../inspector/TraceView'
import { PROBES } from '../../learning/probes'
import { answerLabel, buildProbe } from '../../learning/probe-templates'
import type { QuestionKind } from '../../learning/mental-models'
export function AttemptReview({ attempt }: { attempt: Attempt }) {
  const result = useMemo(
      () => executeRecorded(attempt.world, attempt.program, attempt.engineVersion),
      [attempt],
    ),
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
      <Stage
        world={attempt.world}
        robot={robot}
        events={result.events}
        cursor={cursor}
        engineVersion={attempt.engineVersion ?? 1}
      />
      <TraceView
        events={result.events}
        cursor={cursor}
        onCursor={setCursor}
        engineVersion={attempt.engineVersion ?? 1}
        world={attempt.world}
        program={attempt.program}
        robot={robot}
        runId={attempt.id}
        traceHash={attempt.traceHash}
      />
      <h3>Diagnostic timeline</h3>
      <ol>
        <li>Prediction locked: {new Date(attempt.prediction.recordedAt).toLocaleString()}</li>
        <li>Execution recorded: {new Date(attempt.completedAt).toLocaleString()}</li>
        {attempt.diagnosticResponses.map((r, i) => {
          const generated = buildProbe(r.probeId)
          const probe = generated ?? PROBES.find((p) => p.id === r.probeId)
          return (
            <li key={i}>
              {generated?.prompt ?? (probe && 'rationale' in probe ? probe.rationale : r.probeId)} ·
              answer: {probe?.choices.find((c) => c.id === r.choiceId)?.label ?? r.choiceId}
              {generated
                ? ` · real result: ${answerLabel(generated.question, generated.truth, generated.labels)}`
                : ''}{' '}
              · {new Date(r.recordedAt).toLocaleString()}
            </li>
          )
        })}
        {(attempt.experimentResponses ?? []).map((r, i) => (
          <li key={`x${i}`}>
            Experiment ({r.field.replaceAll('-', ' ')} → {r.value}): predicted{' '}
            {answerLabel(r.question as QuestionKind, r.predicted)}, actual{' '}
            {answerLabel(r.question as QuestionKind, r.actual)} ·{' '}
            {new Date(r.recordedAt).toLocaleString()}
          </li>
        ))}
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
