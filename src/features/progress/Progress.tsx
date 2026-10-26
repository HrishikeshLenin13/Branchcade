import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { localProfiles, useSession } from '../../app/session'
import { MISSION_CATALOG } from '../../missions/catalog'
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
import { downloadFile, exportJson, scopedData } from '../../storage/import-export'
import { AttemptReview } from './AttemptReview'
import { ProgressCharts } from './ProgressCharts'
import { conceptEvidence } from '../../learning/mastery'
import { recommend } from '../../learning/adaptive-planner'
import { conceptTitle, missionConcepts, type ConceptId } from '../../learning/concepts'
import { attemptDiagnosis } from '../../learning/investigation'
import { soloAchievements } from '../../learning/achievements'
import './local-records.css'
export default function Progress() {
  const data = useSession((s) => s.data),
    selectLearner = useSession((s) => s.selectLearner),
    createLearner = useSession((s) => s.createLearner),
    clearLearner = useSession((s) => s.clearLearner)
  const [params] = useSearchParams()
  const [selected, setSelected] = useState(params.get('attempt') ?? ''),
    [concept, setConcept] = useState(''),
    [clear, setClear] = useState(false),
    [alias, setAlias] = useState(''),
    [error, setError] = useState('')
  const profile = data.profile,
    attempts = data.attempts.filter((a) => a.learnerId === profile?.id),
    people = localProfiles(data),
    recent = [...attempts].reverse(),
    review = attempts.find((a) => a.id === selected)
  // Part G5: concept statuses and the next activity are derived from saved attempts only.
  const evidence = conceptEvidence(attempts, MISSION_CATALOG),
    started = new Set(attempts.filter((a) => a.missionId !== 'lab').map((a) => a.missionId)),
    practiced = evidence.filter((c) => c.status !== 'not_explored')
  const next = recommend(attempts, MISSION_CATALOG, profile?.completedMissions ?? [], evidence),
    recommendation = MISSION_CATALOG.find((m) => m.id === next.missionId) ?? MISSION_CATALOG[0]!
  const achievements = soloAchievements(attempts, MISSION_CATALOG)
  const conceptAttempts = (id: ConceptId) =>
    attempts.filter((a) => {
      const m = MISSION_CATALOG.find((x) => x.id === a.missionId)
      return m ? missionConcepts(m).includes(id) : false
    })
  return (
    <main className="page local-records">
      <span className="section-index">Real evidence on this device</span>
      <h1>Your learning notebook</h1>
      <section className="paper">
        <h2>Current local learner</h2>
        <p>
          This page shows only the selected pseudonym’s solo attempts. Team activity has its own
          local report.
        </p>
        <div className="toolbar">
          <label>
            Local pseudonym
            <select
              value={profile?.id ?? ''}
              disabled={!people.length}
              onChange={(e) => {
                setSelected('')
                setConcept('')
                void selectLearner(e.target.value).catch((e: unknown) =>
                  setError(e instanceof Error ? e.message : 'Could not switch learner'),
                )
              }}
            >
              {!people.length && <option value="">No learner yet</option>}
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </label>
          <label>
            New anonymous alias (optional)
            <input maxLength={32} value={alias} onChange={(e) => setAlias(e.target.value)} />
          </label>
          <Button
            onClick={() =>
              void createLearner(alias)
                .then(() => {
                  setAlias('')
                  setSelected('')
                })
                .catch((e: unknown) =>
                  setError(e instanceof Error ? e.message : 'Could not create learner'),
                )
            }
          >
            Create another anonymous learner
          </Button>
        </div>
      </section>
      {!attempts.length ? (
        <section className="paper">
          <h2>A fresh page</h2>
          <p>Your experiments will appear here after your first mission.</p>
          <Link className="text-link" to="/missions">
            Start investigating
          </Link>
        </section>
      ) : (
        <>
          <p className="lead">
            {profile?.nickname} · {started.size} missions started ·{' '}
            {profile?.completedMissions.length ?? 0} completed guided investigations ·{' '}
            {practiced.length} concepts practiced · {attempts.filter((a) => a.reassessment).length}{' '}
            transfer checks.
          </p>
          <ProgressCharts
            attempts={attempts}
            completed={profile?.completedMissions.length ?? 0}
            evidence={evidence}
          />
          <section className="paper">
            <h2>Recommended next activity</h2>
            <h3>{recommendation.title}</h3>
            <p data-testid="progress-why-next">
              <strong>Why this next?</strong> {next.reason}
            </p>
            <Button asChild>
              <Link to={`/missions/${recommendation.id}`}>Start recommended mission</Link>
            </Button>
          </section>
          <section className="paper">
            <h2>Evidence stamps</h2>
            <p className="muted">
              These describe saved work for this alias. Running a program alone earns no stamp.
              Sensor Detective follows your current evidence and can change after a new answer.
            </p>
            <ul className="evidence-stamps" data-testid="evidence-stamps">
              <li>
                <strong>First Trace · {achievements.firstTrace ? 'Recorded' : 'Not yet'}</strong>
                <p>Commit a prediction and answer a program investigation question.</p>
                {achievements.firstTrace && (
                  <Button
                    variant="outline"
                    onClick={() => setSelected(achievements.firstTrace!.attemptId)}
                  >
                    Review First Trace evidence
                  </Button>
                )}
              </li>
              <li>
                <strong>
                  Sensor Detective · {achievements.sensorDetective ? 'Supported' : 'Not yet'}
                </strong>
                <p>
                  {achievements.sensorDetective ??
                    'Needs different correct sensor predictions without help, a correct new-numbers challenge and a written reason, with no current conflicting evidence.'}
                </p>
              </li>
              {achievements.completed.map((stamp) => (
                <li key={stamp.missionId}>
                  <strong>Completed investigation · {stamp.title}</strong>
                  <p>
                    Saved goal and transfer checks satisfy this mission’s versioned completion rule.
                  </p>
                  <Button variant="outline" onClick={() => setSelected(stamp.attemptId)}>
                    Review completion evidence for {stamp.missionId.toUpperCase()}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section className="paper">
            <h2>Concept evidence</h2>
            <p className="muted">
              These are descriptive rules, not grades. Evidence of understanding needs two different
              scenarios predicted correctly without help, a correct new-numbers challenge and one
              reason in your own words. One answer never proves mastery.
            </p>
            <div className="concept-list">
              {evidence.map((c) => (
                <article
                  className="concept-row"
                  key={c.concept}
                  data-testid={`concept-${c.concept}`}
                >
                  <div>
                    <h3>{conceptTitle(c.concept)}</h3>
                    <p>
                      <strong>{c.label}</strong> · {c.attempts} attempts · {c.correctIndependent}{' '}
                      correct without help · {c.transfersCorrect} new-numbers challenge
                      {c.transfersCorrect === 1 ? '' : 's'} correct · {c.hints} hints
                    </p>
                    <p className="muted">{c.rule}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConcept(c.concept)
                      setSelected('')
                    }}
                  >
                    View evidence for {conceptTitle(c.concept).toLowerCase()}
                  </Button>
                </article>
              ))}
            </div>
          </section>
          {concept && (
            <section className="paper">
              <h2>Evidence for {conceptTitle(concept as ConceptId).toLowerCase()}</h2>
              {conceptAttempts(concept as ConceptId).map((a) => {
                const state = attemptDiagnosis(
                  a,
                  MISSION_CATALOG.find((m) => m.id === a.missionId),
                )
                const ideas = state.ranked.filter(
                  (h) =>
                    h.entry.concept === concept && (h.supports.length || h.contradictions.length),
                )
                return (
                  <div className="evidence-entry" key={a.id}>
                    <p>
                      {a.missionId} · prediction{' '}
                      {a.prediction.uncertain ? 'not sure yet' : a.prediction.action} · goal{' '}
                      {a.goalOutcome.passed ? 'met' : 'not met'} · {a.diagnosticResponses.length}{' '}
                      questions · {a.experimentResponses?.length ?? 0} experiments · transfer{' '}
                      {a.reassessment
                        ? a.reassessment.correct
                          ? 'matched'
                          : 'different'
                        : 'not attempted'}
                    </p>
                    {ideas.map((h) => (
                      <p key={h.code} className="muted">
                        {h.entry.title}: <strong>{h.label}</strong> ({h.supports.length} fitting,{' '}
                        {h.contradictions.length} not fitting answers)
                      </p>
                    ))}
                    <Button variant="outline" onClick={() => setSelected(a.id)}>
                      Review attempt {a.attemptIndex}
                    </Button>
                  </div>
                )
              })}
              {!conceptAttempts(concept as ConceptId).length && (
                <p>No local attempt has explored this concept yet.</p>
              )}
            </section>
          )}
          <div className="table-wrap">
            <table>
              <caption>Actual local attempts · {profile?.nickname}</caption>
              <thead>
                <tr>
                  <th>Investigation</th>
                  <th>Prediction</th>
                  <th>Goal met</th>
                  <th>Transfer</th>
                  <th>Recorded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {MISSION_CATALOG.find((m) => m.id === a.missionId)?.title ?? 'Free lab'}
                    </td>
                    <td>{a.prediction.uncertain ? 'Not sure yet' : a.prediction.action}</td>
                    <td>
                      {a.missionId === 'lab' ? 'Not scored' : a.goalOutcome.passed ? 'Yes' : 'No'}
                    </td>
                    <td>
                      {a.reassessment
                        ? a.reassessment.correct
                          ? 'Matches'
                          : 'Needs practice'
                        : 'Not attempted'}
                    </td>
                    <td>{new Date(a.completedAt).toLocaleString()}</td>
                    <td>
                      <Button variant="outline" onClick={() => setSelected(a.id)}>
                        Review attempt {a.attemptIndex}
                      </Button>{' '}
                      <Link
                        className="text-link"
                        to={`${a.missionId === 'lab' ? '/lab' : `/missions/${a.missionId}`}?retry=${a.id}`}
                      >
                        Retry mission
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {review && <AttemptReview key={review.id} attempt={review} />}
        </>
      )}
      <div className="button-row">
        <Button
          variant="outline"
          disabled={!profile}
          onClick={() =>
            profile &&
            downloadFile(
              'branchcade-my-progress.json',
              exportJson(scopedData(data, attempts, [profile.id])),
            )
          }
        >
          Export my progress
        </Button>
        <Button variant="outline" disabled={!profile} onClick={() => setClear(true)}>
          Clear my progress
        </Button>
        <Link className="text-link" to="/missions">
          Return to missions
        </Link>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Dialog open={clear} onOpenChange={setClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear {profile?.nickname}’s progress?</DialogTitle>
            <DialogDescription>
              This removes only this learner’s solo attempts, predictions, evidence and mission
              drafts. Other local learners, saved labs and team records remain. Export first if you
              want a copy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep my progress</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() =>
                profile &&
                void clearLearner(profile.id)
                  .then(() => {
                    setClear(false)
                    setSelected('')
                  })
                  .catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : 'Could not clear learner'),
                  )
              }
            >
              Clear this learner only
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
