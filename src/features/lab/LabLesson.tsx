import { lazy, Suspense, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, RotateCcw, ScanLine, ShieldCheck } from 'lucide-react'
import type {
  Attempt,
  Program,
  Prediction,
  World,
  Hypothesis,
  Counterexample,
  Reassessment,
} from '../../domain/types'
import { LEARNING_CYCLE } from '../../domain/constants'
import { WorldSchema } from '../../domain/schemas'
import { assertBounded, opaqueId, stableHash } from '../../domain/invariants'
import { makeWorld } from '../../engine/world'
import { initialRobot } from '../../engine/robot'
import { replayAt } from '../../engine/replay'
import { readSensors } from '../../engine/sensors'
import { execute, type RunResult } from '../../interpreter/interpreter'
import { pseudocode, expressionText } from '../../interpreter/pseudocode'
import { actualAction, branchFacts } from '../../interpreter/trace'
import { FIRST_MISSION, thresholdProgram } from '../../missions/catalog'
import { judgeGoals } from '../../missions/goals'
import { recordPrediction } from '../../learning/predictions'
import { initialHypotheses } from '../../learning/hypothesis-library'
import { possibleFromWrongAnswer, updateEvidence } from '../../learning/evidence-engine'
import { PROBES, PROBE_QUESTIONS } from '../../learning/probes'
import { generateCounterexample } from '../../learning/counterexamples'
import { nextHypothesis } from '../../learning/adaptive-planner'
import { conceptStatus } from '../../learning/mastery'
import { recommendation } from '../../learning/recommendations'
import { appendAttempt, annotateAttempt } from '../../storage/repositories'
import { downloadFile } from '../../storage/import-export'
import { useSession } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Stage } from '../../components/illustration/Stage'
import { TraceView } from '../inspector/TraceView'
const BlocklyEditor = lazy(() => import('./BlocklyEditor'))
export default function LabLesson({ free = false }: { free?: boolean }) {
  const { slug } = useParams(),
    data = useSession((s) => s.data),
    start = useSession((s) => s.start),
    replace = useSession((s) => s.replace)
  const saved = !free ? data.attempts.filter((a) => a.missionId === 'm01').at(-1) : undefined
  const [world, setWorld] = useState<World>(() => saved?.world ?? makeWorld()),
    [program, setProgram] = useState<Program>(() => saved?.program ?? thresholdProgram())
  const [action, setAction] = useState<Prediction['action']>(saved?.prediction.action ?? 'move'),
    [confidence, setConfidence] = useState(saved?.prediction.confidence ?? 3),
    [reasoning, setReasoning] = useState(saved?.prediction.reasoning ?? '')
  const [prediction, setPrediction] = useState<Prediction | null>(() => saved?.prediction ?? null),
    [result, setResult] = useState<RunResult | null>(() =>
      saved ? execute(saved.world, saved.program) : null,
    )
  const [attemptId, setAttemptId] = useState(saved?.id ?? ''),
    [cursor, setCursor] = useState(() =>
      saved ? execute(saved.world, saved.program).events.length : 0,
    )
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [showEditor, setShowEditor] = useState(false),
    [selectedObject, setSelectedObject] = useState('obstacle')
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(() =>
      initialHypotheses().map((h) => {
        const items =
          data.profile?.evidence.filter(
            (e) => saved && e.answerId.startsWith(saved.id) && e.hypothesisId === h.code,
          ) ?? []
        const evidence = items.filter((e) => e.direction === 'supports'),
          contradictions = items.filter((e) => e.direction === 'contradicts'),
          score = Math.max(
            0,
            Math.min(
              1,
              evidence.reduce((sum, e) => sum + e.weight, 0) -
                contradictions.reduce((sum, e) => sum + e.weight, 0),
            ),
          )
        return {
          ...h,
          evidence,
          contradictions,
          supportScore: score,
          status:
            score >= 0.5
              ? 'evidence_for'
              : contradictions.length
                ? 'evidence_against'
                : saved
                  ? 'possible'
                  : 'unverified',
        }
      }),
    ),
    [responses, setResponses] = useState<Attempt['diagnosticResponses']>(
      saved?.diagnosticResponses ?? [],
    )
  const [showExperiment, setShowExperiment] = useState(false),
    [example, setExample] = useState<Counterexample | null>(null),
    [experimentThreshold, setExperimentThreshold] = useState(20)
  const [transferChoice, setTransferChoice] = useState<'move' | 'stop'>('move'),
    [transfer, setTransfer] = useState<Reassessment | null>(saved?.reassessment ?? null)
  const [showTransfer, setShowTransfer] = useState(Boolean(saved?.reassessment))
  const activeObstacle = world.obstacles.find((o) => o.id === selectedObject) ?? world.obstacles[0]
  const robot = result ? replayAt(world, result.events, cursor) : initialRobot(world),
    sensor = readSensors(world, initialRobot(world))
  const correct = prediction && result ? prediction.action === actualAction(result.events) : false
  const experimentResult = useMemo(
    () => execute(makeWorld(24), thresholdProgram(experimentThreshold)),
    [experimentThreshold],
  )
  if (!free && slug !== 'm01')
    return (
      <main className="page">
        <h1>Investigation not found</h1>
        <p>This release includes M01. Choose Missions in the navigation to return.</p>
      </main>
    )
  const reset = () => {
    setPrediction(null)
    setResult(null)
    setCursor(0)
    setAttemptId('')
    setResponses([])
    setHypotheses(initialHypotheses())
    setExample(null)
    setShowExperiment(false)
    setShowTransfer(false)
    setTransfer(null)
    setError('')
    setNotice('New attempt ready. Your previous result stays saved locally.')
  }
  const changeWorld = (w: World) => {
    setWorld(w)
    reset()
  }
  const moveObstacle = (id: string, xCm: number) => {
    if (!Number.isFinite(xCm)) return
    const next = structuredClone(world),
      o = next.obstacles.find((o) => o.id === id)
    if (!o) return
    const radius = o.kind === 'circle' ? o.radiusCm : 0,
      width = o.kind === 'rectangle' ? o.widthCm : radius
    o.position.xCm = Math.max(radius, Math.min(next.widthCm - width, xCm))
    const checked = WorldSchema.safeParse(next)
    if (checked.success) {
      setError('')
      changeWorld(checked.data)
    } else setError('Placement rejected: keep solid obstacles separated and clear of the robot.')
  }
  const changeThreshold = (n: number) => {
    setProgram(thresholdProgram(n))
    reset()
  }
  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const profile = await start(),
        startedAt = new Date().toISOString(),
        p = await recordPrediction(profile.id, world, program, action, confidence, reasoning)
      const r = execute(world, program)
      if (r.error) {
        setError(r.error)
        return
      }
      const attempt: Attempt = {
        schemaVersion: 1,
        id: opaqueId(),
        learnerId: profile.id,
        missionId: free ? 'lab' : 'm01',
        attemptIndex:
          useSession.getState().data.attempts.filter((a) => a.learnerId === profile.id).length + 1,
        startedAt,
        completedAt: new Date().toISOString(),
        prediction: p,
        world,
        program,
        traceHash: await stableHash(r.events),
        diagnosticResponses: [],
        reassessment: null,
        goalOutcome: free
          ? { passed: false, facts: ['Free exploration is not a scored mission'] }
          : judgeGoals(world, r, FIRST_MISSION.successPredicate),
      }
      const current = useSession.getState().data
      const currentWithMission =
        current.profile && !free
          ? {
              ...current,
              profile: {
                ...current.profile,
                settings: { ...current.profile.settings, lastOpenedMission: 'm01' },
              },
            }
          : current
      await replace(appendAttempt(currentWithMission, attempt))
      setPrediction(p)
      setResult(r)
      setAttemptId(attempt.id)
      setCursor(r.events.length)
      setHypotheses(
        p.action === actualAction(r.events)
          ? initialHypotheses()
          : possibleFromWrongAnswer(initialHypotheses()),
      )
      setNotice(
        `Prediction locked before reveal. Actual result ${useSession.getState().ephemeral ? 'kept in memory for this session' : 'saved on this device'}.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The run did not complete')
    } finally {
      setBusy(false)
    }
  }
  const answerProbe = async (choiceId: string) => {
    const probe = PROBES[responses.length]
    if (!probe || !result) return
    setBusy(true)
    try {
      const response = { probeId: probe.id, choiceId, recordedAt: new Date().toISOString() }
      const next = [...responses, response]
      const traceHash = await stableHash(result.events),
        scenarioHash = await stableHash(probe.scenario)
      const hs = updateEvidence(hypotheses, probe, choiceId, {
        answerId: `${attemptId}-${response.probeId}`,
        traceHash,
        scenarioHash,
      })
      setHypotheses(hs)
      setResponses(next)
      const current = useSession.getState().data
      const updated = annotateAttempt(current, attemptId, {
        diagnosticResponses: next,
        reassessment: null,
      })
      const items = hs.flatMap((h) => [...h.evidence, ...h.contradictions])
      if (updated.profile)
        updated.profile = {
          ...updated.profile,
          evidence: [
            ...updated.profile.evidence.filter(
              (e) =>
                !items.some((i) => i.answerId === e.answerId && i.scenarioHash === e.scenarioHash),
            ),
            ...items,
          ],
        }
      await replace(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Probe was not saved')
    } finally {
      setBusy(false)
    }
  }
  const openExperiment = async () => {
    setBusy(true)
    try {
      setExample(await generateCounterexample(nextHypothesis(hypotheses)))
      setShowExperiment(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Experiment failed')
    } finally {
      setBusy(false)
    }
  }
  const reassess = async () => {
    setBusy(true)
    try {
      const variant = FIRST_MISSION.variants[0]!,
        r = execute(variant.world, variant.program),
        actual = actualAction(r.events)
      if (r.error) throw new Error(r.error)
      if (actual !== 'move' && actual !== 'stop')
        throw new Error('Transfer must use a move/stop program')
      const t: Reassessment = {
        schemaVersion: 1,
        worldHash: await stableHash(variant.world),
        programHash: await stableHash(variant.program),
        predictedAction: transferChoice,
        actualAction: actual,
        correct: transferChoice === actual,
        recordedAt: new Date().toISOString(),
      }
      const current = useSession.getState().data,
        next = annotateAttempt(current, attemptId, {
          diagnosticResponses: responses,
          reassessment: t,
        })
      if (next.profile) {
        const independent = Boolean(correct && t.correct && !showExperiment)
        const prior = next.profile.conceptProgress.find((p) => p.concept === 'conditionals')
        const hashes = [
          ...new Set([
            ...(prior?.distinctScenarioHashes ?? []),
            ...(independent ? [t.worldHash] : []),
          ]),
        ]
        const goal = current.attempts.find((a) => a.id === attemptId)?.goalOutcome.passed
        next.profile = {
          ...next.profile,
          completedMissions:
            goal && t.correct
              ? [...new Set([...next.profile.completedMissions, 'm01'])]
              : next.profile.completedMissions,
          responses: [...next.profile.responses, prediction!],
          conceptProgress: [
            ...next.profile.conceptProgress.filter((p) => p.concept !== 'conditionals'),
            {
              concept: 'conditionals',
              independentSuccesses: hashes.length,
              distinctScenarioHashes: hashes,
              status: hashes.length ? conceptStatus(hashes) : 'practicing',
            },
          ],
        }
      }
      await replace(next)
      setTransfer(t)
      setNotice('Transfer response saved. One correct answer is not proof of mastery.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer was not saved')
    } finally {
      setBusy(false)
    }
  }
  const cycleIndex = transfer
    ? 6
    : showTransfer
      ? 6
      : showExperiment
        ? 5
        : result
          ? correct
            ? 3
            : 4
          : 1
  return (
    <main className="page lab-page">
      <p className="narrow-advisory">
        A laptop gives the block workspace more room. The prediction, sensor and trace controls
        still work below.
      </p>
      <header className="lesson-heading">
        <div>
          <span className="section-index">
            {free ? 'Your open workbench' : 'Investigation 01 / conditionals'}
          </span>
          <h1>{free ? 'The sensor lab' : FIRST_MISSION.title}</h1>
        </div>
        <div className="local-chip">
          <ShieldCheck size={15} />
          {data.profile?.nickname ?? 'No account needed'}
        </div>
      </header>
      <ol className="cycle" aria-label="Learning cycle">
        {LEARNING_CYCLE.map((step, i) => (
          <li key={step} aria-current={i === cycleIndex ? 'step' : undefined}>
            <span>{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <div className="lab-grid">
        <section className="world-panel">
          <div className="panel-header">
            <h2>
              <ScanLine size={18} /> Robot world
            </h2>
            <span className="mono">{result ? `Tick ${robot.tick}` : 'Ready to investigate'}</span>
          </div>
          <Stage world={world} robot={robot} onObstacleMove={free ? moveObstacle : undefined} />
          <div className="readout-row">
            <div>
              <span>Initial distance</span>
              <strong className="mono">
                {sensor.distanceCm?.toFixed(1) ?? '—'} <small>cm</small>
              </strong>
            </div>
            <div>
              <span>Surface</span>
              <strong> {sensor.surfaceColor}</strong>
            </div>
            <div>
              <span>First condition</span>
              <strong className="mono" data-testid="threshold-readout">
                {program.body[0]?.kind === 'if'
                  ? expressionText(program.body[0].condition)
                  : 'custom program'}
              </strong>
            </div>
          </div>
          {free && (
            <div className="parameter-controls">
              <label>
                Obstacle distance (cm)
                <input
                  aria-label="Obstacle distance (cm)"
                  type="range"
                  min="8"
                  max="90"
                  step="1"
                  disabled={!world.obstacles.some((o) => o.id === 'obstacle')}
                  title="This slider controls the original obstacle; imported obstacles can be dragged"
                  value={
                    world.obstacles[0]?.position.xCm ? world.obstacles[0].position.xCm - 46 : 24
                  }
                  onChange={(e) => {
                    const next = structuredClone(world),
                      obstacle = next.obstacles.find((o) => o.id === 'obstacle')
                    if (obstacle) {
                      obstacle.position.xCm = 46 + Number(e.target.value)
                      const checked = WorldSchema.safeParse(next)
                      if (checked.success) changeWorld(checked.data)
                    }
                  }}
                />
              </label>
              <label>
                Threshold (cm)
                <input
                  aria-label="Threshold (cm)"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="20"
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n >= 0 && n <= 100) changeThreshold(n)
                  }}
                />
              </label>
              {world.obstacles.length > 0 && (
                <div className="object-controls">
                  <label>
                    Obstacle to position
                    <select
                      aria-label="Obstacle to position"
                      value={activeObstacle?.id ?? ''}
                      onChange={(e) => setSelectedObject(e.target.value)}
                    >
                      {world.obstacles.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Obstacle x position (cm)
                    <input
                      aria-label="Obstacle x position (cm)"
                      type="number"
                      min="0"
                      max={world.widthCm}
                      value={activeObstacle?.position.xCm ?? 0}
                      onChange={(e) =>
                        activeObstacle && moveObstacle(activeObstacle.id, Number(e.target.value))
                      }
                    />
                  </label>
                </div>
              )}
              <p className="muted">
                Drag the obstacle or use its slider. Sensor readings update immediately; a changed
                program starts a new prediction.
              </p>
              <div className="button-row">
                <Button
                  variant="outline"
                  onClick={() => downloadFile('branchcade-world.json', JSON.stringify(world))}
                >
                  Export world
                </Button>
                <label className="file-button">
                  Import world
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      void (async () => {
                        try {
                          if (file.size > 500_000) throw new Error('World exceeds 500 KB')
                          const x: unknown = JSON.parse(await file.text())
                          assertBounded(x)
                          changeWorld(WorldSchema.parse(x))
                          setNotice('World imported after validation.')
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Invalid world')
                        }
                      })()
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>
            </div>
          )}
          <div className="program-header">
            <h2>Your program</h2>
            {free && (
              <Button variant="outline" onClick={() => setShowEditor((v) => !v)}>
                {showEditor ? 'Close block editor' : 'Open block editor'}
              </Button>
            )}
          </div>
          <pre className="code-preview" aria-label="Inert program preview">
            {pseudocode(program)}
          </pre>
          <p className="muted">The sensor measures. The program chooses what happens.</p>
        </section>
        <aside className="prediction-panel">
          <span className="section-index">
            {prediction ? 'Your prediction is locked' : 'Before you press Run'}
          </span>
          <h2>{prediction ? 'Compare with the evidence' : 'What will the robot do?'}</h2>
          <p>Read the initial sensor value and follow the program. Which action happens first?</p>
          <fieldset disabled={Boolean(prediction) || busy}>
            <legend>Your prediction</legend>
            <div className="prediction-options">
              {(free
                ? (['move', 'stop', 'turn', 'wait'] as const)
                : (['move', 'stop'] as const)
              ).map((a) => (
                <label key={a} className={action === a ? 'choice chosen' : 'choice'}>
                  <input
                    type="radio"
                    name="prediction"
                    value={a}
                    checked={prediction ? prediction.action === a : action === a}
                    onChange={() => setAction(a)}
                  />
                  <strong>
                    {a === 'move'
                      ? 'Move forward'
                      : a === 'turn'
                        ? 'Turn'
                        : a === 'wait'
                          ? 'Wait'
                          : 'Stop in place'}
                  </strong>
                </label>
              ))}
            </div>
            <label>
              How sure are you? <span className="mono">{confidence} / 5</span>
              <input
                aria-label="Prediction confidence"
                type="range"
                min="1"
                max="5"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              />
            </label>
            <label>
              Why do you think that? (optional)
              <textarea
                maxLength={2000}
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Use the reading and the rule. No personal details."
              />
            </label>
          </fieldset>
          {!prediction ? (
            <Button size="lg" className="run-button" disabled={busy} onClick={() => void run()}>
              <Play size={17} />
              {busy ? 'Running bounded program…' : 'Lock prediction & run'}
            </Button>
          ) : (
            <div className="result-block">
              <span className="result-label">Actual result</span>
              <h3>
                {result
                  ? `The robot ${{ move: 'moved', stop: 'stopped', turn: 'turned', wait: 'waited' }[actualAction(result.events)]}.`
                  : ''}
              </h3>
              <p className="fact" data-testid="branch-facts">
                {result && branchFacts(result.events)}
              </p>
              <p>
                {correct
                  ? free
                    ? 'Your prediction matches the first executed instruction.'
                    : 'Your prediction matches the run. You can go straight to a new challenge.'
                  : 'Your prediction differs. Let’s find out which part was surprising.'}
              </p>
              {correct && !free && !showTransfer && (
                <Button onClick={() => setShowTransfer(true)}>Try a different challenge</Button>
              )}
              <Button variant="outline" onClick={reset}>
                <RotateCcw size={16} />
                Start a new attempt
              </Button>
            </div>
          )}
          <p className="privacy-note">
            <ShieldCheck size={14} />
            {useSession.getState().ephemeral
              ? 'In-memory session — export before closing.'
              : 'Saved on this device, not sent to a server.'}
          </p>
        </aside>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="notice" role="status">
        {notice}
      </p>
      {result && <TraceView events={result.events} cursor={cursor} onCursor={setCursor} />}
      {result && !free && !correct && !transfer && (
        <section className="paper investigation">
          <span className="section-index">Investigate / evidence, not labels</span>
          <h2>One answer can have more than one explanation.</h2>
          <p>We’re checking two possible misunderstandings. This is not a diagnosis.</p>
          {responses.length < PROBES.length ? (
            <fieldset disabled={busy}>
              <legend>{PROBE_QUESTIONS[PROBES[responses.length]!.id]}</legend>
              <div className="button-row">
                {PROBES[responses.length]!.choices.map((c) => (
                  <Button variant="outline" key={c.id} onClick={() => void answerProbe(c.id)}>
                    {c.label}
                  </Button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div>
              <div className="hypotheses">
                {hypotheses.map((h) => (
                  <div key={h.code}>
                    <h3>{h.title}</h3>
                    <p>
                      {h.status === 'evidence_for'
                        ? h.learnerText
                        : h.status === 'evidence_against'
                          ? 'This response argues against that explanation.'
                          : 'More evidence would help distinguish this explanation.'}
                    </p>
                    <span className="muted">
                      {h.evidence.length} supporting · {h.contradictions.length} contradicting
                      observations
                    </span>
                  </div>
                ))}
              </div>
              <Button disabled={busy} onClick={() => void openExperiment()}>
                Generate a targeted experiment
              </Button>
            </div>
          )}
          {responses.length > 0 && (
            <p className="fact">{PROBES[responses.length - 1]!.rationale}</p>
          )}
        </section>
      )}
      {!free && showExperiment && example && (
        <section className="paper">
          <span className="section-index">Experiment / change one thing</span>
          <h2>Same reading. Different decision.</h2>
          <p>{example.rationale}</p>
          <p className="muted">
            Targeted practice:{' '}
            {nextHypothesis(hypotheses) === 'sensor-stops'
              ? 'separate measuring from stopping'
              : 'read the comparison in the right direction'}
            . Candidate traces were executed and checksummed, not invented.
          </p>
          {example.noCandidateReason ? (
            <p>{example.noCandidateReason}</p>
          ) : (
            <>
              <label>
                Experiment threshold: <strong>{experimentThreshold} cm</strong>
                <input
                  type="range"
                  min="10"
                  max="45"
                  value={experimentThreshold}
                  aria-label="Experiment threshold"
                  onChange={(e) => setExperimentThreshold(Number(e.target.value))}
                />
              </label>
              <p className="fact" data-testid="experiment-facts">
                {branchFacts(experimentResult.events)}. The robot{' '}
                {actualAction(experimentResult.events) === 'move' ? 'moves' : 'stops'}.
              </p>
              <Button onClick={() => setShowTransfer(true)}>
                Test my understanding with new numbers
              </Button>
            </>
          )}
        </section>
      )}
      {!free && showTransfer && result && (
        <section className="paper">
          <span className="section-index">Reassess / a different scenario</span>
          <h2>Now the reading is 32 cm. The threshold is 35 cm.</h2>
          <pre className="code-preview">if distance &lt; 35: stop{`\n`}else: move 10 cm</pre>
          {!transfer ? (
            <fieldset disabled={busy}>
              <legend>Predict the action before revealing the result</legend>
              <div className="prediction-options">
                {(['move', 'stop'] as const).map((a) => (
                  <label className="choice" key={a}>
                    <input
                      type="radio"
                      name="transfer"
                      checked={transferChoice === a}
                      onChange={() => setTransferChoice(a)}
                    />
                    {a === 'move' ? 'Move forward' : 'Stop in place'}
                  </label>
                ))}
              </div>
              <Button disabled={busy} onClick={() => void reassess()}>
                Lock transfer prediction & reveal
              </Button>
            </fieldset>
          ) : (
            <div>
              <p className="fact">
                {branchFacts(
                  execute(FIRST_MISSION.variants[0]!.world, FIRST_MISSION.variants[0]!.program)
                    .events,
                )}
                . The actual program {transfer.actualAction === 'stop' ? 'stops' : 'moves'}. Your
                prediction {transfer.correct ? 'matches' : 'differs from'} the result.
              </p>
              <p>{recommendation(Boolean(correct), transfer.correct)}</p>
              <Button variant="outline" onClick={reset}>
                Practice again with a new attempt
              </Button>
            </div>
          )}
        </section>
      )}
      {free && showEditor && (
        <Suspense fallback={<p role="status">Loading the local block editor…</p>}>
          <BlocklyEditor
            onProgram={(p) => {
              setProgram(p)
              reset()
              setNotice('Validated block program applied.')
            }}
          />
        </Suspense>
      )}
    </main>
  )
}
