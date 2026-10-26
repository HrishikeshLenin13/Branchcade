import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen,
  CircleHelp,
  Code,
  Footprints,
  Gauge,
  Keyboard,
  LayoutGrid,
  ListTree,
  PencilLine,
  Play,
  Pause,
  RefreshCcw,
  RotateCcw,
  Save,
  Sparkles,
  ScanLine,
  ShieldCheck,
  Square,
  StepBack,
  StepForward,
  Undo2,
} from 'lucide-react'
import type {
  Attempt,
  Program,
  Prediction,
  World,
  Reassessment,
  ExperimentResponse,
  Mission,
} from '../../domain/types'
import { LEARNING_CYCLE } from '../../domain/constants'
import { WorldSchema } from '../../domain/schemas'
import { immutable, opaqueId, stableHash } from '../../domain/invariants'
import { makeDefaultWorld } from '../../engine/world'
import { initialRobot } from '../../engine/robot'
import { readSensors } from '../../engine/sensors'
import { readSensors as legacySensors } from '../../interpreter/legacy/sensors'
import { nearestLegalSpawn } from '../../engine/placement'
import { nextCodeCursor, nextTickCursor, ReplayTimeline } from '../../interpreter/debugger'
import { useTracePlayback } from './useTracePlayback'
import {
  execute,
  executeAsync,
  executeRecorded,
  type RunResult,
} from '../../interpreter/interpreter'
import { pseudocode, expressionText } from '../../interpreter/pseudocode'
import { actualAction, branchFacts } from '../../interpreter/trace'
import {
  FIRST_MISSION,
  findMission,
  MISSION_CATALOG,
  MISSION_META,
  REFERENCE_PROGRAMS,
  thresholdProgram,
} from '../../missions/catalog'
import { describeGoal } from '../../missions/goals'
import { judgeMission } from '../../missions/judge'
import { completionChecks, missionComplete } from '../../missions/completion'
import { recordPrediction } from '../../learning/predictions'
import { conceptStatus } from '../../learning/mastery'
import { transferAdvice } from '../../learning/recommendations'
import { attemptDiagnosis, attemptObservations } from '../../learning/investigation'
import { detailChoices, hypothesisRecords } from '../../learning/diagnosis'
import { observe, runModel } from '../../learning/mental-models'
import { curriculumFor, situation } from '../../missions/curriculum'
import { answerLabel, quote } from '../../learning/probe-templates'
import { chooseTransfer, findTransfer } from '../../learning/transfer'
import { recommend } from '../../learning/adaptive-planner'
import { EvidenceSummary, Investigation } from '../diagnosis/Investigation'
import { Experiment } from '../experiments/Experiment'
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
import { ButtonTour } from './ButtonTour'
const BlocklyEditor = lazy(() => import('./BlocklyEditor'))
const ACTION_LABELS = { move: 'Move forward', stop: 'Stop in place', turn: 'Turn', wait: 'Wait' }

/** Playback speeds. 1× is real time (the robot drives 20 cm/s), which is too quick to follow
 * a short mission, so runs start at 0.5×. Speed changes only the playback clock, never the
 * recorded physics or branch results (SPEC E4). The last choice is kept for this visit only. */
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const
let preferredSpeed: number = 0.5

export default function LabLesson({ free = false }: { free?: boolean }) {
  const { slug } = useParams(),
    mission = free ? FIRST_MISSION : findMission(slug ?? '')
  if (!mission)
    return (
      <main className="page">
        <h1>Mission not found</h1>
        <p>Choose a published mission to return to the workbench.</p>
        <Button asChild>
          <Link to="/missions">Back to missions</Link>
        </Button>
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
    lesson = free ? undefined : curriculumFor(mission.id),
    detail = lesson?.detail
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
  const worldHistory = useEditHistory<World>(
      draft?.world ??
        saved?.world ??
        (free && new URLSearchParams(window.location.search).get('example') !== '24'
          ? makeDefaultWorld()
          : mission.world),
    ),
    programHistory = useEditHistory<Program>(
      draft?.program ?? saved?.program ?? mission.starterProgram,
    )
  const world = worldHistory.value,
    program = programHistory.value
  const [action, setAction] = useState<Prediction['action']>(saved?.prediction.action ?? 'move'),
    [confidence, setConfidence] = useState(saved?.prediction.confidence ?? 3),
    [reasoning, setReasoning] = useState(saved?.prediction.reasoning ?? ''),
    [branchChoice, setBranchChoice] = useState<Prediction['branch']>(null),
    [detailChoice, setDetailChoice] = useState(''),
    [uncertain, setUncertain] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(saved?.prediction ?? null),
    [result, setResult] = useState<RunResult | null>(() =>
      saved ? executeRecorded(saved.world, saved.program, saved.engineVersion) : null,
    ),
    [attemptId, setAttemptId] = useState(saved?.id ?? ''),
    [cursor, setCursor] = useState(() =>
      saved
        ? Math.min(
            draft?.cursor ??
              executeRecorded(saved.world, saved.program, saved.engineVersion).events.length,
            executeRecorded(saved.world, saved.program, saved.engineVersion).events.length,
          )
        : 0,
    ),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(preferredSpeed),
    [stepTarget, setStepTarget] = useState<number | undefined>(),
    [editLocked, setEditLocked] = useState(Boolean(saved)),
    [focusedNode, setFocusedNode] = useState<string | undefined>(),
    [errorNode, setErrorNode] = useState<string | undefined>(),
    [focusNonce, setFocusNonce] = useState(0)
  const [busy, setBusy] = useState(false),
    [executing, setExecuting] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [showEditor, setShowEditor] = useState(false),
    [showCode, setShowCode] = useState(true),
    [showTrace, setShowTrace] = useState(true),
    // `?tour=1` (chosen during onboarding) opens the button tour on arrival.
    [touring, setTouring] = useState(
      () => new URLSearchParams(window.location.search).get('tour') === '1',
    ),
    [selectedObject, setSelectedObject] = useState('obstacle'),
    [dialog, setDialog] = useState<'briefing' | 'help' | 'shortcuts' | null>(null),
    [hintIds, setHintIds] = useState<string[]>(saved?.hintIds ?? []),
    [hintLevel, setHintLevel] = useState(0),
    [solutionStep, setSolutionStep] = useState<'idle' | 'confirm' | 'shown'>(
      saved?.hintIds?.includes('show-solution') ? 'shown' : 'idle',
    ),
    [complete, setComplete] = useState(draft?.stage === 'complete')
  const [leftWidth, setLeftWidth] = useState(29),
    [rightWidth, setRightWidth] = useState(25)
  const [responses, setResponses] = useState<Attempt['diagnosticResponses']>(
      saved?.diagnosticResponses ?? [],
    ),
    [showInvestigation, setShowInvestigation] = useState(
      draft?.stage === 'investigate' ||
        Boolean(
          saved &&
          !free &&
          !saved.prediction.uncertain &&
          (saved.engineVersion === 2
            ? attemptDiagnosis(saved, mission).wrongAnswers > 0
            : saved.prediction.action !==
              actualAction(
                executeRecorded(saved.world, saved.program, saved.engineVersion).events,
              )),
        ),
    ),
    [assessmentSkipped, setAssessmentSkipped] = useState(saved?.assessmentSkipped ?? false),
    [reviewEvidence, setReviewEvidence] = useState(false)
  const [showExperiment, setShowExperiment] = useState(draft?.stage === 'experiment')
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
  const stopPlayback = useCallback(() => setPlaying(false), [])
  const animated = useTracePlayback(
    world,
    result?.events,
    cursor,
    playing,
    speed,
    setCursor,
    stopPlayback,
    Boolean(data.profile?.settings.reducedMotion),
    stepTarget,
  )
  // The branch question only makes sense when the program actually has an if/else.
  const hasDecision = JSON.stringify(program).includes('"kind":"if"')
  // Second-question options are recomputed from the current world/program (cached by content).
  const detailOptions = detail
    ? detailChoices(`detail:${JSON.stringify([world, program])}`, world, program, detail.question)
    : []
  const timeline = useMemo(() => new ReplayTimeline(world, result?.events ?? []), [world, result])
  const robot = result ? timeline.at(cursor) : initialRobot(world),
    sensor = (result && !result.status ? legacySensors : readSensors)(world, initialRobot(world)),
    correct = Boolean(
      prediction &&
      !prediction.uncertain &&
      result &&
      prediction.action === actualAction(result.events),
    ),
    savedAttempt = data.attempts.find((item) => item.id === attemptId),
    // Pure and memoized per scenario inside the learning engine; recomputed from stored answers.
    diagnosis = savedAttempt ? attemptDiagnosis(savedAttempt, free ? undefined : mission) : null,
    transferHistory = savedAttempt
      ? [
          ...(savedAttempt.reassessment ? [savedAttempt.reassessment] : []),
          ...(savedAttempt.transferRetries ?? []),
        ]
      : [],
    transferVariant = transfer
      ? (findTransfer(mission, transfer.scenarioId) ??
        mission.variants.find((v) => v.id === 'transfer'))
      : (chooseTransfer(mission, transferHistory) ?? undefined)
  const tickTarget = result ? nextTickCursor(result.events, cursor) : 0
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
      transferIndex,
    }
    await replace({
      ...current,
      drafts: [...current.drafts.filter((item) => item.id !== next.id), next],
    })
  }, [start, replace, missionId, world, program, stage, result, cursor, attemptId, transferIndex])
  const runControl = useRef<AbortController | null>(null),
    editAfterCancel = useRef(false)
  useEffect(() => () => runControl.current?.abort(), [])
  const saveRef = useRef(saveDraft),
    draftDirty = useRef(false),
    draftRevision = useRef(0)
  useEffect(() => {
    saveRef.current = saveDraft
  }, [saveDraft])
  useEffect(() => {
    draftDirty.current = true
    const revision = ++draftRevision.current
    const timer = window.setTimeout(() => {
      void saveDraft()
        .then(() => {
          if (draftRevision.current === revision && !useSession.getState().ephemeral)
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
  const closeTour = useCallback(() => {
    setTouring(false)
    const url = new URL(window.location.href)
    if (url.searchParams.has('tour')) {
      url.searchParams.delete('tour')
      window.history.replaceState(window.history.state, '', url)
    }
  }, [])
  const reset = () => {
    runControl.current?.abort()
    setPrediction(null)
    setResult(null)
    setCursor(0)
    setPlaying(false)
    setEditLocked(false)
    setStepTarget(undefined)
    setFocusedNode(undefined)
    setErrorNode(undefined)
    setAttemptId('')
    setResponses([])
    setShowExperiment(false)
    setShowTransfer(false)
    setShowInvestigation(false)
    setTransfer(null)
    setComplete(false)
    setAssessmentSkipped(false)
    setError('')
    setUncertain(false)
    setDetailChoice('')
    setHintIds([])
    setHintLevel(0)
    setSolutionStep('idle')
    setNotice('New attempt ready. Your previous result stays saved locally.')
  }
  const changeWorld = (next: World) => {
    if (editLocked || busy) return
    const checked = WorldSchema.safeParse(next)
    if (!checked.success) {
      const alternative = checked.error.issues.some((issue) => issue.message.includes('Spawn'))
        ? nearestLegalSpawn(next, next.spawn.position)
        : null
      throw new Error(
        `World edit rejected. ${alternative ? `Nearest legal 1 cm-grid spawn: (${alternative.xCm}, ${alternative.yCm}) cm. Enter it explicitly to apply.` : (checked.error.issues[0]?.message ?? 'Invalid geometry.')}`,
      )
    }
    worldHistory.set(checked.data)
    reset()
  }
  const changeProgram = (next: Program) => {
    if (editLocked || busy) return
    programHistory.set(next)
    reset()
  }
  const selectCursor = (next: number) => {
    setPlaying(false)
    setStepTarget(undefined)
    setFocusedNode(undefined)
    setCursor(next)
  }
  const run = async (skip = false) => {
    if (busy || prediction) return
    setBusy(true)
    setError('')
    setEditLocked(true)
    setExecuting(true)
    const controller = new AbortController()
    runControl.current = controller
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
        p = immutable({
          ...recorded,
          branch: branchChoice,
          uncertain: uncertain || skip,
          ...(detail && detailChoice && !free
            ? { detail: { question: detail.question, answer: detailChoice } }
            : {}),
        })
      const runResult = await executeAsync(world, program, controller.signal)
      setExecuting(false)
      if (runResult.error) {
        setError(runResult.error)
        setErrorNode(runResult.errorNodeId ?? undefined)
        setResult(runResult)
        setCursor(runResult.events.length)
        return
      }
      const attempt: Attempt = {
        schemaVersion: 1,
        engineVersion: 2,
        ...(free ? {} : { missionVersion: mission.version }),
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
          : judgeMission(mission, world, program, runResult),
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
      // Any committed answer that differs from the run (first action, branch or second
      // question) opens the investigation; correct answers never do.
      setShowInvestigation(
        !free && !p.uncertain && attemptDiagnosis(attempt, mission).wrongAnswers > 0,
      )
      setNotice(
        `${skip ? 'Free exploration executed.' : p.uncertain ? 'Uncertainty recorded; no misconception inferred.' : 'Prediction locked before reveal.'} Actual result ${useSession.getState().ephemeral ? 'kept in memory for this session' : 'saved on this device'}.`,
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The run did not complete')
      setErrorNode(error instanceof Error ? /at ([\w.-]+)/.exec(error.message)?.[1] : undefined)
    } finally {
      runControl.current = null
      setExecuting(false)
      setBusy(false)
      if (editAfterCancel.current) {
        editAfterCancel.current = false
        reset()
      }
    }
  }
  /** Persists derived hypothesis records for this attempt so Progress/Instructor can show
   * the rule-based provenance. They are recomputed from stored answers, never edited. */
  const withEvidence = async (next: typeof data, id: string) => {
    const attempt = next.attempts.find((item) => item.id === id)
    if (!attempt || !next.profile) return next
    const records = await hypothesisRecords(attemptDiagnosis(attempt, free ? undefined : mission))
    const items = records.flatMap((h) => [...h.evidence, ...h.contradictions]).slice(0, 60)
    return {
      ...next,
      profile: {
        ...next.profile,
        evidence: [
          ...next.profile.evidence.filter((item) => !item.answerId.startsWith(`${id}-`)),
          ...items,
        ].slice(-100),
      },
    }
  }
  const answerProbe = async (probeId: string, choiceId: string) => {
    if (!result || !attemptId) return
    setBusy(true)
    try {
      const response = { probeId, choiceId, recordedAt: new Date().toISOString() },
        next = [...responses, response]
      const current = useSession.getState().data
      await replace(
        await withEvidence(
          annotateAttempt(current, attemptId, {
            diagnosticResponses: next,
            reassessment: current.attempts.find((item) => item.id === attemptId)!.reassessment,
          }),
          attemptId,
        ),
      )
      setResponses(next)
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
      setShowExperiment(true)
      setShowInvestigation(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Experiment failed')
    } finally {
      setBusy(false)
    }
  }
  const recordExperiment = async (response: ExperimentResponse) => {
    try {
      const current = useSession.getState().data,
        original = current.attempts.find((item) => item.id === attemptId)
      if (!original) return
      await replace(
        await withEvidence(
          annotateAttempt(current, attemptId, {
            diagnosticResponses: original.diagnosticResponses,
            reassessment: original.reassessment,
            experimentResponses: [...(original.experimentResponses ?? []), response],
          }),
          attemptId,
        ),
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Experiment answer was not saved')
    }
  }
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
        scenarioId: 'id' in transferVariant ? transferVariant.id : undefined,
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
          ]
        next.profile = {
          ...next.profile,
          completedMissions:
            !free &&
            missionComplete(
              next.attempts.find((item) => item.id === attemptId)!,
              mission,
            )
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
      await replace(await withEvidence(next, attemptId))
      setTransfer(answer)
      setNotice('Transfer response saved. One correct answer is not proof of mastery.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Transfer was not saved')
    } finally {
      setBusy(false)
    }
  }
  const retryTransfer = () => {
    if (!chooseTransfer(mission, transferHistory)) {
      setNotice(
        'All transfer scenarios for this mission have been revealed. Practice the mission again; repeating a revealed scenario will not count as new independent evidence.',
      )
      return
    }
    setTransferIndex((value) => value + 1)
    setTransfer(null)
    setTransferChoice('move')
    setNotice(
      'A new transfer scenario is ready, picked to match how your last answer went. Previous responses remain in your evidence history.',
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
  const nextUp = useMemo(
    () =>
      transfer && data.profile
        ? recommend(
            data.attempts.filter((item) => item.learnerId === data.profile?.id),
            MISSION_CATALOG,
            data.profile.completedMissions,
          )
        : null,
    [transfer, data.attempts, data.profile],
  )
  const goalOutcome = useSession
    .getState()
    .data.attempts.find((item) => item.id === attemptId)?.goalOutcome
  const mainRun = () => {
    if (result) {
      if (cursor >= result.events.length) setCursor(0)
      setStepTarget(undefined)
      setPlaying(true)
    } else {
      document.getElementById('prediction-heading')?.focus()
      document.getElementById('prediction-heading')?.scrollIntoView({ block: 'nearest' })
    }
  }
  const stepAction = () => {
    if (!result || cursor >= result.events.length) return
    setStepTarget(nextCodeCursor(result.events, cursor))
    setPlaying(true)
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
        setStepTarget(undefined)
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
      {/* Scrolls sideways on phones; a focusable labelled region is the WAI pattern that
          lets keyboard users scroll it (OPUS-003). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="cycle-scroll" role="region" aria-label="Learning cycle" tabIndex={0}>
        <ol className="cycle">
          {LEARNING_CYCLE.map((step, index) => (
            <li key={step} aria-current={index === cycleIndex ? 'step' : undefined}>
              <span>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      {/* Grouped by what a learner is trying to do, with an icon beside every label. */}
      <div className="workstation-toolbar" aria-label="Workbench controls">
        <div className="tool-group tool-group-run" role="group" aria-label="Run">
          {playing ? (
            <Button className="tool-run" data-tour="run" onClick={() => setPlaying(false)}>
              <Pause aria-hidden size={18} />
              Pause
            </Button>
          ) : (
            <Button className="tool-run" data-tour="run" onClick={mainRun}>
              <Play aria-hidden size={18} />
              {result && cursor > 0 && cursor < result.events.length ? 'Resume' : 'Run'}
            </Button>
          )}
          <Button
            variant="outline"
            data-tour="stop"
            disabled={!playing}
            title={playing ? 'Stop the replay here' : 'Available while a run or replay is playing'}
            onClick={() => {
              setPlaying(false)
              setNotice('Stopped by learner. The recorded outcome stays unchanged.')
            }}
          >
            <Square aria-hidden size={16} />
            Stop
          </Button>
          <Button
            variant="outline"
            data-tour="stop-edit"
            disabled={(busy && !executing) || (!editLocked && !executing)}
            title={
              executing || editLocked
                ? 'Stop this run and unlock the code and world for editing'
                : 'Nothing to stop yet: code and world are already editable'
            }
            onClick={() => {
              if (executing) {
                editAfterCancel.current = true
                runControl.current?.abort()
              } else reset()
            }}
          >
            <PencilLine aria-hidden size={16} />
            Stop &amp; Edit
          </Button>
          {executing && (
            <Button onClick={() => runControl.current?.abort()}>Cancel execution</Button>
          )}
        </div>
        <div className="tool-group" role="group" aria-label="Watch it step by step">
          <Button
            variant="outline"
            data-tour="rewind"
            disabled={!result || cursor === 0}
            title={
              !result
                ? 'Run the program first; Rewind steps back through a recorded run'
                : cursor === 0
                  ? 'Already at the start of the run'
                  : 'Step back one recorded event'
            }
            onClick={() => selectCursor(Math.max(0, cursor - 1))}
          >
            <StepBack aria-hidden size={16} />
            Rewind
          </Button>
          <Button
            variant="outline"
            data-tour="step-code"
            disabled={!result || cursor >= result.events.length}
            title={
              !result
                ? 'Run a program before stepping through its statements'
                : cursor >= result.events.length
                  ? 'At the end of the run; use Rewind or Replay to step again'
                  : 'Play the next statement or branch, including its 50 ms motor ticks'
            }
            onClick={stepAction}
          >
            <StepForward aria-hidden size={16} />
            Step code
          </Button>
          <Button
            variant="outline"
            data-tour="step-tick"
            disabled={!result?.status || tickTarget === cursor}
            title={
              !result
                ? 'Run a program before stepping its physics ticks'
                : !result.status
                  ? 'Legacy attempts retain action snapshots; start a new run for fixed-tick stepping'
                  : tickTarget === cursor
                    ? 'No physics ticks remain; use Step code for terminal events'
                    : 'Advance exactly one 50 ms physics tick'
            }
            onClick={() => result && selectCursor(tickTarget)}
          >
            <Footprints aria-hidden size={16} />
            Step tick
          </Button>
          <Button
            variant="outline"
            data-tour="replay"
            disabled={!result}
            title={
              result
                ? 'Replay the exact saved run; no new attempt is added'
                : 'Run the program first; Replay re-plays a recorded run'
            }
            onClick={() => {
              setCursor(0)
              setStepTarget(undefined)
              setPlaying(true)
              setNotice('Replaying the exact saved trace. No new attempt or score is added.')
            }}
          >
            <RotateCcw aria-hidden size={16} />
            Replay
          </Button>
          <label className="tool-speed" data-tour="speed">
            <Gauge aria-hidden size={16} />
            Speed
            <select
              aria-label="Simulation speed"
              value={speed}
              onChange={(event) => {
                preferredSpeed = Number(event.target.value)
                setSpeed(preferredSpeed)
              }}
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×{value === 0.25 ? ' (slow)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="tool-group" role="group" aria-label="My program">
          <Button
            variant="outline"
            data-tour="save"
            disabled={ephemeral}
            title={
              ephemeral
                ? 'Storage unavailable. Export your work to keep it.'
                : 'Save the world, code and learning stage locally'
            }
            onClick={() => {
              void saveDraft()
                .then(() =>
                  setNotice(
                    useSession.getState().ephemeral
                      ? 'Not saved. Export your current work before closing.'
                      : 'World, code and learning stage saved on this device.',
                  ),
                )
                .catch((error: unknown) =>
                  setError(error instanceof Error ? error.message : 'Draft could not be saved.'),
                )
            }}
          >
            <Save aria-hidden size={16} />
            Save
          </Button>
          <Button
            variant="outline"
            data-tour="reset-code"
            disabled={editLocked || busy}
            title={
              editLocked || busy
                ? 'Code is locked to the current run. Press Stop & Edit to change it.'
                : 'Restore the starter program; earlier attempts stay saved'
            }
            onClick={() => {
              if (
                JSON.stringify(program) === JSON.stringify(mission.starterProgram) ||
                window.confirm('Restore starter code? Previous attempts remain saved.')
              )
                changeProgram(mission.starterProgram)
            }}
          >
            <Undo2 aria-hidden size={16} />
            Reset code
          </Button>
          <Button
            variant="outline"
            data-tour="reset-sim"
            onClick={() => {
              selectCursor(0)
              setNotice(
                'Simulation reset to the initial snapshot. Saved run evidence is preserved.',
              )
            }}
          >
            <RefreshCcw aria-hidden size={16} />
            Reset simulation
          </Button>
        </div>
        <div className="tool-group" role="group" aria-label="View and help">
          <Button variant="outline" data-tour="briefing" onClick={() => setDialog('briefing')}>
            <BookOpen aria-hidden size={16} />
            Mission briefing
          </Button>
          <Button
            variant="outline"
            data-tour="help"
            onClick={() => {
              setDialog('help')
              // Opening the ladder shows hint 1, so it is recorded as help (never a penalty).
              if (!free) recordHint(`hint-${hintLevel + 1}`)
            }}
          >
            <CircleHelp aria-hidden size={16} />
            Help
          </Button>
          <Button
            variant="outline"
            data-tour="code"
            aria-pressed={showCode}
            onClick={() => setShowCode((value) => !value)}
          >
            <Code aria-hidden size={16} />
            {showCode ? 'Hide code' : 'Show code'}
          </Button>
          <Button
            variant="outline"
            data-tour="trace"
            aria-pressed={showTrace}
            onClick={() => setShowTrace((value) => !value)}
          >
            <ListTree aria-hidden size={16} />
            {showTrace ? 'Hide trace' : 'Show trace'}
          </Button>
          <Button
            variant="outline"
            data-tour="layout"
            onClick={() => {
              setLeftWidth(29)
              setRightWidth(25)
              setShowCode(true)
              setShowTrace(true)
            }}
          >
            <LayoutGrid aria-hidden size={16} />
            Reset layout
          </Button>
          <Button variant="outline" data-tour="shortcuts" onClick={() => setDialog('shortcuts')}>
            <Keyboard aria-hidden size={16} />
            Keyboard shortcuts
          </Button>
          <Button variant="outline" data-tour="tour" onClick={() => setTouring(true)}>
            <Sparkles aria-hidden size={16} />
            Button tour
          </Button>
        </div>
        {/* Disabled buttons cannot show hover tooltips, so say why they are unavailable. */}
        <p className="toolbar-hint" data-testid="toolbar-hint">
          {!result
            ? 'Step, Rewind and Replay unlock after you run the program.'
            : editLocked
              ? 'Code and world are locked to this run. Press Stop & Edit to change them.'
              : ''}
        </p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
          {errorNode && (
            <Button
              variant="outline"
              onClick={() => {
                setShowEditor(true)
                setFocusedNode(errorNode)
                setFocusNonce((value) => value + 1)
              }}
            >
              Go to block {errorNode}
            </Button>
          )}
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
                disabled={!programHistory.canUndo || editLocked || busy}
                title={
                  editLocked || busy
                    ? 'Code is locked to the current run. Press Stop & Edit to change it.'
                    : programHistory.canUndo
                      ? 'Undo the last applied program change'
                      : 'No applied program change to undo yet'
                }
                onClick={() => {
                  programHistory.undo()
                  reset()
                }}
              >
                Undo code
              </Button>
              <Button
                variant="outline"
                disabled={!programHistory.canRedo || editLocked || busy}
                title={
                  editLocked || busy
                    ? 'Code is locked to the current run. Press Stop & Edit to change it.'
                    : programHistory.canRedo
                      ? 'Redo the program change you undid'
                      : 'Nothing to redo'
                }
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
                  activeNodeId={focusedNode ?? result?.events[cursor - 1]?.nodeId}
                  readOnly={editLocked || busy}
                  focusNonce={focusNonce}
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
            robot={animated ?? robot}
            engineVersion={result && !result.status ? 1 : 2}
            snapshotDisabled={playing || busy}
            goals={free ? world.goals : mission.successPredicate}
            events={result?.events}
            cursor={cursor}
            sensorLabels={data.profile?.settings.sensorLabels !== false}
            onSelectObject={setSelectedObject}
            onZoneEdit={
              free && !editLocked && !busy
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
              free && !editLocked && !busy
                ? (x, y) => {
                    try {
                      changeWorld({
                        ...world,
                        spawn: { ...world.spawn, position: { xCm: x, yCm: y } },
                      })
                      setError('')
                    } catch (error) {
                      setError(error instanceof Error ? error.message : 'Robot placement rejected.')
                    }
                  }
                : undefined
            }
            onObstacleMove={
              free && !editLocked && !busy
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
              disabled={editLocked || busy}
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
                  disabled={editLocked || busy}
                  title={
                    editLocked || busy
                      ? 'Press Stop & Edit before switching to another world variant'
                      : 'Start a fresh attempt in this world variant'
                  }
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
                  {hasDecision && (
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
                  )}
                  {detail && !free && (
                    <details className="optional-prediction">
                      <summary>Optional: one more prediction</summary>
                      <label>
                        {detail.prompt}
                        <select
                          aria-label={detail.prompt}
                          value={detailChoice}
                          onChange={(event) => setDetailChoice(event.target.value)}
                        >
                          <option value="">No answer</option>
                          {detailOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </details>
                  )}
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
                  The robot{' '}
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
                {prediction.detail && detail && (
                  <p className="fact" data-testid="detail-result">
                    {detail.prompt} You said{' '}
                    {quote(answerLabel(detail.question, prediction.detail.answer))}; the real run:{' '}
                    {quote(
                      answerLabel(
                        detail.question,
                        observe(
                          detail.question,
                          runModel(`detail:${attemptId}`, world, program, 'NO_MISCONCEPTION'),
                        ),
                      ),
                    )}
                    .
                  </p>
                )}
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
                  <div
                    className={goalOutcome?.passed ? 'goal-passed' : 'goal-pending'}
                    data-testid="goal-outcome"
                  >
                    <p>
                      {goalOutcome?.passed
                        ? 'Mission goal met by the executed trace.'
                        : 'Mission goal not met yet.'}
                    </p>
                    <ul className="goal-facts">
                      {goalOutcome?.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </div>
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
              engineVersion={result.status ? 2 : 1}
              traceHash={data.attempts.find((item) => item.id === attemptId)?.traceHash}
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
      {result && showInvestigation && !free && !transfer && savedAttempt && (
        <Investigation
          attempt={savedAttempt}
          mission={mission}
          busy={busy}
          voluntary={correct}
          onAnswer={(probeId, choiceId) => {
            void answerProbe(probeId, choiceId)
          }}
          onHint={recordHint}
          onSkip={() => {
            setAssessmentSkipped(true)
            setNotice('Investigation skipped. Any experiment is practice, not a diagnosis.')
          }}
          onContinue={() => {
            void openExperiment()
          }}
          onBack={() => setShowInvestigation(false)}
        />
      )}
      {showExperiment && savedAttempt && diagnosis && (
        <Experiment
          attempt={savedAttempt}
          mission={free ? undefined : mission}
          state={diagnosis}
          free={free}
          onRecord={(response) => {
            void recordExperiment(response)
          }}
          onBack={() => setShowExperiment(false)}
          onTransfer={() => setShowTransfer(true)}
        />
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
              <p data-testid="transfer-advice">{transferAdvice(correct, transfer, diagnosis)}</p>
              {savedAttempt && (
                <div className="completion-checklist" data-testid="completion-checklist">
                  <h3>{mission.capstone ? 'Capstone recap' : 'Completion checklist'}</h3>
                  <ul>
                    {completionChecks(savedAttempt, mission).map((check) => (
                      <li key={check.id} className={check.met ? 'goal-passed' : 'goal-pending'}>
                        {check.met ? 'Done: ' : 'Not yet: '}
                        {check.label}
                      </li>
                    ))}
                  </ul>
                  {mission.capstone && (
                    <p className="muted">
                      Your evidence trail: {attemptObservations(savedAttempt, mission).length}{' '}
                      recorded answers, {savedAttempt.experimentResponses?.length ?? 0} experiment
                      {(savedAttempt.experimentResponses?.length ?? 0) === 1 ? '' : 's'} and the
                      trace above. Use “Review evidence” to see them in order.
                    </p>
                  )}
                </div>
              )}
              {assessmentSkipped && (
                <p className="muted">
                  Diagnostic questions were skipped, so no possible mix-up was inferred.
                </p>
              )}
              {nextUp && (
                <p className="fact" data-testid="why-next">
                  <strong>Why this next?</strong> {nextUp.reason}{' '}
                  <Link to={`/missions/${nextUp.missionId}`}>
                    Open {findMission(nextUp.missionId)?.title}
                  </Link>
                </p>
              )}
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
                  aria-expanded={reviewEvidence}
                  onClick={() => setReviewEvidence((value) => !value)}
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
                {savedAttempt && missionComplete(savedAttempt, mission) && nextMission && (
                  <Button asChild>
                    <Link to={`/missions/${nextMission.id}`}>Next mission</Link>
                  </Button>
                )}
                <Link to="/progress">View my progress</Link>
              </div>
              {reviewEvidence && savedAttempt && diagnosis && (
                <div className="evidence-timeline" data-testid="evidence-timeline">
                  <h3>Evidence timeline</h3>
                  <ol>
                    {attemptObservations(savedAttempt, free ? undefined : mission).map((o) => (
                      <li key={o.answerId}>
                        {o.source === 'mission'
                          ? 'Mission prediction'
                          : o.source === 'probe'
                            ? 'Question'
                            : o.source === 'experiment'
                              ? 'Experiment'
                              : 'New-numbers challenge'}
                        : {o.situation} · you said{' '}
                        {quote(answerLabel(o.question, o.learnerAnswer, o.labels))} · real result{' '}
                        {quote(answerLabel(o.question, o.truth, o.labels))}
                      </li>
                    ))}
                  </ol>
                  <EvidenceSummary state={diagnosis} />
                </div>
              )}
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
                // This explicit reset also works while a recorded run is locked.
                // changeWorld intentionally rejects edits in that state.
                worldHistory.set(makeDefaultWorld())
                programHistory.set(thresholdProgram())
                reset()
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
              {!free && lesson && (
                <>
                  <p data-testid="mission-narrative">{lesson.narrative}</p>
                  <p className="fact">{situation(world).text}</p>
                  <h3>Words to know</h3>
                  <dl className="vocabulary">
                    {lesson.vocabulary.map((v) => (
                      <div key={v.term}>
                        <dt>{v.term}</dt>
                        <dd>{v.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              <h3>Success conditions</h3>
              <ul>
                {mission.successPredicate.map((goal, index) => (
                  <li key={index}>{describeGoal(goal)}</li>
                ))}
              </ul>
              {!free && mission.successScenarios?.length ? (
                <>
                  <h3>The same program must also work here</h3>
                  <ul data-testid="success-scenarios">
                    {mission.successScenarios.map((scenario) => (
                      <li key={scenario.id}>
                        <strong>{scenario.label}:</strong>{' '}
                        {scenario.goals.map((goal) => describeGoal(goal)).join(' ')}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {!free && mission.capstone && (
                <p className="fact">
                  Capstone: to complete it you also write your explanation in the prediction, run at
                  least one counterexample experiment and pass a new-numbers challenge.
                </p>
              )}
              {!free && lesson && (
                <details>
                  <summary>For teachers</summary>
                  <p>{lesson.teacherNote}</p>
                  <p>Common wrong turns: {lesson.failureExamples.join(' ')}</p>
                </details>
              )}
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
              {lesson ? (
                <>
                  <p className="section-index">Hint {hintLevel + 1} of 3</p>
                  <p data-testid="hint-text">{lesson.hints[hintLevel]}</p>
                  {hintLevel === 2 && (
                    <>
                      <p className="muted">
                        A related program to compare. It is not this mission’s answer, and your
                        program is unchanged.
                      </p>
                      <pre className="code-preview">{pseudocode(lesson.hintExample)}</pre>
                    </>
                  )}
                </>
              ) : (
                <p>
                  Follow one instruction at a time. Use the actual sensor values and variable state
                  in the inspector.
                </p>
              )}
              <div className="button-row">
                <Button
                  variant="outline"
                  disabled={!lesson || hintLevel >= 2}
                  onClick={() => {
                    setHintLevel((value) => Math.min(2, value + 1))
                    recordHint(`hint-${hintLevel + 2}`)
                  }}
                >
                  Show next hint
                </Button>
                {lesson && hintLevel >= 2 && solutionStep === 'idle' && (
                  <Button variant="outline" onClick={() => setSolutionStep('confirm')}>
                    Show solution…
                  </Button>
                )}
              </div>
              {solutionStep === 'confirm' && (
                <div className="probe-practice" role="alertdialog" aria-label="Show the solution?">
                  <p>
                    Seeing the solution is okay. This attempt will be marked{' '}
                    <strong>solution-assisted</strong>, so it won’t count as independent evidence.
                    Afterwards, try a fresh new-numbers challenge to show the idea yourself.
                  </p>
                  <div className="button-row">
                    <Button
                      onClick={() => {
                        setSolutionStep('shown')
                        recordHint('show-solution')
                      }}
                    >
                      Yes, show the solution
                    </Button>
                    <Button variant="outline" onClick={() => setSolutionStep('idle')}>
                      Not now
                    </Button>
                  </div>
                </div>
              )}
              {solutionStep === 'shown' && lesson && (
                <div data-testid="solution">
                  <h3>One working solution</h3>
                  <pre className="code-preview">{pseudocode(REFERENCE_PROGRAMS[mission.id]!)}</pre>
                  <p className="muted">
                    Your program was not changed. You can rebuild this yourself in the block editor;
                    the attempt is recorded as solution-assisted.
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      {touring && <ButtonTour onClose={closeTour} />}
    </main>
  )
}
