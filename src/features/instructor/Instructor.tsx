import { useState } from 'react'
import { useSession } from '../../app/session'
import { downloadFile, exportCsv } from '../../storage/import-export'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog'
import { execute } from '../../interpreter/interpreter'
import { branchFacts } from '../../interpreter/trace'
export default function Instructor() {
  const data = useSession((s) => s.data),
    erase = useSession((s) => s.erase),
    [from, setFrom] = useState(''),
    [selected, setSelected] = useState(''),
    [error, setError] = useState('')
  const attempts = data.attempts.filter((a) => !from || a.completedAt.slice(0, 10) >= from),
    a = attempts.find((a) => a.id === selected)
  return (
    <main className="page">
      <span className="section-index">Local instructor view</span>
      <h1>
        Look at the evidence.
        <br />
        Not a label.
      </h1>
      <p className="lead">
        These are actual attempts from this browser, not an online classroom. No child accounts or
        identities are required.
      </p>
      <div className="toolbar">
        <label>
          From date (UTC)
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <Button
          variant="outline"
          onClick={() =>
            downloadFile(
              'branchcade-local-report.csv',
              exportCsv({ ...data, attempts }),
              'text/csv',
            )
          }
        >
          Export filtered CSV
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Delete all local learner data</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this device’s learner data?</DialogTitle>
              <DialogDescription>
                This removes the alias, attempts, team sessions and preferences from this browser.
                Export first if you need a copy. This action has no undo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Keep data</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() =>
                    void erase().catch(() =>
                      setError('Deletion did not complete. Retry after closing other tabs.'),
                    )
                  }
                >
                  Permanently delete
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {error && <p role="alert">{error}</p>}
      {!attempts.length ? (
        <section className="paper">
          <h2>No local attempts in this view</h2>
          <p>
            Complete a guided run or change the date filter. No sample learner results are
            displayed.
          </p>
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
                    <td>
                      {data.profile?.id === a.learnerId ? data.profile.nickname : 'Local alias'}
                    </td>
                    <td>{a.missionId}</td>
                    <td>
                      {a.prediction.action} /{' '}
                      {a.missionId === 'lab'
                        ? 'not scored'
                        : a.goalOutcome.passed
                          ? 'met'
                          : 'not met'}
                    </td>
                    <td>
                      {a.diagnosticResponses.length} probes,{' '}
                      {a.reassessment ? 'transfer recorded' : 'no transfer'}
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
          {a && (
            <section className="paper">
              <h2>Attempt {a.attemptIndex}: actual trace</h2>
              <p className="fact">{branchFacts(execute(a.world, a.program).events)}</p>
              <p>{a.goalOutcome.facts.join('. ')}</p>
              <p>
                Comparison questions:{' '}
                {a.diagnosticResponses.map((r) => `${r.probeId}: ${r.choiceId}`).join('; ') ||
                  'No diagnostic probes answered'}
              </p>
              <p className="mono">Trace SHA-256: {a.traceHash}</p>
            </section>
          )}
        </>
      )}
      <section className="paper">
        <h2>Team evidence</h2>
        {data.teams.length ? (
          data.teams.map((t) => (
            <div key={t.id}>
              <h3>
                {t.members.length} local aliases · rotation {t.rotationIndex + 1}
              </h3>
              <p>
                {t.evidenceBoard.join(' ') ||
                  'Predictions are still being collected. No shared result revealed.'}
              </p>
            </div>
          ))
        ) : (
          <p>No local team sessions yet.</p>
        )}
      </section>
    </main>
  )
}
