import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Play, Pause, RotateCcw, ScanLine, ShieldCheck } from 'lucide-react'
import type {
  Attempt,
  Program,
  Prediction,
  World,
  Hypothesis,
  Counterexample,
  Reassessment,
  Mission,
} from '../../domain/types'
import { LEARNING_CYCLE } from '../../domain/constants'
import { WorldSchema } from '../../domain/schemas'
import { immutable, opaqueId, stableHash } from '../../domain/invariants'
import { makeWorld } from '../../engine/world'
import { initialRobot } from '../../engine/robot'
import { replayAt } from '../../engine/replay'
import { readSensors } from '../../engine/sensors'
import { execute, type RunResult } from '../../interpreter/interpreter'
import { pseudocode, expressionText } from '../../interpreter/pseudocode'
import { actualAction, branchFacts } from '../../interpreter/trace'
import {
  FIRST_MISSION,
  findMission,
  MISSION_CATALOG,
  MISSION_META,
  thresholdProgram,
} from '../../missions/catalog'
import { judgeGoals, describeGoal } from '../../missions/goals'
import { recordPrediction } from '../../learning/predictions'
import { initialHypotheses } from '../../learning/hypothesis-library'
import { possibleFromWrongAnswer, updateEvidence } from '../../learning/evidence-engine'
import { probesForMission, probeQuestion } from '../../learning/probes'
import { generateCounterexample } from '../../learning/counterexamples'
import { nextHypothesis } from '../../learning/adaptive-planner'
import { conceptStatus } from '../../learning/mastery'
import { recommendation } from '../../learning/recommendations'
import { appendAttempt, annotateAttempt } from '../../storage/repositories'
import { downloadFile } from '../../storage/import-export'
import { useSession } from '../../app/session'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { Stage } from '../../components/illustration/Stage'
import { TraceView } from '../inspector/TraceView'
import { WorldEditor } from './WorldEditor'
import { useEditHistory } from './history'
import { positionObstacle } from './world-tools'
import './workstation.css'
const BlocklyEditor = lazy(() => import('./BlocklyEditor'))
const ACTION_LABELS = { move: 'Move forward', stop: 'Stop in place', turn: 'Turn', wait: 'Wait' }

export default function LabLesson({ free = false }: { free?: boolean }) {
  const { slug } = useParams(),
    mission = free ? FIRST_MISSION : findMission(slug ?? '')
  if (!mission)
    return (
      <main className="page">
        <h1>Investigation not found</h1>
        <p>Choose a published mission to return to the workbench.</p>
        <Link className="button-link" to="/missions">
          Back to missions
        </Link>
      </main>
    )
  return <Workstation key={free ? 'lab' : mission.id} free={free} mission={mission} />
}
function Workstation({ free, mission }: { free: boolean; mission: Mission }) {
  const data = useSession((state) => state.data),
    start = useSession((state) => state.start),
    replace = useSession((state) => state.replace),
    pendingWrites = useSession((state) => state.pendingWrites),
    ephemeral = useSession((state) => state.ephemeral)
  const missionId = free ? 'lab' : mission.id,
    probes = probesForMission(mission)
  const [fresh] = useState(
    () =>
      new URLSearchParams(window.location.search).has('new') ||
      new URLSearchParams(window.location.search).has('retry') ||
      new URLSearchParams(window.location.search).get('example') === '24',
  )
  const draft = !fresh
    ? data.drafts
        .filter((item) => item.missionId === missionId && item.learnerId === data.profile?.id)
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
        .at(-1)
    : undefined
  const saved =
    !fresh && draft?.stage !== 'predict'
      ? data.attempts
          .filter(
            (item) =>
              (!draft?.attemptId || item.id === draft.attemptId) &&
              item.missionId === missionId &&
              item.learnerId === data.profile?.id &&
              (!draft ||
                (JSON.stringify(draft.world) === JSON.stringify(item.world) &&
                  JSON.stringify(draft.program) === JSON.stringify(item.program))),
          )
          .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
          .at(-1)
      : undefined
  const worldHistory = useEditHistory<World>(draft?.world ?? saved?.world ?? mission.world),
    programHistory = useEditHistory<Program>(
      draft?.program ?? saved?.program ?? mission.starterProgram,
    )
  const world = worldHistory.value,
    program = programHistory.value
  const [action, setAction] = useState<Prediction['action']>(saved?.prediction.action ?? 'move'),
    [confidence, setConfidence] = useState(saved?.prediction.confidence ?? 3),
    [reasoning, setReasoning] = useState(saved?.prediction.reasoning ?? ''),
    [branchChoice, setBranchChoice] = useState<Prediction['branch']>(null),
    [uncertain, setUncertain] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(saved?.prediction ?? null),
    [result, setResult] = useState<RunResult | null>(() =>
      saved ? execute(saved.world, saved.program) : null,
    ),
    [attemptId, setAttemptId] = useState(saved?.id ?? ''),
    [cursor, setCursor] = useState(() =>
      saved
        ? Math.min(
            draft?.cursor ?? execute(saved.world, saved.program).events.length,
            execute(saved.world, saved.program).events.length,
          )
        : 0,
    ),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [showEditor, setShowEditor] = useState(false),
    [showCode, setShowCode] = useState(true),
    [showTrace, setShowTrace] = useState(true),
    [selectedObject, setSelectedObject] = useState('obstacle'),
    [dialog, setDialog] = useState<'briefing' | 'help' | 'shortcuts' | null>(null),
    [hintIds, setHintIds] = useState<string[]>(saved?.hintIds ?? []),
    [hintLevel, setHintLevel] = useState(0),
    [complete, setComplete] = useState(draft?.stage === 'complete')
  const [leftWidth, setLeftWidth] = useState(29),
    [rightWidth, setRightWidth] = useState(25)
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(() =>
    initialHypotheses(mission.conceptGoals).map((hypothesis) => {
      const items =
          data.profile?.evidence.filter(
            (item) =>
              saved && item.answerId.startsWith(saved.id) && item.hypothesisId === hypothesis.code,
          ) ?? [],
        evidence = items.filter((item) => item.direction === 'supports'),
        contradictions = items.filter((item) => item.direction === 'contradicts'),
        score = Math.max(
          0,
          Math.min(
            1,
            evidence.reduce((sum, item) => sum + item.weight, 0) -
              contradictions.reduce((sum, item) => sum + item.weight, 0),
          ),
        )
      return {
        ...hypothesis,
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
  )
  const [responses, setResponses] = useState<Attempt['diagnosticResponses']>(
      saved?.diagnosticResponses ?? [],
    ),
    [showInvestigation, setShowInvestigation] = useState(
      draft?.stage === 'investigate' ||
        Boolean(
          saved &&
          !saved.prediction.uncertain &&
          saved.prediction.action !== actualAction(execute(saved.world, saved.program).events),
        ),
    ),
    [assessmentSkipped, setAssessmentSkipped] = useState(saved?.assessmentSkipped ?? false),
    [probeHint, setProbeHint] = useState(false),
    [probeWhy, setProbeWhy] = useState(false),
    [probePractice, setProbePractice] = useState(false),
    [probeOffset, setProbeOffset] = useState(0)
  const [showExperiment, setShowExperiment] = useState(draft?.stage === 'experiment'),
    [example, setExample] = useState<Counterexample | null>(null),
    [experimentThreshold, setExperimentThreshold] = useState(draft?.experimentThreshold ?? 20),
    [experimentChoice, setExperimentChoice] = useState<Prediction['action']>('move'),
    [experimentPrediction, setExperimentPrediction] = useState<Prediction['action'] | null>(null),
    [experimentRevealed, setExperimentRevealed] = useState(false),
    [experimentView, setExperimentView] = useState<'baseline' | 'changed'>('changed'),
    [experimentExplanation, setExperimentExplanation] = useState(false)
  const [transferChoice, setTransferChoice] = useState<Prediction['action']>('move'),
    [transfer, setTransfer] = useState<Reassessment | null>(
      saved?.transferRetries?.at(-1) ?? saved?.reassessment ?? null,
    ),
    [showTransfer, setShowTransfer] = useState(
      draft?.stage === 'reassess' || Boolean(saved?.reassessment),
    ),
    [transferIndex, setTransferIndex] = useState(
      draft?.transferIndex ?? saved?.transferRetries?.length ?? 0,
    )
  const robot = result ? replayAt(world, result.events, cursor) : initialRobot(world),
    sensor = readSensors(world, initialRobot(world)),
    correct = Boolean(
      prediction &&
      !prediction.uncertain &&
      result &&
      prediction.action === actualAction(result.events),
    ),
    transferVariant = mission.variants[transferIndex % Math.max(1, mission.variants.length)]
  const cycleIndex =
    showTransfer || transfer ? 6 : showExperiment ? 5 : showInvestigation ? 4 : result ? 3 : 1
  const stage = complete ? 'complete' : LEARNING_CYCLE[cycleIndex]!.toLowerCase()
  const saveDraft = useCallback(async () => {
    const profile = await start(),
      current = useSession.getState().data
    const next = {
      schemaVersion: 1 as const,
      id: `draft-${profile.id}-${missionId}`,
      learnerId: profile.id,
      missionId,
      world,
      program,
      updatedAt: new Date().toISOString(),
      stage: result ? stage : 'predict',
      cursor,
      attemptId: attemptId || null,
      experimentThreshold,
      transferIndex,
    }
    await replace({
      ...current,
      drafts: [...current.drafts.filter((item) => item.id !== next.id), next],
    })
  }, [
    start,
    replace,
    missionId,
    world,
    program,
    stage,
    result,
    cursor,
    attemptId,
    experimentThreshold,
    transferIndex,
  ])
  const saveRef = useRef(saveDraft),
    draftDirty = useRef(false)
  useEffect(() => {
    saveRef.current = saveDraft
  }, [saveDraft])
  useEffect(() => {
    draftDirty.current = true
    const timer = window.setTimeout(() => {
      void saveDraft()
        .then(() => {
          draftDirty.current = false
        })
        .catch((error) =>
          setError(error instanceof Error ? error.message : 'Draft could not be saved.'),
        )
    }, 450)
    return () => window.clearTimeout(timer)
  }, [saveDraft])
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (draftDirty.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', guard)
    return () => {
      window.removeEventListener('beforeunload', guard)
      if (draftDirty.current) void saveRef.current()
    }
  }, [])
  useEffect(() => {
    if (!fresh) return
    const url = new URL(window.location.href)
    url.searchParams.delete('new')
    url.searchParams.delete('retry')
    url.searchParams.delete('example')
    window.history.replaceState(window.history.state, '', url)
  }, [fresh])
  useEffect(() => {
    if (!playing || !result) return
    const event = result.events[cursor],
      previousTime = result.events[cursor - 1]?.elapsedMs ?? 0
    const timer = window.setTimeout(
      () => {
        if (cursor >= result.events.length) setPlaying(false)
        else setCursor(cursor + 1)
      },
      Math.max(50, (event?.elapsedMs ?? previousTime + 50) - previousTime) / speed,
    )
    return () => window.clearTimeout(timer)
  }, [playing, cursor, result, speed])
  useEffect(() => {
    if (!showExperiment || example) return
    let active = true
    void generateCounterexample(nextHypothesis(hypotheses))
      .then((generated) => {
        if (active) setExample(generated)
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : 'Experiment could not be restored.')
      })
    return () => {
      active = false
    }
  }, [showExperiment, example, hypotheses])
  const reset = () => {
    setPrediction(null)
    setResult(null)
    setCursor(0)
    setPlaying(false)
    setAttemptId('')
    setResponses([])
    setHypotheses(initialHypotheses(mission.conceptGoals))
    setExample(null)
    setShowExperiment(false)
    setShowTransfer(false)
    setShowInvestigation(false)
    setTransfer(null)
    setComplete(false)
    setAssessmentSkipped(false)
    setError('')
    setUncertain(false)
    setHintIds([])
    setHintLevel(0)
    setNotice('New attempt ready. Your previous result stays saved locally.')
  }
  const changeWorld = (next: World) => {
    worldHistory.set(WorldSchema.parse(next))
    reset()
  }
  const changeProgram = (next: Program) => {
    programHistory.set(next)
    reset()
  }
  const selectCursor = (next: number) => {
    setPlaying(false)
    setCursor(next)
  }
  const run = async (skip = false) => {
    if (busy || prediction) return
    setBusy(true)
    setError('')
    try {
      const profile = await start(),
        startedAt = new Date().toISOString(),
        recorded = await recordPrediction(
          profile.id,
          world,
          program,
          action,
          confidence,
          reasoning,
        ),
        p = immutable({ ...recorded, branch: branchChoice, uncertain: uncertain || skip })
      const runResult = execute(world, program)
      if (runResult.error) {
        setError(runResult.error)
        setResult(runResult)
        setCursor(runResult.events.length)
        return
      }
      const attempt: Attempt = {
        schemaVersion: 1,
        id: opaqueId(),
        learnerId: profile.id,
        missionId,
        attemptIndex:
          useSession.getState().data.attempts.filter((item) => item.learnerId === profile.id)
            .length + 1,
        startedAt,
        completedAt: new Date().toISOString(),
        prediction: p,
        world: structuredClone(world),
        program: structuredClone(program),
        traceHash: await stableHash(runResult.events),
        diagnosticResponses: [],
        reassessment: null,
        hintIds,
        assessmentSkipped: skip || uncertain,
        goalOutcome: free
          ? { passed: false, facts: ['Free exploration is not a scored mission'] }
          : judgeGoals(world, runResult, mission.successPredicate),
      }
      const current = useSession.getState().data
      await replace(
        appendAttempt(
          current.profile && !free
            ? {
                ...current,
                profile: {
                  ...current.profile,
                  settings: { ...current.profile.settings, lastOpenedMission: mission.id },
                },
              }
            : current,
          attempt,
        ),
      )
      setPrediction(p)
      setResult(runResult)
      setAttemptId(attempt.id)
      setCursor(runResult.events.length)
      setPlaying(false)
      setAssessmentSkipped(skip || uncertain)
      setHypotheses(
        !p.uncertain && p.action !== actualAction(runResult.events)
          ? possibleFromWrongAnswer(initialHypotheses(mission.conceptGoals))
          : initialHypotheses(mission.conceptGoals),
      )
      setShowInvestigation(!free && !p.uncertain && p.action !== actualAction(runResult.events))
      setNotice(
        `${skip ? 'Free exploration executed.' : p.uncertain ? 'Uncertainty recorded; no misconception inferred.' : 'Prediction locked before reveal.'} Actual result ${useSession.getState().ephemeral ? 'kept in memory for this session' : 'saved on this device'}.`,
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The run did not complete')
    } finally {
      setBusy(false)
    }
  }
  const answerProbe = async (choiceId: string) => {
    const probe = probes[responses.length]
    if (!probe || !result || !attemptId) return
    setBusy(true)
    try {
      const response = { probeId: probe.id, choiceId, recordedAt: new Date().toISOString() },
        next = [...responses, response],
        hs = updateEvidence(hypotheses, probe, choiceId, {
          answerId: `${attemptId}-${response.probeId}`,
          traceHash: await stableHash(execute(probe.scenario.world, probe.scenario.program).events),
          scenarioHash: await stableHash(probe.scenario),
        })
      const current = useSession.getState().data,
        updated = annotateAttempt(current, attemptId, {
          diagnosticResponses: next,
          reassessment: null,
        }),
        items = hs.flatMap((hypothesis) => [...hypothesis.evidence, ...hypothesis.contradictions])
      if (updated.profile)
        updated.profile = {
          ...updated.profile,
          evidence: [
            ...updated.profile.evidence.filter(
              (item) =>
                !items.some(
                  (other) =>
                    other.answerId === item.answerId && other.scenarioHash === item.scenarioHash,
                ),
            ),
            ...items,
          ],
        }
      await replace(updated)
      setHypotheses(hs)
      setResponses(next)
      setProbeHint(false)
      setProbeWhy(false)
      setProbePractice(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Probe was not saved')
    } finally {
      setBusy(false)
    }
  }
  const openExperiment = async () => {
    setBusy(true)
    try {
      const current = useSession.getState().data,
        original = current.attempts.find((item) => item.id === attemptId)
      if (original)
        await replace(
          annotateAttempt(current, attemptId, {
            diagnosticResponses: original.diagnosticResponses,
            reassessment: original.reassessment,
            experimentUsed: true,
          }),
        )
      const generated = await generateCounterexample(nextHypothesis(hypotheses))
      setExample(generated)
      setExperimentThreshold(Number(generated.changedParameters[0]?.before ?? 20))
      setExperimentPrediction(null)
      setExperimentRevealed(false)
      setExperimentExplanation(false)
      setShowExperiment(true)
      setShowInvestigation(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Experiment failed')
    } finally {
      setBusy(false)
    }
  }
  const experimentDistance = example?.baselineTrace[0]?.sensor.distanceCm ?? 24
  const experimentWorld = makeWorld(experimentDistance),
    experimentResult = execute(experimentWorld, thresholdProgram(experimentThreshold)),
    baselineResult = execute(experimentWorld, thresholdProgram(20))
  const reassess = async () => {
    if (!transferVariant || !prediction || !attemptId) return
    setBusy(true)
    try {
      const runResult = execute(transferVariant.world, transferVariant.program),
        actual = actualAction(runResult.events)
      if (runResult.error) throw new Error(runResult.error)
      const answer: Reassessment = {
        schemaVersion: 1,
        worldHash: await stableHash(transferVariant.world),
        programHash: await stableHash(transferVariant.program),
        predictedAction: transferChoice,
        actualAction: actual,
        correct: transferChoice === actual,
        recordedAt: new Date().toISOString(),
      }
      const current = useSession.getState().data,
        original = current.attempts.find((item) => item.id === attemptId)!,
        next = annotateAttempt(current, attemptId, {
          diagnosticResponses: responses,
          reassessment: original.reassessment ?? answer,
          transferRetries: original.reassessment
            ? [...(original.transferRetries ?? []), answer]
            : original.transferRetries,
        })
      if (next.profile) {
        const concept = mission.conceptGoals[0] ?? 'conditionals',
          prior = next.profile.conceptProgress.find((item) => item.concept === concept),
          independent = Boolean(
            correct && answer.correct && hintIds.length === 0 && !original.experimentUsed,
          ),
          hashes = [
            ...new Set([
              ...(prior?.distinctScenarioHashes ?? []),
              ...(independent ? [answer.worldHash] : []),
            ]),
          ],
          goal = current.attempts.find((item) => item.id === attemptId)?.goalOutcome.passed
        next.profile = {
          ...next.profile,
          completedMissions:
            goal && answer.correct && !prediction.uncertain
              ? [...new Set([...next.profile.completedMissions, mission.id])]
              : next.profile.completedMissions,
          responses: [
            ...next.profile.responses.filter((item) => item.id !== prediction.id),
            prediction,
          ],
          conceptProgress: [
            ...next.profile.conceptProgress.filter((item) => item.concept !== concept),
            {
              concept,
              independentSuccesses: hashes.length,
              distinctScenarioHashes: hashes,
              status: hashes.length ? conceptStatus(hashes) : 'practicing',
            },
          ],
        }
      }
      await replace(next)
      setTransfer(answer)
      setNotice('Transfer response saved. One correct answer is not proof of mastery.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transfer was not saved')
    } finally {
      setBusy(false)
    }
  }
  const retryTransfer = () => {
    if (mission.variants.length <= transferIndex + 1) {
      setNotice(
        'All authored transfer scenarios have been revealed. Practice the mission again; repeating a revealed scenario will not count as new independent evidence.',
      )
      return
    }
    setTransferIndex((value) => value + 1)
    setTransfer(null)
    setTransferChoice('move')
    setNotice(
      'A new authored transfer scenario is ready. Previous responses remain in your evidence history.',
    )
  }
  const recordHint = (id: string) => {
    setHintIds((current) => [...new Set([...current, id])])
    if (attemptId) {
      const current = useSession.getState().data
      const original = current.attempts.find((item) => item.id === attemptId)
      if (original)
        void replace(
          annotateAttempt(current, attemptId, {
            diagnosticResponses: original.diagnosticResponses,
            reassessment: original.reassessment,
            hintIds: [...new Set([...(original.hintIds ?? []), id])],
          }),
        )
    }
  }
  const saveSummary = () => {
    const attempt = useSession.getState().data.attempts.find((item) => item.id === attemptId)
    if (attempt)
      downloadFile(
        `branchcade-${missionId}-summary.json`,
        JSON.stringify(
          {
            schemaVersion: 1,
            missionId,
            prediction: {
              action: attempt.prediction.uncertain ? 'uncertain' : attempt.prediction.action,
              confidence: attempt.prediction.confidence,
            },
            goalOutcome: attempt.goalOutcome,
            diagnosticResponses: attempt.diagnosticResponses,
            reassessment: attempt.reassessment,
            traceHash: attempt.traceHash,
          },
          null,
          2,
        ),
      )
  }
  const nextMission =
    MISSION_CATALOG[MISSION_CATALOG.findIndex((item) => item.id === mission.id) + 1]
  const goalOutcome = useSession
    .getState()
    .data.attempts.find((item) => item.id === attemptId)?.goalOutcome
  const mainRun = () => {
    if (result) {
      if (cursor >= result.events.length) setCursor(0)
      setPlaying(true)
    } else {
      document.getElementById('prediction-heading')?.focus()
      document.getElementById('prediction-heading')?.scrollIntoView({ block: 'nearest' })
    }
  }
  const stepAction = () => {
    if (!result || cursor >= result.events.length) return
    let next = cursor + 1
    const first = result.events[cursor]
    while (
      next < result.events.length &&
      result.events[next]?.nodeId === first?.nodeId &&
      result.events[next]?.kind === first?.kind
    )
      next++
    selectCursor(next)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches('input,textarea,select,[contenteditable="true"]') ||
          event.target.closest('.blocklySvg'))
      )
        return
      if (event.key === ' ' && result) {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (event.key === 'ArrowRight' && result) {
        event.preventDefault()
        setPlaying(false)
        setCursor((value) => Math.min(result.events.length, value + 1))
      }
      if (event.key === 'ArrowLeft' && result) {
        event.preventDefault()
        setPlaying(false)
        setCursor((value) => Math.max(0, value - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result])
  return (
    <main className="page lab-page workstation-page">
      <p className="narrow-advisory">
        A laptop gives the block workspace more room. Prediction, sensor and trace controls remain
        usable below.
      </p>
      <header className="lesson-heading">
        <div>
          <span className="section-index">
            {free
              ? 'Your open workbench'
              : `${mission.id.toUpperCase()} / ${mission.conceptGoals.join(' · ')}`}
          </span>
          <h1>{free ? 'The sensor lab' : mission.title}</h1>
        </div>
        <div className="local-chip">
          <ShieldCheck size={15} />
          {data.profile?.nickname ?? 'No account needed'}
        </div>
      </header>
      <div className="workstation-progress">
        <Link
          to="/missions"
          onClick={() => {
            void saveRef.current()
          }}
        >
          Back to missions
        </Link>
        <strong>{LEARNING_CYCLE[cycleIndex]}</strong>
        <span>
          {data.teams.find((team) => team.status === 'active')
            ? 'Local team session available in Team Mode'
            : 'Individual investigation'}
        </span>
        <span role="status" aria-label="Workbench save status">
          {pendingWrites ? 'Saving…' : ephemeral ? 'In-memory session' : 'Saved on this device'}
        </span>
      </div>
      <ol className="cycle" aria-label="Learning cycle">
        {LEARNING_CYCLE.map((step, index) => (
          <li key={step} aria-current={index === cycleIndex ? 'step' : undefined}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <div className="workstation-toolbar" aria-label="Workbench controls">
        <Button variant="outline" onClick={() => setDialog('briefing')}>
          Mission briefing
        </Button>
        <Button
          variant="outline"
          disabled={ephemeral}
          title={
            ephemeral
              ? 'Storage unavailable. Export your work to keep it.'
              : 'Save the world, code and learning stage locally'
          }
          onClick={() => {
            void saveDraft().then(() =>
              setNotice('World, code and learning stage saved on this device.'),
            )
          }}
        >
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (
              JSON.stringify(program) === JSON.stringify(mission.starterProgram) ||
              window.confirm('Restore starter code? Previous attempts remain saved.')
            )
              changeProgram(mission.starterProgram)
          }}
        >
          Reset code
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            selectCursor(0)
            setNotice('Simulation reset to the initial snapshot. Saved run evidence is preserved.')
          }}
        >
          Reset simulation
        </Button>
        {playing ? (
          <Button onClick={() => setPlaying(false)}>
            <Pause size={16} />
            Pause
          </Button>
        ) : (
          <Button onClick={mainRun}>
            <Play size={16} />
            {result && cursor > 0 && cursor < result.events.length ? 'Resume' : 'Run'}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!result || cursor >= result.events.length}
          title="Advance one interpreter action; consecutive movement ticks from the same block are grouped"
          onClick={stepAction}
        >
          Step action
        </Button>
        <Button
          variant="outline"
          disabled={!playing}
          onClick={() => {
            setPlaying(false)
            setNotice('Stopped by learner. The recorded outcome stays unchanged.')
          }}
        >
          Stop
        </Button>
        <Button
          variant="outline"
          disabled={!result || cursor === 0}
          onClick={() => selectCursor(Math.max(0, cursor - 1))}
        >
          Rewind
        </Button>
        <Button
          variant="outline"
          disabled={!result}
          onClick={() => {
            setCursor(0)
            setPlaying(true)
            setNotice('Replaying the exact saved trace. No new attempt or score is added.')
          }}
        >
          Replay
        </Button>
        <label>
          Speed
          <select
            aria-label="Simulation speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            {[0.5, 1, 2, 4].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          aria-pressed={showCode}
          onClick={() => setShowCode((value) => !value)}
        >
          {showCode ? 'Hide code' : 'Show code'}
        </Button>
        <Button
          variant="outline"
          aria-pressed={showTrace}
          onClick={() => setShowTrace((value) => !value)}
        >
          {showTrace ? 'Hide trace' : 'Show trace'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setLeftWidth(29)
            setRightWidth(25)
            setShowCode(true)
            setShowTrace(true)
          }}
        >
          Reset layout
        </Button>
        <Button variant="outline" onClick={() => setDialog('help')}>
          Help
        </Button>
        <Button variant="outline" onClick={() => setDialog('shortcuts')}>
          Keyboard shortcuts
        </Button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="notice workbench-notice" role="status">
        {notice}
      </p>
      <div
        className={`workstation-grid ${!showCode ? 'code-collapsed' : ''} ${!showTrace ? 'trace-collapsed' : ''}`}
        style={
          {
            '--editor-width': `${leftWidth}%`,
            '--inspector-width': `${rightWidth}%`,
          } as React.CSSProperties
        }
      >
        {showCode && (
          <section className="program-panel paper">
            <div className="panel-header">
              <h2>Your program</h2>
              <span className="mono">{result?.events[cursor - 1]?.nodeId ?? 'Ready'}</span>
            </div>
            <div className="button-row">
              <Button
                variant="outline"
                disabled={!programHistory.canUndo || playing}
                onClick={() => {
                  programHistory.undo()
                  reset()
                }}
              >
                Undo code
              </Button>
              <Button
                variant="outline"
                disabled={!programHistory.canRedo || playing}
                onClick={() => {
                  programHistory.redo()
                  reset()
                }}
              >
                Redo code
              </Button>
              <Button variant="outline" onClick={() => setShowEditor((value) => !value)}>
                {showEditor ? 'Close block editor' : 'Open block editor'}
              </Button>
            </div>
            <details open className="pseudocode-details">
              <summary>View pseudocode</summary>
              <pre className="code-preview" aria-label="Inert program preview">
                {pseudocode(program)}
              </pre>
              <Button
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(pseudocode(program))
                    .then(() => setNotice('Pseudocode copied.'))
                    .catch(() =>
                      setError('Clipboard unavailable; select the pseudocode and copy it.'),
                    )
                }}
              >
                Copy pseudocode
              </Button>
            </details>
            <p className="muted">
              The sensor measures. The program chooses what happens.{' '}
              {result?.events[cursor - 1] && (
                <>
                  Selected block: <strong>{result.events[cursor - 1]!.nodeId}</strong>.
                </>
              )}
            </p>
            {showEditor && (
              <Suspense fallback={<p role="status">Loading the local block editor…</p>}>
                <BlocklyEditor
                  program={program}
                  activeNodeId={result?.events[cursor - 1]?.nodeId}
                  onProgram={(next) => {
                    changeProgram(next)
                    setNotice('Validated block program applied.')
                  }}
                />
              </Suspense>
            )}
            <label className="resize-control">
              Editor panel width
              <input
                aria-label="Editor panel width"
                type="range"
                min="20"
                max="38"
                value={leftWidth}
                onChange={(event) => setLeftWidth(Number(event.target.value))}
              />
            </label>
          </section>
        )}
        <section className="world-panel">
          <div className="panel-header">
            <h2>
              <ScanLine size={18} />
              Robot world
            </h2>
            <span className="mono">
              {result
                ? `Tick ${robot.tick} · ${playing ? 'Playing' : 'Paused'}`
                : 'Ready to investigate'}
            </span>
          </div>
          <Stage
            world={world}
            robot={robot}
            events={result?.events}
            cursor={cursor}
            sensorLabels={data.profile?.settings.sensorLabels !== false}
            onSelectObject={setSelectedObject}
            onZoneEdit={
              free && !playing
                ? (id, x, y, width, height) => {
                    try {
                      const next = structuredClone(world),
                        zone = next.floorZones.find((zone) => zone.id === id)
                      if (zone?.kind === 'rectangle') {
                        zone.position = { xCm: x, yCm: y }
                        if (width !== undefined) zone.widthCm = width
                        if (height !== undefined) zone.heightCm = height
                        changeWorld(next)
                        setError('')
                      }
                    } catch {
                      setError('Zone edit rejected: keep its bounds inside the world.')
                    }
                  }
                : undefined
            }
            onRobotMove={
              free && !playing
                ? (x, y) => {
                    try {
                      changeWorld({
                        ...world,
                        spawn: { ...world.spawn, position: { xCm: x, yCm: y } },
                      })
                      setError('')
                    } catch {
                      setError(
                        'Robot placement rejected: keep it clear of solids and world boundaries.',
                      )
                    }
                  }
                : undefined
            }
            onObstacleMove={
              free && !playing
                ? (id, x, y) => {
                    try {
                      changeWorld(positionObstacle(world, id, x, y))
                      setError('')
                    } catch {
                      setError(
                        'Placement rejected: keep solid obstacles separated and clear of the robot.',
                      )
                    }
                  }
                : undefined
            }
          />
          <div className="readout-row">
            <div>
              <span>Initial distance</span>
              <strong className="mono">
                {sensor.distanceCm?.toFixed(1) ?? 'out of range'} <small>cm</small>
              </strong>
            </div>
            <div>
              <span>Surface</span>
              <strong>{sensor.surfaceColor}</strong>
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
          {free ? (
            <WorldEditor
              world={world}
              program={program}
              onWorld={changeWorld}
              onProgram={changeProgram}
              selectedObject={selectedObject}
              onSelectObject={setSelectedObject}
              canUndo={worldHistory.canUndo}
              canRedo={worldHistory.canRedo}
              onUndo={() => {
                worldHistory.undo()
                reset()
              }}
              onRedo={() => {
                worldHistory.redo()
                reset()
              }}
              onError={setError}
              onNotice={setNotice}
              disabled={playing}
              savedWorlds={data.savedLabs}
              onSave={async (name) => {
                try {
                  const current = useSession.getState().data
                  await replace({
                    ...current,
                    savedLabs: [
                      ...current.savedLabs,
                      {
                        schemaVersion: 1,
                        id: opaqueId(),
                        name: name.slice(0, 60),
                        world,
                        program,
                        updatedAt: new Date().toISOString(),
                      },
                    ],
                  })
                  setNotice(
                    `“${name}” saved ${useSession.getState().ephemeral ? 'in this session only' : 'on this device'}.`,
                  )
                } catch (error) {
                  setError(error instanceof Error ? error.message : 'World could not be saved.')
                  throw error
                }
              }}
              onLoadSaved={(id) => {
                const item = data.savedLabs.find((item) => item.id === id)
                if (item) {
                  changeWorld(item.world)
                  programHistory.set(item.program)
                  setNotice(`Loaded “${item.name}”.`)
                }
              }}
            />
          ) : (
            <p className="world-lock-note">
              Mission geometry is locked so predictions and results use the same scenario. Use Free
              Lab to author a world.
            </p>
          )}
          {!free && mission.variants.length > 0 && (
            <details className="world-variants">
              <summary>World variants</summary>
              <p>A variation starts a fresh prediction and preserves your previous attempts.</p>
              {mission.variants.map((variant) => (
                <Button
                  variant="outline"
                  key={variant.id}
                  onClick={() => {
                    changeWorld(variant.world)
                    programHistory.set(variant.program)
                  }}
                >
                  {variant.id}
                </Button>
              ))}
            </details>
          )}
        </section>
        <aside className="learning-inspector">
          <section className="prediction-panel">
            <span className="section-index">
              {prediction ? 'Your prediction is locked' : 'Before you press Run'}
            </span>
            <h2 id="prediction-heading" tabIndex={-1}>
              {prediction ? 'Compare with the evidence' : 'What will the robot do?'}
            </h2>
            {!prediction && (
              <>
                <p>
                  Read the initial sensor value and follow the program. Which action happens first?
                </p>
                <fieldset disabled={busy}>
                  <legend>Your prediction</legend>
                  <div className="prediction-options">
                    {(['move', 'stop', 'turn', 'wait'] as const)
                      .filter(
                        (item) =>
                          free || mission.id !== 'm01' || item === 'move' || item === 'stop',
                      )
                      .map((item) => (
                        <label
                          key={item}
                          className={action === item && !uncertain ? 'choice chosen' : 'choice'}
                        >
                          <input
                            type="radio"
                            name="prediction"
                            value={item}
                            checked={action === item && !uncertain}
                            onChange={() => {
                              setAction(item)
                              setUncertain(false)
                            }}
                          />
                          <strong>{ACTION_LABELS[item]}</strong>
                        </label>
                      ))}
                  </div>
                  <label className="uncertainty-choice">
                    <input
                      type="checkbox"
                      checked={uncertain}
                      onChange={(event) => setUncertain(event.target.checked)}
                    />
                    Not sure yet
                  </label>
                  <details className="optional-prediction">
                    <summary>Optional: predict the branch</summary>
                    <label>
                      Will the first condition be true or false?
                      <select
                        value={branchChoice ?? ''}
                        onChange={(event) =>
                          setBranchChoice(
                            event.target.value === 'then'
                              ? 'then'
                              : event.target.value === 'else'
                                ? 'else'
                                : null,
                          )
                        }
                      >
                        <option value="">No branch prediction</option>
                        <option value="then">True · then branch</option>
                        <option value="else">False · else branch</option>
                      </select>
                    </label>
                  </details>
                  <details className="confidence-reasoning">
                    <summary>Confidence & optional reasoning</summary>
                    <label>
                      How sure are you?{' '}
                      <span className="mono">
                        {confidence} / 5 ·{' '}
                        {
                          ['Guessing', 'Not sure', 'Fairly sure', 'Confident', 'Certain'][
                            confidence - 1
                          ]
                        }
                      </span>
                      <input
                        aria-label="Prediction confidence"
                        type="range"
                        min="1"
                        max="5"
                        value={confidence}
                        onChange={(event) => setConfidence(Number(event.target.value))}
                      />
                    </label>
                    <label>
                      Why do you think that? (optional)
                      <textarea
                        maxLength={2000}
                        value={reasoning}
                        onChange={(event) => setReasoning(event.target.value)}
                        placeholder="Use the reading and the rule. No personal details."
                      />
                    </label>
                  </details>
                </fieldset>
                <Button
                  size="lg"
                  className="run-button"
                  disabled={busy}
                  onClick={() => {
                    void run()
                  }}
                >
                  <Play size={17} />
                  {busy ? 'Running bounded program…' : 'Lock prediction & run'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDialog('help')
                    recordHint('concept-guide')
                  }}
                >
                  I need a hint
                </Button>
                {free && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      void run(true)
                    }}
                  >
                    Run freely without prediction
                  </Button>
                )}
              </>
            )}
            {prediction && result && (
              <div className="result-block">
                <div className="prediction-comparison">
                  <div>
                    <span>Your prediction</span>
                    <strong>
                      {prediction.uncertain ? 'Not sure yet' : ACTION_LABELS[prediction.action]}
                    </strong>
                  </div>
                  <div>
                    <span>What happened</span>
                    <strong>{ACTION_LABELS[actualAction(result.events)]}</strong>
                  </div>
                </div>
                <span className="result-label">Actual result</span>
                <h3>
                  The robot $
                  {
                    { move: 'moved', stop: 'stopped', turn: 'turned', wait: 'waited' }[
                      actualAction(result.events)
                    ]
                  }
                  .
                </h3>
                <p className="fact" data-testid="branch-facts">
                  {branchFacts(result.events)}
                </p>
                <p>
                  {prediction.uncertain
                    ? 'Uncertainty recorded. We need another example before drawing any conclusion.'
                    : correct
                      ? free
                        ? 'Your prediction matches the first executed instruction.'
                        : 'Your prediction matches the run. You can go straight to a new challenge.'
                      : 'Your prediction differs. Let’s find out which part was surprising.'}
                </p>
                {!free && (
                  <p className={goalOutcome?.passed ? 'goal-passed' : 'goal-pending'}>
                    {goalOutcome?.passed
                      ? 'Mission goal met by the executed trace.'
                      : 'Mission goal not met yet.'}{' '}
                    {goalOutcome?.facts.join(' ')}
                  </p>
                )}
                <div className="button-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const decision = result.events.findIndex((event) => event.kind === 'branch')
                      selectCursor(decision < 0 ? 0 : decision + 1)
                      setShowTrace(true)
                    }}
                  >
                    Show decision in timeline
                  </Button>
                  {!free && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowInvestigation(true)
                        setShowExperiment(false)
                      }}
                    >
                      Investigate why
                    </Button>
                  )}
                  {correct && !free && !showTransfer && (
                    <Button onClick={() => setShowTransfer(true)}>Try a different challenge</Button>
                  )}
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw size={16} />
                    Start a new attempt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      reset()
                      setShowEditor(true)
                      setShowCode(true)
                    }}
                  >
                    Change code
                  </Button>
                  <Button variant="outline" onClick={saveSummary}>
                    Save summary
                  </Button>
                  <Button variant="outline" onClick={saveSummary}>
                    Share progress
                  </Button>
                  {free && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        void openExperiment()
                      }}
                    >
                      Generate experiment
                    </Button>
                  )}
                </div>
              </div>
            )}
            <p className="privacy-note">
              <ShieldCheck size={14} />
              {ephemeral
                ? 'In-memory session — export before closing.'
                : 'Saved on this device, not sent to a server.'}
            </p>
          </section>
          {showTrace && result && (
            <TraceView
              events={result.events}
              cursor={cursor}
              onCursor={selectCursor}
              world={world}
              robot={robot}
              program={program}
              runId={attemptId}
              error={result.error}
            />
          )}
          {showTrace && !result && (
            <section className="inspector-empty">
              <h3>Execution inspector</h3>
              <p>
                Lock your prediction and run to inspect recorded state, timeline, operands,
                variables and program limits.
              </p>
            </section>
          )}
          <label className="resize-control">
            Inspector panel width
            <input
              aria-label="Inspector panel width"
              type="range"
              min="22"
              max="33"
              value={rightWidth}
              onChange={(event) => setRightWidth(Number(event.target.value))}
            />
          </label>
        </aside>
      </div>
      {result && showInvestigation && !free && !transfer && (
        <section className="paper investigation learning-step">
          <span className="section-index">Investigate / evidence, not labels</span>
          <h2>Let’s check one more thing.</h2>
          <p>
            One answer can have more than one explanation. We’re checking possible interpretations.
            This is not a diagnosis.
          </p>
          {responses.length < probes.length ? (
            <>
              <fieldset disabled={busy}>
                <legend>{probeQuestion(probes[responses.length]!)}</legend>
                <details className="probe-scenario">
                  <summary>Inspect the isolated world and program</summary>
                  <Stage
                    controls={false}
                    world={probes[responses.length]!.scenario.world}
                    robot={initialRobot(probes[responses.length]!.scenario.world)}
                  />
                  <pre className="code-preview">
                    {pseudocode(probes[responses.length]!.scenario.program)}
                  </pre>
                </details>
                <div className="button-row">
                  {probes[responses.length]!.choices.map((choice) => (
                    <Button
                      variant="outline"
                      key={choice.id}
                      onClick={() => {
                        void answerProbe(choice.id)
                      }}
                    >
                      {choice.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <div className="button-row">
                <Button variant="outline" onClick={() => setProbeWhy((value) => !value)}>
                  Why are you asking?
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProbeHint(true)
                    recordHint(`probe-${responses.length}`)
                  }}
                >
                  Show me a hint
                </Button>
                <Button variant="outline" onClick={() => setProbePractice((value) => !value)}>
                  Try it in the lab
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProbeOffset((value) => value + 1)
                    setProbePractice(true)
                  }}
                >
                  Try a different example
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProbeHint(true)
                    setProbePractice(true)
                    recordHint('worked-explanation')
                  }}
                >
                  I still don’t get it
                </Button>
              </div>
              {probeWhy && (
                <p className="fact">
                  This isolated example checks {mission.conceptGoals.join(' and ')} without changing
                  your saved mission. Different answers help decide what to practice; this is not a
                  score of your ability.
                </p>
              )}
              {probeHint && (
                <p className="fact">
                  {MISSION_META[mission.id]?.hints[0] ??
                    'Follow the instructions in order. A helper only runs when called; a loop rechecks its condition before another iteration.'}
                </p>
              )}
              {probePractice && <ProbePractice key={probeOffset} offset={probeOffset} />}
            </>
          ) : (
            <>
              <div className="hypotheses">
                {hypotheses.map((hypothesis) => (
                  <div key={hypothesis.code}>
                    <h3>{hypothesis.title}</h3>
                    <p>
                      {hypothesis.status === 'evidence_for'
                        ? hypothesis.learnerText
                        : hypothesis.status === 'evidence_against'
                          ? 'This response argues against that explanation.'
                          : 'More evidence would help distinguish this explanation.'}
                    </p>
                    <span className="muted">
                      {hypothesis.status === 'evidence_for'
                        ? 'Might be'
                        : hypothesis.status === 'evidence_against'
                          ? 'No longer supported'
                          : 'Need more examples'}{' '}
                      · {hypothesis.evidence.length} supporting · {hypothesis.contradictions.length}{' '}
                      contradicting observations
                    </span>
                  </div>
                ))}
              </div>
              <Button
                disabled={busy}
                onClick={() => {
                  void openExperiment()
                }}
              >
                Generate a targeted experiment
              </Button>
            </>
          )}
          {responses.length > 0 && (
            <p className="fact">{probes[responses.length - 1]!.rationale}</p>
          )}
          <div className="button-row">
            <Button variant="outline" onClick={() => setShowInvestigation(false)}>
              Back to mission
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (responses.length < probes.length) {
                  setAssessmentSkipped(true)
                  const current = useSession.getState().data
                  void replace({
                    ...current,
                    attempts: current.attempts.map((item) =>
                      item.id === attemptId ? { ...item, assessmentSkipped: true } : item,
                    ),
                  })
                  setNotice('Investigation skipped. Any experiment is practice, not a diagnosis.')
                }
                void openExperiment()
              }}
            >
              Continue to experiment
            </Button>
          </div>
          {assessmentSkipped && (
            <p>Diagnostic questions skipped; no diagnosis or mastery is inferred.</p>
          )}
        </section>
      )}
      {showExperiment && example && (
        <section className="paper learning-step">
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
            <>
              <p>{example.noCandidateReason}</p>
              <p>
                No misconception-specific experiment is available for this concept. The mission
                state and saved evidence are preserved.
              </p>
              <div className="button-row">
                <Button variant="outline" onClick={() => setShowExperiment(false)}>
                  Return to mission
                </Button>
                {!free && (
                  <Button onClick={() => setShowTransfer(true)}>
                    Test my understanding with new numbers
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="experiment-columns">
                <div>
                  <h3>Your earlier idea</h3>
                  <p>
                    The baseline uses a {experimentDistance} cm reading and a 20 cm threshold.
                    Change only the comparison threshold.
                  </p>
                  <div className="button-row">
                    <Button
                      variant="outline"
                      aria-pressed={experimentView === 'baseline'}
                      onClick={() => setExperimentView('baseline')}
                    >
                      Baseline scenario
                    </Button>
                    <Button
                      variant="outline"
                      aria-pressed={experimentView === 'changed'}
                      onClick={() => setExperimentView('changed')}
                    >
                      Changed scenario
                    </Button>
                  </div>
                  <Stage world={experimentWorld} robot={initialRobot(experimentWorld)} />
                </div>
                <div>
                  <h3>Let’s try changing just one thing</h3>
                  <label>
                    Experiment threshold: <strong>{experimentThreshold} cm</strong>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={experimentThreshold}
                      aria-label="Experiment threshold"
                      onChange={(event) => {
                        setExperimentThreshold(Number(event.target.value))
                        setExperimentPrediction(null)
                        setExperimentRevealed(false)
                      }}
                    />
                  </label>
                  <label>
                    Experiment threshold value (cm)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={experimentThreshold}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        if (Number.isFinite(value) && value >= 0 && value <= 100) {
                          setExperimentThreshold(value)
                          setExperimentPrediction(null)
                          setExperimentRevealed(false)
                        }
                      }}
                    />
                  </label>
                  <pre className="code-preview">
                    {pseudocode(
                      thresholdProgram(experimentView === 'baseline' ? 20 : experimentThreshold),
                    )}
                  </pre>
                  <label>
                    Predict changed outcome
                    <select
                      value={experimentChoice}
                      disabled={experimentPrediction !== null}
                      onChange={(event) =>
                        setExperimentChoice(event.target.value as Prediction['action'])
                      }
                    >
                      {(['move', 'stop'] as const).map((item) => (
                        <option key={item} value={item}>
                          {ACTION_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="button-row">
                    <Button
                      disabled={experimentPrediction !== null}
                      onClick={() => setExperimentPrediction(experimentChoice)}
                    >
                      Predict changed outcome
                    </Button>
                    <Button
                      disabled={experimentPrediction === null}
                      onClick={() => setExperimentRevealed(true)}
                    >
                      Run experiment
                    </Button>
                  </div>
                  {experimentRevealed ? (
                    <p className="fact" data-testid="experiment-facts">
                      {branchFacts(experimentResult.events)}. The robot{' '}
                      {actualAction(experimentResult.events) === 'move' ? 'moves' : 'stops'}. Your
                      prediction{' '}
                      {experimentPrediction === actualAction(experimentResult.events)
                        ? 'matches'
                        : 'differs from'}{' '}
                      this executed result.
                    </p>
                  ) : (
                    <p className="muted" data-testid="experiment-facts">
                      Prediction comes before the changed result. Lock your prediction, then run the
                      experiment.
                    </p>
                  )}
                </div>
              </div>
              <div className="button-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setExperimentThreshold(Number(example.changedParameters[0]?.before ?? 20))
                    setExperimentPrediction(null)
                    setExperimentRevealed(false)
                    setExperimentExplanation(false)
                  }}
                >
                  Reset experiment
                </Button>
                <Button
                  variant="outline"
                  disabled={!experimentRevealed}
                  onClick={() => setExperimentExplanation((value) => !value)}
                >
                  Explain comparison
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const after = Number(example.changedParameters[0]?.after ?? 29)
                    if (experimentThreshold === after)
                      setNotice(
                        'The bounded candidate bank found no different validated counterexample for this hypothesis. Adjust the threshold to test another value.',
                      )
                    else {
                      setExperimentThreshold(after)
                      setExperimentPrediction(null)
                      setExperimentRevealed(false)
                      setNotice(
                        'Loaded the generated changed threshold. Predict it before running.',
                      )
                    }
                  }}
                >
                  Try another counterexample
                </Button>
                <Button variant="outline" onClick={() => setShowExperiment(false)}>
                  Return to mission
                </Button>
                {!free && (
                  <Button onClick={() => setShowTransfer(true)}>
                    Test my understanding with new numbers
                  </Button>
                )}
              </div>
              {experimentExplanation && (
                <p className="fact">
                  Baseline: {branchFacts(baselineResult.events)}; action{' '}
                  {actualAction(baselineResult.events)}. Changed:{' '}
                  {branchFacts(experimentResult.events)}; action{' '}
                  {actualAction(experimentResult.events)}. The world and camera are identical; only
                  the numeric threshold changed.
                </p>
              )}
            </>
          )}
        </section>
      )}
      {!free && showTransfer && result && transferVariant && (
        <section className="paper learning-step">
          <span className="section-index">Reassess / a different scenario</span>
          <h2>A new world. The same concept.</h2>
          <div className="transfer-context">
            <Stage world={transferVariant.world} robot={initialRobot(transferVariant.world)} />
            <div>
              <p>
                Initial reading:{' '}
                {readSensors(
                  transferVariant.world,
                  initialRobot(transferVariant.world),
                ).distanceCm?.toFixed(1) ?? 'out of range'}{' '}
                cm. Read the new program before revealing the result.
              </p>
              <pre className="code-preview">{pseudocode(transferVariant.program)}</pre>
            </div>
          </div>
          {!transfer ? (
            <fieldset disabled={busy}>
              <legend>Predict the action before revealing the result</legend>
              <div className="prediction-options">
                {(['move', 'stop', 'turn', 'wait'] as const)
                  .filter((item) => mission.id !== 'm01' || item === 'move' || item === 'stop')
                  .map((item) => (
                    <label className="choice" key={item}>
                      <input
                        type="radio"
                        name="transfer"
                        checked={transferChoice === item}
                        onChange={() => setTransferChoice(item)}
                      />
                      {ACTION_LABELS[item]}
                    </label>
                  ))}
              </div>
              <Button
                disabled={busy}
                onClick={() => {
                  void reassess()
                }}
              >
                Lock transfer prediction & reveal
              </Button>
            </fieldset>
          ) : (
            <div>
              <p className="fact">
                {branchFacts(execute(transferVariant.world, transferVariant.program).events)}. The
                actual program{' '}
                {transfer.actualAction === 'stop'
                  ? 'stops'
                  : transfer.actualAction === 'move'
                    ? 'moves'
                    : transfer.actualAction === 'turn'
                      ? 'turns'
                      : 'waits'}
                . Your prediction {transfer.correct ? 'matches' : 'differs from'} the result.
              </p>
              <h3>What changed?</h3>
              <p>
                Your first prediction{' '}
                {prediction?.uncertain
                  ? 'was uncertain'
                  : correct
                    ? 'matched its trace'
                    : 'differed from its trace'}
                ; your transfer prediction {transfer.correct ? 'matched' : 'differed'}. These are
                different executed examples, not evidence that one activity caused learning.
              </p>
              <p>{recommendation(correct, transfer.correct)}</p>
              <div className="button-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    reset()
                    changeWorld(mission.world)
                    programHistory.set(mission.starterProgram)
                  }}
                >
                  Practice again with a new attempt
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    void retryTransfer()
                  }}
                >
                  Retry transfer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInvestigation(true)
                    setShowTrace(true)
                    document
                      .querySelector('.learning-inspector')
                      ?.scrollIntoView({ block: 'start' })
                  }}
                >
                  Review evidence
                </Button>
                <Button
                  onClick={() => {
                    setComplete(true)
                    void saveDraft()
                      .then(() => {
                        const current = useSession.getState().data
                        return replace({
                          ...current,
                          drafts: current.drafts.map((item) =>
                            item.missionId === missionId && item.learnerId === current.profile?.id
                              ? { ...item, stage: 'complete' }
                              : item,
                          ),
                        })
                      })
                      .then(() =>
                        setNotice(
                          'Investigation finished. Your trace and learning evidence are saved.',
                        ),
                      )
                  }}
                >
                  Finish
                </Button>
                {goalOutcome?.passed && transfer.correct && nextMission && (
                  <Link className="button-link" to={`/missions/${nextMission.id}`}>
                    Next mission
                  </Link>
                )}
                <Link to="/progress">View my progress</Link>
              </div>
            </div>
          )}
        </section>
      )}
      {free && (
        <div className="button-row lab-reset">
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  'Reset world, code and transient simulation? Saved worlds and attempts stay in your collection.',
                )
              ) {
                changeWorld(makeWorld())
                programHistory.set(thresholdProgram())
              }
            }}
          >
            Reset everything
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              document.getElementById('prediction-heading')?.focus()
              setNotice(
                'Prediction mode ready. Choose an outcome, confidence and optional reason before running.',
              )
            }}
          >
            Try prediction mode
          </Button>
        </div>
      )}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
      >
        <DialogContent className="workstation-dialog">
          <DialogTitle>
            {dialog === 'briefing'
              ? free
                ? 'Welcome to Free Lab'
                : mission.title
              : dialog === 'shortcuts'
                ? 'Keyboard shortcuts'
                : 'A hint, one step at a time'}
          </DialogTitle>
          <DialogDescription>
            {dialog === 'briefing'
              ? 'Observe → predict → execute → compare → investigate → experiment → reassess.'
              : dialog === 'shortcuts'
                ? 'Shortcuts work outside inputs and the Blockly workspace.'
                : 'Hints support reasoning and are recorded as assistance, never a penalty.'}
          </DialogDescription>
          {dialog === 'briefing' ? (
            <>
              <p>
                {free
                  ? 'Build a legal world, edit the code, and inspect what the actual interpreter does. Free exploration is not a scored mission.'
                  : (MISSION_META[mission.id]?.objective ??
                    `Investigate ${mission.conceptGoals.join(' and ')}.`)}
              </p>
              <h3>Success conditions</h3>
              <ul>
                {mission.successPredicate.map((goal, index) => (
                  <li key={index}>{describeGoal(goal)}</li>
                ))}
              </ul>
              <p>
                Measurements use centimeters and fixed 50 ms ticks. Mission history and locked
                predictions cannot be back-edited.
              </p>
            </>
          ) : dialog === 'shortcuts' ? (
            <ul>
              <li>Space: pause/resume an existing recorded run.</li>
              <li>Left / Right arrows: one recorded event backward/forward.</li>
              <li>Tab / Shift+Tab: move through controls.</li>
              <li>Escape: close this dialog.</li>
            </ul>
          ) : (
            <>
              <p>
                {MISSION_META[mission.id]?.hints[hintLevel] ??
                  'Follow one instruction at a time. Use the actual sensor values and variable state in the inspector.'}
              </p>
              <Button
                variant="outline"
                disabled={hintLevel >= 2}
                onClick={() => {
                  setHintLevel((value) => Math.min(2, value + 1))
                  recordHint(`hint-${hintLevel + 1}`)
                }}
              >
                Show next hint
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
function ProbePractice({ offset }: { offset: number }) {
  const distance = 14 + (offset % 4) * 6,
    threshold = 18 + (offset % 3) * 7,
    world = makeWorld(distance),
    program = thresholdProgram(threshold)
  const [reveal, setReveal] = useState(false)
  return (
    <div className="probe-practice">
      <h3>Isolated practice · saved mission preserved</h3>
      <Stage world={world} robot={initialRobot(world)} />
      <pre className="code-preview">{pseudocode(program)}</pre>
      <Button variant="outline" onClick={() => setReveal(true)}>
        Run isolated example
      </Button>
      {reveal && (
        <p className="fact">
          {branchFacts(execute(world, program).events)}. First action:{' '}
          {actualAction(execute(world, program).events)}. This is worked practice and does not add
          independent assessment evidence.
        </p>
      )}
    </div>
  )
}
