import { useState } from 'react'
import type { Attempt, ExperimentResponse, Mission } from '../../domain/types'
import { Button } from '../../components/ui/button'
import { Stage } from '../../components/illustration/Stage'
import { initialRobot } from '../../engine/robot'
import { readSensors } from '../../engine/sensors'
import { execute } from '../../interpreter/interpreter'
import { runFacts } from '../../interpreter/trace'
import { pseudocode } from '../../interpreter/pseudocode'
import { experimentPlan } from '../../learning/investigation'
import type { DiagnosisState } from '../../learning/diagnosis'
import { predict, relevantHypotheses } from '../../learning/diagnosis'
import {
  applyEdit,
  describeEdit,
  explainCandidate,
  type CxField,
} from '../../learning/counterexamples'
import { answerLabel, quote } from '../../learning/probe-templates'
import { observe, runModel } from '../../learning/mental-models'
import { NO_MISCONCEPTION, TAXONOMY } from '../../learning/taxonomy'

/** Numeric bounds for the single changed parameter (E8). Values outside a legal world are
 * rejected by applyEdit and explained instead of silently clamped. */
const RANGES: Partial<Record<CxField, { min: number; max: number; unit: string; label: string }>> =
  {
    'obstacle-distance': { min: 5, max: 70, unit: 'cm', label: 'Wall distance' },
    threshold: { min: 0, max: 100, unit: 'cm', label: 'Comparison number' },
    'loop-count': { min: 1, max: 6, unit: 'times', label: 'Repeat count' },
    'variable-value': { min: 0, max: 100, unit: '', label: 'Variable value' },
  }
const OPTIONS: Partial<Record<CxField, string[]>> = {
  comparator: ['<', '<=', '>', '>='],
  'floor-color': ['white', 'black', 'red'],
  'function-call': ['with-call', 'definition-only'],
}
const listJoin = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
const OPTION_LABEL: Record<string, string> = {
  'with-call': 'Helper defined AND called',
  'definition-only': 'Helper only defined (no call)',
}

/** E8/G4 counterexample experiment. The candidate list comes from the real search; every
 * slider value is re-executed by the authoritative interpreter before it is shown. */
export function Experiment({
  attempt,
  mission,
  state,
  free,
  onRecord,
  onBack,
  onTransfer,
}: {
  attempt: Attempt
  mission?: Mission
  state: DiagnosisState
  free: boolean
  onRecord: (response: ExperimentResponse) => void
  onBack: () => void
  onTransfer: () => void
}) {
  // The experiment list is fixed when this step opens. Saving an answer updates the attempt and
  // its diagnosis; recomputing the plan then swapped in a different experiment while the locked
  // prediction and its "matches / differs" verdict still described the one the learner ran.
  const [plan] = useState(() => experimentPlan(attempt, state))
  const [index, setIndex] = useState(0)
  const candidate = plan?.search.ranked[index]
  const [value, setValue] = useState<string | undefined>()
  const [view, setView] = useState<'baseline' | 'changed'>('changed')
  const [locked, setLocked] = useState<string | null>(null)
  const [choice, setChoice] = useState<string>('')
  const [revealed, setRevealed] = useState(false)
  const [explain, setExplain] = useState(false)
  const [notice, setNotice] = useState('')
  void mission
  if (!plan) return null
  const current = value ?? candidate?.value
  const scenario =
    candidate && current !== undefined
      ? applyEdit(plan.base.world, plan.base.program, {
          field: candidate.field,
          target: candidate.target,
          value: current,
        })
      : null
  const models = [...relevantHypotheses(plan.base.world, plan.base.program), ...plan.targets]
  const runKey = `${plan.base.key}|cx|${candidate?.field}.${candidate?.target}.${current}`
  const prediction =
    candidate && scenario
      ? predict(runKey, scenario.world, scenario.program, candidate.question, [...new Set(models)])
      : null
  const answers = prediction
    ? [
        ...new Set([
          prediction.truth,
          ...Object.values(prediction.predictions),
          ...(candidate!.question === 'first-action' ? ['move', 'stop'] : []),
        ]),
      ].filter((a) => a !== 'error')
    : []
  answers.sort()
  const baselineRun = execute(plan.base.world, plan.base.program)
  const changedRun = scenario ? execute(scenario.world, scenario.program) : null
  const baselineAnswer = candidate
    ? observe(
        candidate.question,
        runModel(plan.base.key, plan.base.world, plan.base.program, NO_MISCONCEPTION),
      )
    : ''
  const shownWorld = view === 'baseline' || !scenario ? plan.base.world : scenario.world
  const shownProgram = view === 'baseline' || !scenario ? plan.base.program : scenario.program
  const resetPrediction = () => {
    setLocked(null)
    setRevealed(false)
    setExplain(false)
  }
  const range = candidate ? RANGES[candidate.field] : undefined
  const options = candidate ? OPTIONS[candidate.field] : undefined
  const reading = readSensors(shownWorld, initialRobot(shownWorld)).distanceCm
  const recordedCount = attempt.experimentResponses?.length ?? 0
  return (
    <section className="paper learning-step" aria-labelledby="experiment-heading">
      <span className="section-index">Experiment / change one thing</span>
      <h2 id="experiment-heading">Same robot. One change.</h2>
      {!candidate ? (
        <>
          <p data-testid="experiment-none">{plan.search.noCandidateReason}</p>
          <p>
            {plan.targets.length
              ? plan.targets.map((t) => TAXONOMY[t].correctIdea).join(' ')
              : 'Your answers did not point to a specific mix-up, so there is nothing to target. Try a fresh challenge instead.'}
          </p>
          <div className="button-row">
            <Button variant="outline" onClick={onBack}>
              Return to mission
            </Button>
            {!free && <Button onClick={onTransfer}>Test my understanding with new numbers</Button>}
          </div>
        </>
      ) : (
        <>
          <p data-testid="experiment-rationale">{explainCandidate(candidate, plan.targets)}</p>
          <p className="muted">
            {plan.targets.length === 1
              ? `Targeted practice: ${TAXONOMY[plan.targets[0]!].title.toLowerCase()}.`
              : plan.targets.length
                ? `Still possible: ${listJoin(plan.targets.map((t) => TAXONOMY[t].title.toLowerCase()))}. This experiment can help tell them apart.`
                : 'No specific mix-up is supported, so this is a general experiment that really changes what the robot does.'}{' '}
            The search examined {plan.search.examined} single changes, rejected{' '}
            {plan.search.rejected.length}, and checked every result with the real simulator.
            {plan.base.probeId
              ? ' It uses a small practice scenario because your mission could not separate these ideas with one change.'
              : ''}
          </p>
          <div className="experiment-columns">
            <div>
              <h3>Your earlier idea</h3>
              <p>
                Baseline: {runFacts(baselineRun.events)}. Result:{' '}
                {quote(answerLabel(candidate.question, baselineAnswer))}.
              </p>
              <div className="button-row">
                <Button
                  variant="outline"
                  aria-pressed={view === 'baseline'}
                  onClick={() => setView('baseline')}
                >
                  Baseline scenario
                </Button>
                <Button
                  variant="outline"
                  aria-pressed={view === 'changed'}
                  onClick={() => setView('changed')}
                >
                  Changed scenario
                </Button>
              </div>
              <Stage world={shownWorld} robot={initialRobot(shownWorld)} />
              <p className="muted">
                Showing the {view} scenario
                {reading !== null ? ` · starting distance ${reading.toFixed(1)} cm` : ''}. The
                camera is identical in both views.
              </p>
            </div>
            <div>
              <h3>Let’s try changing just one thing</h3>
              <p>Change: {describeEdit({ ...candidate, value: current ?? candidate.value })}.</p>
              {range ? (
                <>
                  <label>
                    {range.label}:{' '}
                    <strong>
                      {current} {range.unit}
                    </strong>
                    <input
                      type="range"
                      min={range.min}
                      max={range.max}
                      value={Number(current)}
                      aria-label={`Experiment ${range.label.toLowerCase()}`}
                      onChange={(e) => {
                        setValue(e.target.value)
                        resetPrediction()
                      }}
                    />
                  </label>
                  <label>
                    {range.label} value
                    <input
                      type="number"
                      min={range.min}
                      max={range.max}
                      value={Number(current)}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isFinite(v) && v >= range.min && v <= range.max) {
                          setValue(String(v))
                          resetPrediction()
                        }
                      }}
                    />
                  </label>
                </>
              ) : (
                options && (
                  <label>
                    Changed value
                    <select
                      value={current}
                      onChange={(e) => {
                        setValue(e.target.value)
                        resetPrediction()
                      }}
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {OPTION_LABEL[o] ?? o}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              )}
              {!scenario && (
                <p className="goal-pending" role="alert">
                  That value doesn’t make a legal world (for example the wall would overlap the
                  robot). Pick another value.
                </p>
              )}
              <pre className="code-preview">{pseudocode(shownProgram)}</pre>
              <fieldset disabled={!prediction || locked !== null}>
                <legend>Predict changed outcome</legend>
                <div className="prediction-options">
                  {answers.map((a) => (
                    <label className="choice" key={a}>
                      <input
                        type="radio"
                        name="experiment-prediction"
                        checked={(locked ?? choice) === a}
                        onChange={() => setChoice(a)}
                      />
                      {answerLabel(candidate.question, a)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="button-row">
                <Button
                  disabled={!prediction || locked !== null || !answers.includes(choice)}
                  onClick={() => setLocked(choice)}
                >
                  Lock experiment prediction
                </Button>
                <Button
                  disabled={locked === null || revealed || !prediction}
                  onClick={() => {
                    setRevealed(true)
                    if (recordedCount >= 20) {
                      setNotice(
                        'Experiment answers are capped at 20 per attempt; this one is shown but not saved.',
                      )
                      return
                    }
                    onRecord({
                      ...(plan.base.probeId ? { baseProbeId: plan.base.probeId } : {}),
                      field: candidate.field,
                      target: candidate.target,
                      value: current!,
                      question: candidate.question,
                      predicted: locked!,
                      actual: prediction!.truth,
                      recordedAt: new Date().toISOString(),
                    })
                  }}
                >
                  Run experiment
                </Button>
              </div>
              {revealed && changedRun && prediction ? (
                <p className="fact" data-testid="experiment-facts">
                  {runFacts(changedRun.events)}. Result:{' '}
                  {quote(answerLabel(candidate.question, prediction.truth))}. Your prediction{' '}
                  {locked === prediction.truth ? 'matches' : 'differs from'} this executed result.
                </p>
              ) : (
                <p className="muted" data-testid="experiment-facts">
                  Prediction comes before the result. Lock your prediction, then run the experiment.
                </p>
              )}
            </div>
          </div>
          {notice && <p className="muted">{notice}</p>}
          <div className="button-row">
            <Button
              variant="outline"
              onClick={() => {
                setValue(undefined)
                resetPrediction()
              }}
            >
              Reset experiment
            </Button>
            <Button
              variant="outline"
              disabled={!revealed}
              aria-expanded={explain}
              onClick={() => setExplain((v) => !v)}
            >
              Explain comparison
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (index + 1 < plan.search.ranked.length) {
                  setIndex(index + 1)
                  setValue(undefined)
                  resetPrediction()
                  setNotice(
                    'Loaded the next validated experiment from the search. Predict it before running.',
                  )
                } else
                  setNotice(
                    `No other validated experiment: the search examined ${plan.search.examined} single changes and rejected ${plan.search.rejected.length} (${[...new Set(plan.search.rejected.map((r) => r.reason))].slice(0, 2).join('; ') || 'none'}).`,
                  )
              }}
            >
              Try another counterexample
            </Button>
            <Button variant="outline" onClick={onBack}>
              Return to mission
            </Button>
            {!free && <Button onClick={onTransfer}>Test my understanding with new numbers</Button>}
          </div>
          {explain && changedRun && (
            <p className="fact" data-testid="experiment-explanation">
              Baseline: {runFacts(baselineRun.events)}. Changed: {runFacts(changedRun.events)}. Only
              one thing changed ({describeEdit({ ...candidate, value: current! })}).{' '}
              {prediction && prediction.truth !== baselineAnswer
                ? 'The result changed, so that one change is what made the difference.'
                : 'The result stayed the same, so this value does not cross the deciding line. Try another value.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
