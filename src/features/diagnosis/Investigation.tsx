import { useMemo, useState } from 'react'
import type { Attempt, Mission } from '../../domain/types'
import { Button } from '../../components/ui/button'
import { Stage } from '../../components/illustration/Stage'
import { initialRobot } from '../../engine/robot'
import { execute } from '../../interpreter/interpreter'
import { runFacts } from '../../interpreter/trace'
import { pseudocode } from '../../interpreter/pseudocode'
import { attemptDiagnosis, nextProbe } from '../../learning/investigation'
import { answerLabel, buildProbe, PROBE_TEMPLATES, quote } from '../../learning/probe-templates'
import { probeObservation, type DiagnosisState } from '../../learning/diagnosis'
import { TAXONOMY } from '../../learning/taxonomy'
import { CONCEPTS } from '../../learning/concepts'

/** E7/G2 "Let's check one more thing." Every question is chosen by the evidence engine
 * from the learner's own committed answers; nothing on this panel is a canned script. */
export function Investigation({
  attempt,
  mission,
  busy,
  voluntary = false,
  onAnswer,
  onHint,
  onSkip,
  onContinue,
  onBack,
}: {
  attempt: Attempt
  mission?: Mission
  busy: boolean
  /** True when the learner opened the investigation themselves after a correct prediction. */
  voluntary?: boolean
  onAnswer: (probeId: string, choiceId: string) => void
  onHint: (id: string) => void
  onSkip: () => void
  onContinue: () => void
  onBack: () => void
}) {
  const [skipped, setSkipped] = useState<string[]>([]),
    [preferLike, setPreferLike] = useState<string | undefined>(),
    [why, setWhy] = useState(false),
    [hint, setHint] = useState(false),
    [practice, setPractice] = useState(false),
    [worked, setWorked] = useState(false),
    [notice, setNotice] = useState('')
  const state = useMemo(() => attemptDiagnosis(attempt, mission), [attempt, mission])
  const choice = useMemo(
    () => nextProbe(attempt, state, skipped, preferLike, voluntary),
    [attempt, state, skipped, preferLike, voluntary],
  )
  const last = attempt.diagnosticResponses.filter((r) => r.probeId.startsWith('g.')).at(-1)
  const lastObservation = last
    ? probeObservation(`${attempt.id}-${last.probeId}`, last.probeId, last.choiceId)
    : null
  const lastProbe = last ? buildProbe(last.probeId) : null
  const resetHelpers = () => {
    setWhy(false)
    setHint(false)
    setPractice(false)
    setWorked(false)
  }
  const probe = choice?.probe
  const practiceProbe = probe
    ? PROBE_TEMPLATES.find((t) => t.id === probe.template)!
        .params.filter((p) => p !== probe.param)
        .map((p) => buildProbe(`g.${probe.template}.${p}`))
        .find(Boolean)
    : null
  return (
    <section className="paper investigation learning-step" aria-labelledby="investigation-heading">
      <span className="section-index">Investigate / evidence, not labels</span>
      <h2 id="investigation-heading">Let’s check one more thing.</h2>
      <p>
        One answer can have more than one explanation. These questions help tell possible mix-ups
        apart. This is not a diagnosis and not a grade.
      </p>
      <p className="fact" data-testid="diagnosis-headline">
        {state.summary === 'no-mix-up-seen' && voluntary
          ? 'Your prediction matched the real robot. These questions are optional: they check parts of the program a first-action prediction can’t show.'
          : state.headline}
      </p>
      {lastObservation && lastProbe && (
        <p className="fact" data-testid="probe-feedback">
          You chose{' '}
          {quote(answerLabel(lastProbe.question, lastObservation.learnerAnswer, lastProbe.labels))}.
          The real simulator says{' '}
          {quote(answerLabel(lastProbe.question, lastProbe.truth, lastProbe.labels))}.{' '}
          {runFacts(execute(lastProbe.world, lastProbe.program).events)}.
        </p>
      )}
      {probe ? (
        <>
          <fieldset disabled={busy} data-testid="probe-question" data-probe-id={probe.id}>
            <legend>{probe.prompt}</legend>
            <details className="probe-scenario">
              <summary>Inspect the isolated world and program</summary>
              <Stage controls={false} world={probe.world} robot={initialRobot(probe.world)} />
              <pre className="code-preview">{pseudocode(probe.program)}</pre>
            </details>
            <div className="button-row">
              {probe.choices.map((c) => (
                <Button
                  variant="outline"
                  key={c.id}
                  onClick={() => {
                    resetHelpers()
                    setSkipped([])
                    setPreferLike(undefined)
                    setNotice('')
                    onAnswer(probe.id, c.id)
                  }}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="button-row">
            <Button variant="outline" aria-expanded={why} onClick={() => setWhy((v) => !v)}>
              Why are you asking?
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setHint(true)
                onHint(`probe-hint-${probe.template}`)
              }}
            >
              Show me a hint
            </Button>
            <Button
              variant="outline"
              aria-expanded={practice}
              onClick={() => setPractice((v) => !v)}
            >
              Try it in the lab
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetHelpers()
                setPreferLike(probe.id)
                setSkipped((s) => [...s, probe.id])
                setNotice(
                  'Here is a different example that tests the same ideas. Your earlier answers stay saved.',
                )
              }}
            >
              Try a different example
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setWorked(true)
                onHint('worked-explanation')
              }}
            >
              I still don’t get it
            </Button>
          </div>
          {notice && <p className="muted">{notice}</p>}
          {why && (
            <div className="probe-why" data-testid="probe-why">
              <p>
                {choice!.whyParts.lead} This question gives different answers for different ideas:
              </p>
              <ul>
                {choice!.whyParts.ideas.map((i) => (
                  <li key={i.expect}>
                    If the mix-up were <strong>{i.ideas.join(' or ')}</strong>, you would expect{' '}
                    {i.expect}.
                  </li>
                ))}
                <li>Someone who understands it would expect {choice!.whyParts.truth}.</li>
              </ul>
              <p className="muted">Whatever you pick, it’s evidence, not a grade.</p>
            </div>
          )}
          {hint && <p className="fact">{probe.hint}</p>}
          {practice && practiceProbe && (
            <IsolatedPractice
              key={practiceProbe.id}
              world={practiceProbe.world}
              program={practiceProbe.program}
              prompt={practiceProbe.prompt}
            />
          )}
          {worked && <WorkedExplanation state={state} />}
        </>
      ) : (
        <EvidenceSummary state={state} />
      )}
      <div className="button-row">
        <Button variant="outline" onClick={onBack}>
          Back to mission
        </Button>
        {probe ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              onSkip()
              onContinue()
            }}
          >
            Continue to experiment
          </Button>
        ) : (
          <Button disabled={busy} onClick={onContinue}>
            Generate a targeted experiment
          </Button>
        )}
      </div>
    </section>
  )
}

/** E7 evidence summary: labels only (“Might be”, “Need more examples”, “No longer supported”);
 * the heuristic score lives in a clearly-marked technical details panel. */
export function EvidenceSummary({ state }: { state: DiagnosisState }) {
  const shown = state.ranked.filter((h) => h.supports.length || h.contradictions.length)
  return (
    <div className="hypotheses" data-testid="evidence-summary">
      {!shown.length && <p>No answers have pointed to a specific mix-up.</p>}
      {shown.map((h) => (
        <div key={h.code} data-testid={`hypothesis-${h.code}`}>
          <h3>{h.entry.title}</h3>
          <p>
            {h.status === 'evidence_for'
              ? h.entry.learnerText
              : h.status === 'evidence_against'
                ? 'Your answers argue against this idea.'
                : h.conflicting
                  ? 'Still investigating: your answers point both ways here.'
                  : 'More examples would help check this idea.'}
          </p>
          <span className="muted">
            <strong>{h.label}</strong> · {h.supports.length} supporting · {h.contradictions.length}{' '}
            contradicting observations
          </span>
          <details>
            <summary>Which answers?</summary>
            <ul>
              {[...h.supports, ...h.contradictions].map((n) => (
                <li key={`${n.answerId}-${n.direction}`}>
                  {n.direction === 'supports' ? 'Fits: ' : 'Doesn’t fit: '}
                  {n.reason}
                </li>
              ))}
            </ul>
            <p className="muted">
              Technical: heuristic support score {h.supportScore.toFixed(2)} (a rule-based tally,
              not a probability) · {h.independentSupport} independent supporting question types.
            </p>
          </details>
        </div>
      ))}
    </div>
  )
}

function WorkedExplanation({ state }: { state: DiagnosisState }) {
  const ideas = state.active.length ? state.active : state.candidates.slice(0, 2)
  const concept = ideas[0] ? TAXONOMY[ideas[0]].concept : undefined
  const prerequisite = concept
    ? CONCEPTS.find((c) => c.id === concept)?.prerequisites[0]
    : undefined
  return (
    <div className="probe-practice" data-testid="worked-explanation">
      <h3>A worked explanation</h3>
      <ul>
        {ideas.map((code) => (
          <li key={code}>
            {TAXONOMY[code].correctIdea} <span className="muted">{TAXONOMY[code].tryNext}</span>
          </li>
        ))}
      </ul>
      {prerequisite && (
        <p className="muted">
          Simpler idea to revisit first: {CONCEPTS.find((c) => c.id === prerequisite)!.kid}
        </p>
      )}
      <p className="muted">Using this explanation is recorded as help, never as a penalty.</p>
    </div>
  )
}

/** A related but different scenario, run on demand. Practice only: it never adds evidence. */
function IsolatedPractice({
  world,
  program,
  prompt,
}: {
  world: import('../../domain/types').World
  program: import('../../domain/types').Program
  prompt: string
}) {
  const [reveal, setReveal] = useState(false)
  const run = useMemo(() => (reveal ? execute(world, program) : null), [reveal, world, program])
  return (
    <div className="probe-practice">
      <h3>Isolated practice · your mission is unchanged</h3>
      <p>{prompt}</p>
      <Stage controls={false} world={world} robot={initialRobot(world)} />
      <pre className="code-preview">{pseudocode(program)}</pre>
      <Button variant="outline" onClick={() => setReveal(true)}>
        Run isolated example
      </Button>
      {run && (
        <p className="fact">
          {runFacts(run.events)}. This is worked practice and does not add assessment evidence.
        </p>
      )}
    </div>
  )
}
