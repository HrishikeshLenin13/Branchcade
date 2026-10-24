import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../app/session'
import {
  createTeam,
  submitTurn,
  contributionsReady,
  startHuddle,
  chooseHypothesis,
  pauseTeam,
  resumeTeam,
} from '../../collaboration/session'
import { rotateRoles } from '../../collaboration/rotation'
import { ROLE_NAMES, ROLE_TASKS } from '../../collaboration/roles'
import type { Prediction, TeamSession } from '../../domain/types'
import { recordPrediction } from '../../learning/predictions'
import { execute, executeRecorded } from '../../interpreter/interpreter'
import { branchFacts } from '../../interpreter/trace'
import { MISSION_CATALOG } from '../../missions/catalog'
import { judgeGoals } from '../../missions/goals'
import { stableHash } from '../../domain/invariants'
import { initialRobot } from '../../engine/robot'
import { readSensors } from '../../engine/sensors'
import { downloadFile, exportJson, scopedData } from '../../storage/import-export'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog'
import { TraceView } from '../inspector/TraceView'
import '../progress/local-records.css'
const BlocklyEditor = lazy(() => import('../lab/BlocklyEditor'))
const generatedAliases = [
  'Amber Finch',
  'Copper Fox',
  'Cedar Owl',
  'Silver Moth',
  'Maple Jay',
  'Indigo Wren',
]
export default function Team() {
  const data = useSession((s) => s.data),
    replace = useSession((s) => s.replace)
  const [aliases, setAliases] = useState(['Robot 1', 'Robot 2', 'Robot 3']),
    [name, setName] = useState('Local investigation'),
    [missionId, setMissionId] = useState('m01')
  const [handoff, setHandoff] = useState(true),
    [action, setAction] = useState<Prediction['action']>('move'),
    [contribution, setContribution] = useState(''),
    [hypothesis, setHypothesis] = useState(''),
    [switchId, setSwitchId] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState<'reset' | 'end' | 'edit' | null>(null),
    [editing, setEditing] = useState<string[]>([]),
    [skipReason, setSkipReason] = useState(''),
    [review, setReview] = useState(false),
    [cursor, setCursor] = useState(0),
    [override, setOverride] = useState(false),
    [editor, setEditor] = useState(false)
  const team = data.teams.at(-1),
    mission =
      MISSION_CATALOG.find((m) => m.id === (team?.currentMission ?? missionId)) ??
      MISSION_CATALOG[0]!
  const pending =
      team?.members.filter((m) => !team.predictions.some((p) => p.learnerId === m.learnerId)) ?? [],
    member = pending.find((m) => m.learnerId === switchId) ?? pending[0]
  const ready = team ? contributionsReady(team) : false,
    locked =
      !team && mission.prerequisiteIds.some((id) => !data.profile?.completedMissions.includes(id))
  const teamProgram = team?.program ?? mission.starterProgram
  const runResult =
    team?.phase === 'result'
      ? executeRecorded(mission.world, teamProgram, team.results.at(-1)?.engineVersion)
      : null
  const save = async (next: TeamSession) => {
    const current = useSession.getState().data
    await replace({
      ...current,
      teams: current.teams.some((t) => t.id === next.id)
        ? current.teams.map((t) => (t.id === next.id ? next : t))
        : [...current.teams, next],
    })
  }
  const perform = async (work: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The action could not complete')
    } finally {
      setBusy(false)
    }
  }
  const submit = () =>
    perform(async () => {
      if (!team || !member) return
      const p = await recordPrediction(
        member.learnerId,
        mission.world,
        teamProgram,
        action,
        3,
        contribution,
      )
      await save(submitTurn(team, p, contribution))
      setHandoff(true)
      setContribution('')
      setSwitchId('')
    })
  const run = () =>
    perform(async () => {
      if (!team || team.phase !== 'huddle' || !team.teamHypothesis || !ready)
        throw new Error('Record the team hypothesis after everyone has contributed')
      const result = execute(mission.world, teamProgram),
        goal = judgeGoals(mission.world, result, mission.successPredicate),
        recordedAt = new Date().toISOString()
      await save({
        ...team,
        status: goal.passed ? 'completed' : 'active',
        phase: 'result',
        evidenceBoard: [
          ...team.evidenceBoard,
          `Round ${team.rotationIndex + 1}: ${branchFacts(result.events)}. Actual goals ${goal.passed ? 'met' : 'not met'}.`,
        ],
        results: [
          ...team.results,
          {
            round: team.rotationIndex,
            engineVersion: 2,
            traceHash: await stableHash(result.events),
            goalPassed: goal.passed,
            recordedAt,
            world: mission.world,
            program: teamProgram,
          },
        ],
        actions: [
          ...team.actions,
          { learnerId: team.members[0]!.learnerId, kind: 'run', recordedAt },
        ],
      })
      setCursor(result.events.length)
    })
  return (
    <main className="page local-records">
      <span className="section-index">Pass-and-play / one device</span>
      <h1>
        Different roles.
        <br />
        One investigation.
      </h1>
      <p className="lead">
        Work with 2–6 local aliases. Every person makes a private prediction and records a role
        contribution before the shared run.
      </p>
      {!team ? (
        <section className="paper settings-form">
          <h2>Set up your group</h2>
          <label>
            Team name (optional)
            <input maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Number of teammates
            <select
              aria-label="Number of teammates"
              value={aliases.length}
              onChange={(e) =>
                setAliases(
                  Array.from(
                    { length: Number(e.target.value) },
                    (_, i) => aliases[i] ?? `Robot ${i + 1}`,
                  ),
                )
              }
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="roster-fields">
            {aliases.map((alias, i) => (
              <label key={i}>
                Teammate {i + 1}
                <input
                  maxLength={32}
                  value={alias}
                  onChange={(e) =>
                    setAliases(aliases.map((a, j) => (i === j ? e.target.value : a)))
                  }
                />
                <Button
                  variant="outline"
                  disabled={aliases.length <= 2}
                  onClick={() => setAliases(aliases.filter((_, j) => j !== i))}
                >
                  Remove teammate {i + 1}
                </Button>
              </label>
            ))}
          </div>
          <div className="button-row">
            <Button
              variant="outline"
              disabled={aliases.length === 6}
              title={aliases.length === 6 ? 'Maximum 6 teammates' : undefined}
              onClick={() => setAliases([...aliases, `Robot ${aliases.length + 1}`])}
            >
              + Add teammate
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setAliases(
                  aliases.map((_, i) => generatedAliases[(i + Math.floor(Date.now() / 1000)) % 6]!),
                )
              }
            >
              Shuffle aliases
            </Button>
          </div>
          <label>
            Choose team mission
            <select
              value={missionId}
              onChange={(e) => {
                setMissionId(e.target.value)
                setOverride(false)
              }}
            >
              {MISSION_CATALOG.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          {locked && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
              />
              Instructor override: this learner has not completed this mission’s prerequisites. The
              team may need extra guidance.
            </label>
          )}
          <Button
            disabled={busy || (locked && !override)}
            onClick={() => void perform(() => save(createTeam(aliases, missionId, name)))}
          >
            Create local team
          </Button>
        </section>
      ) : (
        <>
          <section className="paper">
            <div className="record-heading">
              <div>
                <h2>
                  {team.name ?? 'Local team'} · {mission.title}
                </h2>
                <p>
                  Round {team.rotationIndex + 1} · {team.status} · {team.members.length} teammates
                </p>
              </div>
              <div className="button-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(team.members.map((m) => m.alias))
                    setConfirm('edit')
                  }}
                >
                  Edit team
                </Button>
                {team.status === 'active' && (
                  <Button
                    variant="outline"
                    onClick={() => void perform(() => save(pauseTeam(team)))}
                  >
                    Pause team session
                  </Button>
                )}
                {team.status !== 'ended' && (
                  <Button variant="outline" onClick={() => setConfirm('end')}>
                    End session
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      'branchcade-team-session.json',
                      exportJson(
                        scopedData(
                          data,
                          data.attempts.filter((a) =>
                            team.members.some((m) => m.learnerId === a.learnerId),
                          ),
                          [],
                          [team.id],
                        ),
                      ),
                    )
                  }
                >
                  Export session summary
                </Button>
                <Button variant="outline" onClick={() => setConfirm('reset')}>
                  Reset team
                </Button>
              </div>
            </div>
          </section>
          {team.status === 'paused' ? (
            <section className="paper">
              <h2>Your team is paused</h2>
              <p>
                All locked predictions and contributions remain saved. Private turns resume behind
                the handoff screen.
              </p>
              <Button
                onClick={() => {
                  setHandoff(true)
                  void perform(() => save(resumeTeam(team)))
                }}
              >
                Resume session
              </Button>
            </section>
          ) : team.status === 'ended' ? (
            <section className="paper">
              <h2>Session ended</h2>
              <p>
                The recorded contributions and results remain available for export and instructor
                review. Reset this team to set up another session.
              </p>
            </section>
          ) : (
            <>
              <div className="role-grid">
                {team.members.map((m) => (
                  <section className="role-card" key={m.learnerId}>
                    <h3>{m.alias}</h3>
                    <strong>{ROLE_NAMES[m.role]}</strong>
                    <p>
                      {ROLE_TASKS[m.role]}
                      {team.members.length === 2
                        ? ' Also cross-check the other teammate’s reasoning during the huddle.'
                        : ''}
                    </p>
                    <span>
                      {team.predictions.some((p) => p.learnerId === m.learnerId)
                        ? 'Prediction and contribution locked'
                        : 'Your turn is waiting'}
                    </span>
                  </section>
                ))}
              </div>
              <section className="paper">
                <h2>Shared objective</h2>
                <p>{mission.failureExplanation}</p>
                <p>{mission.conceptGoals.join(' · ')}</p>
                <Button
                  variant="outline"
                  disabled={
                    team.predictions.length > 0 ||
                    team.phase === 'result' ||
                    team.phase === 'huddle'
                  }
                  onClick={() => setEditor(!editor)}
                >
                  Edit team program
                </Button>
                {team.predictions.length > 0 && (
                  <p className="muted">
                    The program is locked after the first private prediction. Rotate roles after the
                    result to edit a new round.
                  </p>
                )}
                {editor &&
                  !team.predictions.length &&
                  team.phase !== 'result' &&
                  team.phase !== 'huddle' && (
                    <Suspense fallback={<p role="status">Opening team code editor…</p>}>
                      <BlocklyEditor
                        program={teamProgram}
                        onProgram={(program) => {
                          void perform(() => save({ ...team, program }))
                          setEditor(false)
                        }}
                      />
                    </Suspense>
                  )}
                {data.assignments
                  .filter((a) => a.teamId === team.id)
                  .map((a) => (
                    <p key={a.id}>
                      Instructor’s next mission plan:{' '}
                      <strong>{MISSION_CATALOG.find((m) => m.id === a.missionId)?.title}</strong>.
                      The current investigation remains saved until the team resets to begin another
                      session.
                    </p>
                  ))}
                {team.phase === 'result' ? (
                  <>
                    <h3>Actual shared result</h3>
                    <p className="fact">{team.evidenceBoard.at(-1)}</p>
                    <p>Team hypothesis: {team.teamHypothesis}</p>
                    <Button variant="outline" onClick={() => setReview(!review)}>
                      Review trace
                    </Button>
                    <div className="button-row">
                      <Button
                        onClick={() => {
                          setHandoff(true)
                          setReview(false)
                          setHypothesis('')
                          void perform(() => save(rotateRoles(team)))
                        }}
                      >
                        Rotate roles & start next round
                      </Button>
                    </div>
                    <details>
                      <summary>Instructor: skip rotation</summary>
                      <label>
                        Reason for keeping the roles
                        <input
                          maxLength={300}
                          value={skipReason}
                          onChange={(e) => setSkipReason(e.target.value)}
                        />
                      </label>
                      <Button
                        variant="outline"
                        disabled={!skipReason.trim()}
                        onClick={() => {
                          setHandoff(true)
                          setReview(false)
                          void perform(() => save(rotateRoles(team, skipReason)))
                        }}
                      >
                        Skip rotation with logged reason
                      </Button>
                    </details>
                    {review && runResult && (
                      <TraceView
                        events={runResult.events}
                        cursor={cursor}
                        onCursor={setCursor}
                        engineVersion={team.results.at(-1)?.engineVersion ?? 1}
                      />
                    )}
                  </>
                ) : team.phase === 'huddle' ? (
                  <>
                    <h3>Team huddle</h3>
                    <p>
                      Compare each explanation. Choose a shared hypothesis together; individual
                      answers remain unchanged.
                    </p>
                    {team.members.map((m) => (
                      <article className="evidence-entry" key={m.learnerId}>
                        <h4>
                          {m.alias} · {ROLE_NAMES[m.role]}
                        </h4>
                        <p>
                          Individual prediction:{' '}
                          {team.predictions.find((p) => p.learnerId === m.learnerId)?.action}
                        </p>
                        <p>
                          {
                            team.contributions.find(
                              (c) => c.learnerId === m.learnerId && c.round === team.rotationIndex,
                            )?.text
                          }
                        </p>
                      </article>
                    ))}
                    <label>
                      Team hypothesis
                      <textarea
                        maxLength={500}
                        value={hypothesis || team.teamHypothesis}
                        onChange={(e) => setHypothesis(e.target.value)}
                      />
                    </label>
                    <Button
                      variant="outline"
                      disabled={!hypothesis.trim()}
                      onClick={() => void perform(() => save(chooseHypothesis(team, hypothesis)))}
                    >
                      Discuss & choose
                    </Button>
                    <Button disabled={!team.teamHypothesis || busy} onClick={() => void run()}>
                      Run the shared program
                    </Button>
                  </>
                ) : ready ? (
                  <>
                    <p>
                      Every teammate has locked a prediction and contribution. Reveal them together
                      in the huddle.
                    </p>
                    <Button onClick={() => void perform(() => save(startHuddle(team)))}>
                      Team huddle — reveal evidence
                    </Button>
                  </>
                ) : (
                  member && (
                    <>
                      {handoff ? (
                        <>
                          <p>
                            Pass the device to <strong>{member.alias}</strong>. Other predictions
                            stay hidden.
                          </p>
                          <Button onClick={() => setHandoff(false)}>
                            I’m {member.alias} — ready
                          </Button>
                          <label>
                            Switch learner
                            <select
                              value={member.learnerId}
                              onChange={(e) => {
                                setSwitchId(e.target.value)
                                setContribution('')
                              }}
                            >
                              {pending.map((m) => (
                                <option key={m.learnerId} value={m.learnerId}>
                                  {m.alias}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
                        <fieldset disabled={busy}>
                          <legend>
                            {member.alias} · {ROLE_NAMES[member.role]}
                          </legend>
                          <p>{ROLE_TASKS[member.role]}</p>
                          <p className="mono">
                            Starting reading:{' '}
                            {readSensors(mission.world, initialRobot(mission.world)).distanceCm ??
                              'out of range'}{' '}
                            cm · heading {mission.world.spawn.headingDeg}°.
                          </p>
                          <details>
                            <summary>Read the program before predicting</summary>
                            <pre className="record-code">
                              {JSON.stringify(teamProgram.body, null, 2)}
                            </pre>
                          </details>
                          <label>
                            Role contribution
                            <textarea
                              aria-label="Role contribution"
                              maxLength={500}
                              value={contribution}
                              placeholder="Record your observation or reasoning, using your role’s task."
                              onChange={(e) => setContribution(e.target.value)}
                            />
                          </label>
                          <label>
                            Individual prediction
                            <select
                              value={action}
                              onChange={(e) => setAction(e.target.value as Prediction['action'])}
                            >
                              {(['move', 'stop', 'turn', 'wait'] as const).map((a) => (
                                <option key={a}>{a}</option>
                              ))}
                            </select>
                          </label>
                          <div className="button-row">
                            <Button disabled={!contribution.trim()} onClick={() => void submit()}>
                              Hand off — lock prediction & contribution
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setContribution('')
                                setAction('move')
                              }}
                            >
                              Undo my draft
                            </Button>
                          </div>
                        </fieldset>
                      )}
                    </>
                  )
                )}
              </section>
            </>
          )}
          <section className="paper">
            <h2>Participation record</h2>
            <p className="muted">
              Counts describe recorded activity, not contribution quality or a learner’s ability.
            </p>
            {team.members.map((m) => (
              <p key={m.learnerId}>
                {m.alias}:{' '}
                {
                  new Set(
                    team.roleHistory.filter((h) => h.learnerId === m.learnerId).map((h) => h.role),
                  ).size
                }{' '}
                distinct roles ·{' '}
                {
                  team.predictionHistory.filter((p) => p.prediction.learnerId === m.learnerId)
                    .length
                }{' '}
                predictions · {team.contributions.filter((c) => c.learnerId === m.learnerId).length}{' '}
                recorded contributions.
              </p>
            ))}
            {team.rotationSkips.map((s, i) => (
              <p key={i}>
                Round {s.round + 1} kept roles: {s.reason}
              </p>
            ))}
          </section>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Link className="text-link" to="/instructor">
        Open the local instructor view
      </Link>
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === 'reset'
                ? 'Reset this team?'
                : confirm === 'end'
                  ? 'End the local session?'
                  : 'Edit team aliases?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'reset'
                ? 'This deletes the current team session and its assignment. Solo learner records and other teams remain saved. Export the session first if you need it.'
                : confirm === 'end'
                  ? 'This locks the session for review. Its recorded contributions will remain saved.'
                  : 'Aliases change only after confirmation. Every locked prediction, role and contribution remains attached to the same local learner ID.'}
            </DialogDescription>
          </DialogHeader>
          {confirm === 'edit' &&
            editing.map((alias, i) => (
              <label key={i}>
                Teammate {i + 1}
                <input
                  maxLength={32}
                  value={alias}
                  onChange={(e) =>
                    setEditing(editing.map((a, j) => (i === j ? e.target.value : a)))
                  }
                />
              </label>
            ))}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() =>
                void perform(async () => {
                  if (!team) return
                  if (confirm === 'reset') {
                    const current = useSession.getState().data
                    await replace({
                      ...current,
                      teams: current.teams.filter((t) => t.id !== team.id),
                      assignments: current.assignments.filter((a) => a.teamId !== team.id),
                    })
                  } else if (confirm === 'end') {
                    const recordedAt = new Date().toISOString()
                    await save({
                      ...team,
                      status: 'ended',
                      endedAt: recordedAt,
                      actions: [
                        ...team.actions,
                        { learnerId: team.members[0]!.learnerId, kind: 'end', recordedAt },
                      ],
                    })
                  } else {
                    if (
                      editing.some((a) => !a.trim()) ||
                      new Set(editing.map((a) => a.trim().toLowerCase())).size !== editing.length
                    )
                      throw new Error('Each teammate needs a unique non-empty alias')
                    await save({
                      ...team,
                      members: team.members.map((m, i) => ({
                        ...m,
                        alias: editing[i]!.trim()
                          .split('')
                          .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
                          .join(''),
                      })),
                    })
                  }
                  setConfirm(null)
                })
              }
            >
              Confirm {confirm === 'edit' ? 'alias changes' : confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
