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
  const concepts = [...new Set(MISSION_CATALOG.flatMap((m) => m.conceptGoals))],
    started = new Set(attempts.filter((a) => a.missionId !== 'lab').map((a) => a.missionId)),
    practiced = new Set(
      attempts.flatMap(
        (a) => MISSION_CATALOG.find((m) => m.id === a.missionId)?.conceptGoals ?? [],
      ),
    )
  const recommendation =
    MISSION_CATALOG.find((m) =>
      attempts.some((a) => a.missionId === m.id && a.reassessment?.correct === false),
    ) ??
    MISSION_CATALOG.find(
      (m) =>
        !profile?.completedMissions.includes(m.id) &&
        m.prerequisiteIds.every((id) => profile?.completedMissions.includes(id)),
    ) ??
    MISSION_CATALOG[0]!
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
            {practiced.size} concepts practiced · {attempts.filter((a) => a.reassessment).length}{' '}
            transfer checks.
          </p>
          <section className="paper">
            <h2>Recommended next activity</h2>
            <h3>{recommendation.title}</h3>
            <p>
              {attempts.some(
                (a) => a.missionId === recommendation.id && a.reassessment?.correct === false,
              )
                ? 'A transfer prediction differed from execution. A fresh example can help you test that rule again.'
                : 'This is the next unfinished investigation with its prerequisites complete.'}
            </p>
            <Button asChild>
              <Link to={`/missions/${recommendation.id}`}>Start recommended mission</Link>
            </Button>
          </section>
          <section className="paper">
            <h2>Concept evidence</h2>
            <p className="muted">
              These are descriptive heuristics. Two distinct correct independent transfer scenarios
              provide evidence of understanding; one answer never proves mastery.
            </p>
            <div className="concept-list">
              {concepts.map((id) => {
                const progress = profile?.conceptProgress.find((p) => p.concept === id),
                  related = attempts.filter((a) =>
                    MISSION_CATALOG.find((m) => m.id === a.missionId)?.conceptGoals.includes(id),
                  ),
                  needs = related.some((a) => a.reassessment?.correct === false),
                  label = needs
                    ? 'Needs another example'
                    : progress?.status === 'developing'
                      ? 'Evidence of understanding'
                      : related.length
                        ? 'Working on it'
                        : 'Not explored'
                return (
                  <article className="concept-row" key={id}>
                    <div>
                      <h3>{id.replaceAll('-', ' ')}</h3>
                      <p title="Independent successes count distinct transfer world hashes, not repeated answers.">
                        {label} · {related.length} attempts · {progress?.independentSuccesses ?? 0}{' '}
                        distinct independent transfer scenarios
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConcept(id)
                        setSelected('')
                      }}
                    >
                      View evidence for {id.replaceAll('-', ' ')}
                    </Button>
                  </article>
                )
              })}
            </div>
          </section>
          {concept && (
            <section className="paper">
              <h2>Evidence for {concept.replaceAll('-', ' ')}</h2>
              {attempts
                .filter((a) =>
                  MISSION_CATALOG.find((m) => m.id === a.missionId)?.conceptGoals.includes(concept),
                )
                .map((a) => (
                  <div className="evidence-entry" key={a.id}>
                    <p>
                      {a.missionId} · prediction{' '}
                      {a.prediction.uncertain ? 'not sure yet' : a.prediction.action} · goal{' '}
                      {a.goalOutcome.passed ? 'met' : 'not met'} · {a.diagnosticResponses.length}{' '}
                      probes · transfer{' '}
                      {a.reassessment
                        ? a.reassessment.correct
                          ? 'matched'
                          : 'different'
                        : 'not attempted'}
                    </p>
                    <Button variant="outline" onClick={() => setSelected(a.id)}>
                      Review attempt {a.attemptIndex}
                    </Button>
                  </div>
                ))}
              {!attempts.some((a) =>
                MISSION_CATALOG.find((m) => m.id === a.missionId)?.conceptGoals.includes(concept),
              ) && <p>No local attempt has explored this concept yet.</p>}
              {profile?.evidence
                .filter((e) => e.hypothesisId.includes(concept))
                .map((e) => (
                  <p key={e.id}>
                    {e.ruleReason} ({e.direction}; heuristic weight {e.weight})
                  </p>
                ))}
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
