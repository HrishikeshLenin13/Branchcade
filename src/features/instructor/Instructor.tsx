import { useState } from 'react'
import { Link } from 'react-router-dom'
import { localProfiles, useSession } from '../../app/session'
import { downloadFile, exportCsv, exportJson, scopedData } from '../../storage/import-export'
import { MISSION_CATALOG } from '../../missions/catalog'
import { opaqueId } from '../../domain/invariants'
import { ROLE_NAMES } from '../../collaboration/roles'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog'
import { AttemptReview } from '../progress/AttemptReview'
import { LocalImport } from '../settings/LocalImport'
import '../progress/local-records.css'
export default function Instructor() {
  const data = useSession((s) => s.data),
    erase = useSession((s) => s.erase),
    replace = useSession((s) => s.replace)
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [learner, setLearner] = useState(''),
    [teamId, setTeamId] = useState(''),
    [concept, setConcept] = useState(''),
    [selected, setSelected] = useState(''),
    [assignment, setAssignment] = useState('m01'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [confirm, setConfirm] = useState(false),
    [typed, setTyped] = useState('')
  const people = localProfiles(data),
    selectedTeam = data.teams.find((t) => t.id === teamId)
  const roster = [
    ...people.map((p) => ({ id: p.id, alias: p.nickname })),
    ...data.teams.flatMap((t) => t.members.map((m) => ({ id: m.learnerId, alias: m.alias }))),
  ].filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
  const within = (timestamp: string) =>
    (!from || timestamp.slice(0, 10) >= from) && (!to || timestamp.slice(0, 10) <= to)
  const missionMatches = (id: string) =>
    !concept || MISSION_CATALOG.find((m) => m.id === id)?.conceptGoals.includes(concept)
  const attempts = data.attempts.filter(
    (a) =>
      within(a.completedAt) &&
      (!learner || a.learnerId === learner) &&
      (!selectedTeam || selectedTeam.members.some((m) => m.learnerId === a.learnerId)) &&
      missionMatches(a.missionId),
  )
  const teams = data.teams.filter(
    (t) =>
      (!teamId || t.id === teamId) &&
      (!learner || t.members.some((m) => m.learnerId === learner)) &&
      missionMatches(t.currentMission) &&
      ((!from && !to) ||
        t.actions.some((a) => within(a.recordedAt)) ||
        (t.createdAt && within(t.createdAt))),
  )
  const visibleIds = roster
    .filter(
      (p) =>
        (!learner || p.id === learner) &&
        (!selectedTeam || selectedTeam.members.some((m) => m.learnerId === p.id)),
    )
    .map((p) => p.id)
  const filtered = scopedData(
      data,
      attempts,
      visibleIds,
      teams.map((t) => t.id),
    ),
    chosen = attempts.find((a) => a.id === selected)
  const concepts = [...new Set(MISSION_CATALOG.flatMap((m) => m.conceptGoals))],
    actualConcepts = new Set(
      attempts.flatMap(
        (a) => MISSION_CATALOG.find((m) => m.id === a.missionId)?.conceptGoals ?? [],
      ),
    )
  const predictions = new Set([
    ...attempts.filter((a) => !a.prediction.uncertain).map((a) => a.learnerId),
    ...teams.flatMap((t) =>
      (t.predictionHistory.length ? t.predictionHistory.map((h) => h.prediction) : t.predictions)
        .filter((p) => within(p.recordedAt) && !p.uncertain)
        .map((p) => p.learnerId),
    ),
  ])
  const assign = async () => {
    if (!selectedTeam) return
    const current = useSession.getState().data
    await replace({
      ...current,
      assignments: [
        ...current.assignments.filter((a) => a.teamId !== selectedTeam.id),
        {
          id: opaqueId(),
          teamId: selectedTeam.id,
          missionId: assignment,
          assignedAt: new Date().toISOString(),
        },
      ],
    })
    setNotice('Mission added to this local team’s plan.')
  }
  const reset = () => {
    setFrom('')
    setTo('')
    setLearner('')
    setTeamId('')
    setConcept('')
    setSelected('')
    setNotice('Local report filters reset.')
  }
  return (
    <main className="page local-records">
      <span className="section-index">Local instructor view</span>
      <h1>
        Look at the evidence.
        <br />
        Not a label.
      </h1>
      <p className="lead">
        This report uses activity saved in this browser. It does not monitor other computers or a
        remote class.
      </p>
      <section className="paper">
        <h2>Choose local records</h2>
        <div className="toolbar">
          <label>
            Select team
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value)
                setLearner('')
                setSelected('')
              }}
            >
              <option value="">All local teams and solo records</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name ?? 'Local team'} · {t.members.length} aliases
                </option>
              ))}
            </select>
          </label>
          <label>
            Select learner
            <select
              value={learner}
              onChange={(e) => {
                setLearner(e.target.value)
                setSelected('')
              }}
            >
              <option value="">All selected learners</option>
              {roster
                .filter(
                  (p) => !selectedTeam || selectedTeam.members.some((m) => m.learnerId === p.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.alias}
                  </option>
                ))}
            </select>
          </label>
          <label>
            From date (UTC)
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setSelected('')
              }}
            />
          </label>
          <label>
            To date (UTC)
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setSelected('')
              }}
            />
          </label>
          <label>
            Concept filter
            <select
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value)
                setSelected('')
              }}
            >
              <option value="">All concepts</option>
              {concepts.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll('-', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        {from && to && from > to && (
          <p role="alert" className="error">
            Choose an end date on or after the start date.
          </p>
        )}
        <div className="button-row">
          <Button variant="outline" onClick={reset}>
            Reset local instructor view
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print summary
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadFile('branchcade-local-report.csv', exportCsv(filtered), 'text/csv')
            }
          >
            Export filtered CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadFile('branchcade-filtered-records.json', exportJson(filtered))}
          >
            Export filtered JSON
          </Button>
        </div>
        <p className="muted">
          Exports contain the selected learners, attempts and teams. Date and concept filters apply
          to solo attempts; included team records retain their complete history to preserve context.
        </p>
        <LocalImport label="Import local record" />
      </section>
      <section className="paper">
        <h2>Snapshot of selected records</h2>
        <div className="record-summary">
          <p>
            <strong>
              {teams.filter((t) => t.status === 'ended' || t.status === 'completed').length}
            </strong>
            team sessions completed or ended
          </p>
          <p>
            <strong>{attempts.length}</strong>actual solo practice attempts
          </p>
          <p>
            <strong>{actualConcepts.size}</strong>concepts practiced in solo attempts
          </p>
          <p>
            <strong>{predictions.size}</strong>learners with a recorded prediction
          </p>
        </div>
        <p className="muted">
          A possible difficulty is a prompt to investigate. One wrong prediction and contribution
          counts do not measure ability.
        </p>
      </section>
      {!attempts.length ? (
        <section className="paper">
          <h2>No local attempts in this view</h2>
          <p>
            Complete a guided run or change the filters. A team’s shared results appear in Team
            participation below.
          </p>
          <div className="button-row">
            <Link className="text-link" to="/missions">
              Explore missions
            </Link>
            <Link className="text-link" to="/team">
              Create a local team
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <caption>{attempts.length} recorded attempts</caption>
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Mission</th>
                  <th>Prediction / goal</th>
                  <th>Evidence</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{roster.find((p) => p.id === a.learnerId)?.alias ?? 'Local alias'}</td>
                    <td>
                      {MISSION_CATALOG.find((m) => m.id === a.missionId)?.title ?? 'Free lab'}
                    </td>
                    <td>
                      {a.prediction.uncertain ? 'Not sure yet' : a.prediction.action} /{' '}
                      {a.missionId === 'lab'
                        ? 'not scored'
                        : a.goalOutcome.passed
                          ? 'met'
                          : 'not met'}
                    </td>
                    <td>
                      {a.diagnosticResponses.length} probes,{' '}
                      {a.reassessment ? 'transfer recorded' : 'no transfer'};{' '}
                      {a.hintIds?.length ?? 0} hints
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        aria-label={`Inspect attempt ${a.attemptIndex}`}
                        onClick={() => setSelected(a.id)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {chosen && <AttemptReview key={chosen.id} attempt={chosen} />}
          <section className="paper">
            <h2>Concept breakdown by local learner</h2>
            {people
              .filter((p) => visibleIds.includes(p.id))
              .map((p) => (
                <article className="evidence-entry" key={p.id}>
                  <h3>{p.nickname}</h3>
                  {concepts
                    .filter(
                      (c) =>
                        (!concept || c === concept) &&
                        attempts.some(
                          (a) =>
                            a.learnerId === p.id &&
                            MISSION_CATALOG.find(
                              (m) => m.id === a.missionId,
                            )?.conceptGoals.includes(c),
                        ),
                    )
                    .map((c) => {
                      const progress = p.conceptProgress.find((x) => x.concept === c),
                        related = attempts.filter(
                          (a) =>
                            a.learnerId === p.id &&
                            MISSION_CATALOG.find(
                              (m) => m.id === a.missionId,
                            )?.conceptGoals.includes(c),
                        )
                      return (
                        <p key={c}>
                          {c.replaceAll('-', ' ')}: {related.length} attempts;{' '}
                          {progress?.independentSuccesses ?? 0} distinct independent transfer
                          scenarios.{' '}
                          {related.some((a) => a.reassessment?.correct === false)
                            ? 'A transfer answer needs another example.'
                            : progress?.status === 'developing'
                              ? 'Evidence of understanding across distinct scenarios.'
                              : 'Still gathering evidence.'}
                        </p>
                      )
                    })}
                  {p.evidence
                    .filter((e) => e.direction === 'supports')
                    .map((e) => (
                      <p key={e.id}>
                        Possible {e.hypothesisId.replaceAll('-', ' ')}: {e.ruleReason} (heuristic
                        weight {e.weight}; not a diagnosis).
                      </p>
                    ))}
                </article>
              ))}
          </section>
          <section className="paper">
            <h2>Challenge performance</h2>
            {MISSION_CATALOG.filter((m) => attempts.some((a) => a.missionId === m.id)).map((m) => {
              const related = attempts.filter((a) => a.missionId === m.id),
                learners = new Set(related.map((a) => a.learnerId))
              return (
                <p key={m.id}>
                  {m.title}: {related.filter((a) => a.goalOutcome.passed).length}/{related.length}{' '}
                  runs met the actual goal; {Math.max(0, related.length - learners.size)} retries;{' '}
                  {related.reduce((sum, a) => sum + (a.hintIds?.length ?? 0), 0)} recorded hint
                  requests.
                </p>
              )
            })}
          </section>
        </>
      )}
      <section className="paper">
        <h2>Team participation</h2>
        {teams.length ? (
          teams.map((t) => (
            <article className="evidence-entry" key={t.id}>
              <h3>
                {t.name ?? 'Local team'} · round {t.rotationIndex + 1} · {t.status}
              </h3>
              <p>
                {t.results.length} shared executions, {t.results.filter((r) => r.goalPassed).length}{' '}
                met the actual goal.
              </p>
              {t.members.map((m) => (
                <p key={m.learnerId}>
                  {m.alias}:{' '}
                  {
                    t.contributions.filter(
                      (c) => c.learnerId === m.learnerId && within(c.recordedAt),
                    ).length
                  }{' '}
                  contributions in date range; roles experienced:{' '}
                  {[
                    ...new Set(
                      t.roleHistory.filter((h) => h.learnerId === m.learnerId).map((h) => h.role),
                    ),
                  ]
                    .map((r) => ROLE_NAMES[r as keyof typeof ROLE_NAMES] ?? r)
                    .join(', ') || ROLE_NAMES[m.role]}
                  .
                </p>
              ))}
              <p>{t.evidenceBoard.join(' ') || 'No shared result revealed yet.'}</p>
              {t.rotationSkips.map((s, i) => (
                <p key={i}>
                  Instructor retained roles in round {s.round + 1}: {s.reason}
                </p>
              ))}
            </article>
          ))
        ) : (
          <p>No local team sessions match these filters.</p>
        )}
        <p className="muted">
          Role coverage and contribution counts describe activity. They do not judge the quality of
          participation or rank students.
        </p>
      </section>
      <section className="paper">
        <h2>Local mission plan</h2>
        <p>Choose a team in the filters to assign a mission on this device.</p>
        <label>
          Mission to assign
          <select value={assignment} onChange={(e) => setAssignment(e.target.value)}>
            {MISSION_CATALOG.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <Button
          disabled={!selectedTeam}
          onClick={() =>
            void assign().catch((e: unknown) =>
              setError(e instanceof Error ? e.message : 'Assignment failed'),
            )
          }
        >
          Assign mission for this local team
        </Button>
        {data.assignments
          .filter((a) => !teamId || a.teamId === teamId)
          .map((a) => (
            <div className="evidence-entry" key={a.id}>
              <p>
                {data.teams.find((t) => t.id === a.teamId)?.name ?? 'Local team'}:{' '}
                {MISSION_CATALOG.find((m) => m.id === a.missionId)?.title}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  const current = useSession.getState().data
                  void replace({
                    ...current,
                    assignments: current.assignments.filter((x) => x.id !== a.id),
                  }).then(() => setNotice('Assignment cleared.'))
                }}
              >
                Clear assignment
              </Button>
            </div>
          ))}
      </section>
      <Button
        variant="destructive"
        onClick={() => {
          setTyped('')
          setConfirm(true)
        }}
      >
        Delete all local learner data
      </Button>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this device’s learner data?</DialogTitle>
            <DialogDescription>
              This permanently removes every learner, attempt, team, assignment, saved lab, draft
              and preference from this browser. Export first if you need a copy. This action has no
              undo.
            </DialogDescription>
          </DialogHeader>
          <label>
            Type ERASE to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep data</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={typed !== 'ERASE'}
              onClick={() =>
                void erase()
                  .then(() => {
                    setConfirm(false)
                    reset()
                  })
                  .catch(() =>
                    setError('Deletion did not complete. Retry after closing other tabs.'),
                  )
              }
            >
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
