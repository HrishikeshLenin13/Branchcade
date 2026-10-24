import type { TeamSession } from '../../domain/types'
import { teamRoleVariety } from '../../learning/achievements'
import { ROLE_NAMES } from '../../collaboration/roles'
export function TeamReport({ team }: { team: TeamSession }) {
  const variety = teamRoleVariety(team)
  return (
    <section className="paper">
      <h2>Participation record</h2>
      <p className="muted">
        Counts describe recorded activity, not contribution quality or a learner’s ability. Team
        practice never grants individual concept mastery.
      </p>
      {team.members.map((m) => {
        const earned = variety.find((v) => v.learnerId === m.learnerId)
        return (
          <div key={m.learnerId}>
            <p>
              {m.alias}:{' '}
              {
                new Set(
                  team.roleHistory.filter((h) => h.learnerId === m.learnerId).map((h) => h.role),
                ).size
              }{' '}
              distinct assigned roles ·{' '}
              {team.predictionHistory.filter((p) => p.prediction.learnerId === m.learnerId).length}{' '}
              predictions · {team.contributions.filter((c) => c.learnerId === m.learnerId).length}{' '}
              recorded contributions.
            </p>
            {earned?.earned && (
              <p className="evidence-stamps" data-testid="team-role-variety">
                <span>Role variety observed</span>{' '}
                {earned.roles
                  .map((role) => ROLE_NAMES[role as keyof typeof ROLE_NAMES] ?? role)
                  .join(' · ')}
                . Each role has a completed round, handed-off prediction and recorded contribution.
              </p>
            )}
          </div>
        )
      })}
      {team.results.length > 0 && (
        <details>
          <summary>Preserved round results</summary>
          {team.results.map((r) => (
            <article className="evidence-entry" key={r.round}>
              <h3>
                Round {r.round + 1}: {r.goalPassed ? 'mission goals met' : 'needs another test'}
              </h3>
              <p>Group hypothesis: {r.hypothesis ?? 'Not captured in this historical format.'}</p>
              <p>
                Help before execution:{' '}
                {r.assistanceIds === undefined
                  ? 'Not captured in this historical format.'
                  : r.assistanceIds.length
                    ? r.assistanceIds
                        .map((id) => team.assistance.find((h) => h.id === id)?.kind)
                        .join(', ')
                    : 'None recorded.'}
              </p>
            </article>
          ))}
        </details>
      )}
      {team.assistance.length > 0 && (
        <details>
          <summary>Recorded shared assistance</summary>
          {team.assistance.map((h) => (
            <p key={h.id}>
              Round {h.round + 1}: {h.kind} · {h.afterPredictionIds.length} individual predictions
              already locked{h.afterRun ? ' · viewed after the run' : ''}.
            </p>
          ))}
        </details>
      )}
      {team.rotationSkips.map((s, i) => (
        <p key={i}>
          Round {s.round + 1} kept roles: {s.reason}
        </p>
      ))}
    </section>
  )
}
