import { Link } from 'react-router-dom'
import { useSession } from '../../app/session'
export default function Progress() {
  const data = useSession((s) => s.data),
    profile = data.profile
  return (
    <main className="page">
      <span className="section-index">Real evidence on this device</span>
      <h1>Your learning notebook</h1>
      {!data.attempts.length ? (
        <section className="paper">
          <h2>A fresh page</h2>
          <p>No runs have been recorded. Start an investigation and make your first prediction.</p>
          <Link className="text-link" to="/start">
            Start investigating
          </Link>
        </section>
      ) : (
        <>
          <p>
            {profile?.nickname ?? 'Local learner'} · {data.attempts.length} actual runs ·{' '}
            {profile?.completedMissions.length ?? 0} completed guided investigations
          </p>
          <div className="paper">
            <h2>Concept evidence</h2>
            {profile?.conceptProgress.length ? (
              profile.conceptProgress.map((p) => (
                <p key={p.concept}>
                  {p.concept}: {p.status.replace('_', ' ')}. {p.independentSuccesses} distinct
                  independent transfer scenarios.
                </p>
              ))
            ) : (
              <p>Complete a transfer question to begin collecting concept evidence.</p>
            )}
            <p className="muted">
              A correct run or a single right answer does not prove mastery. Repeating the same
              scenario is not new independent evidence.
            </p>
          </div>
          <div className="table-wrap">
            <table>
              <caption>Actual local attempts</caption>
              <thead>
                <tr>
                  <th>Investigation</th>
                  <th>Prediction</th>
                  <th>Goal met</th>
                  <th>Transfer</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {data.attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.missionId === 'm01' ? 'The 20 cm question' : 'Free lab'}</td>
                    <td>{a.prediction.action}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link className="text-link" to="/missions/m01">
            Resume the latest guided investigation
          </Link>
        </>
      )}
    </main>
  )
}
