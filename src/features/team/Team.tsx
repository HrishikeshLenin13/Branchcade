import { useState } from 'react'
import { useSession } from '../../app/session'
import { createTeam, addTeamPrediction } from '../../collaboration/session'
import { roundReady } from '../../collaboration/evidence-cards'
import { rotateRoles } from '../../collaboration/rotation'
import { ROLE_TASKS } from '../../collaboration/roles'
import type { TeamSession } from '../../domain/types'
import { recordPrediction } from '../../learning/predictions'
import { execute } from '../../interpreter/interpreter'
import { branchFacts } from '../../interpreter/trace'
import { FIRST_MISSION } from '../../missions/catalog'
import { judgeGoals } from '../../missions/goals'
import { Button } from '../../components/ui/button'
export default function Team() {
  const data = useSession((s) => s.data),
    replace = useSession((s) => s.replace),
    [count, setCount] = useState(3),
    [handoff, setHandoff] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const team = data.teams.at(-1),
    member = team?.members.find((m) => !team.predictions.some((p) => p.learnerId === m.learnerId)),
    ready = team ? roundReady(team) : false
  const save = async (t: TeamSession) => {
    const current = useSession.getState().data
    await replace({
      ...current,
      teams: current.teams.some((x) => x.id === t.id)
        ? current.teams.map((x) => (x.id === t.id ? t : x))
        : [...current.teams, t],
    })
  }
  const predict = async (action: 'move' | 'stop') => {
    if (!team || !member) return
    setBusy(true)
    try {
      const p = await recordPrediction(
        member.learnerId,
        FIRST_MISSION.world,
        FIRST_MISSION.starterProgram,
        action,
        3,
      )
      await save(addTeamPrediction(team, p))
      setHandoff(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setBusy(false)
    }
  }
  const run = async () => {
    if (!team || !roundReady(team)) return
    const r = execute(FIRST_MISSION.world, FIRST_MISSION.starterProgram),
      goal = judgeGoals(FIRST_MISSION.world, r, FIRST_MISSION.successPredicate)
    await save({
      ...team,
      status: goal.passed ? 'completed' : 'active',
      evidenceBoard: [
        ...team.evidenceBoard,
        `Round ${team.rotationIndex + 1}: ${branchFacts(r.events)}. Actual goals ${goal.passed ? 'met' : 'not met'}.`,
      ],
    })
  }
  return (
    <main className="page">
      <span className="section-index">Pass-and-play / one device</span>
      <h1>
        Different roles.
        <br />
        One investigation.
      </h1>
      <p className="lead">
        Work with 2–6 local aliases. Each person predicts privately before the shared run. No online
        presence, messaging, or accounts.
      </p>
      {!team ? (
        <section className="paper">
          <h2>Set up your group</h2>
          <label>
            Number of teammates
            <select
              aria-label="Number of teammates"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() =>
              void save(createTeam(Array.from({ length: count }, (_, i) => `Robot ${i + 1}`)))
            }
          >
            Create local team
          </Button>
        </section>
      ) : (
        <>
          <div className="role-grid">
            {team.members.map((m) => (
              <section className="role-card" key={m.learnerId}>
                <h2>{m.alias}</h2>
                <strong>{m.role.replaceAll('-', ' ')}</strong>
                <p>{ROLE_TASKS[m.role]}</p>
                <span>
                  {team.predictions.some((p) => p.learnerId === m.learnerId)
                    ? 'Prediction locked'
                    : 'Prediction needed'}
                </span>
              </section>
            ))}
          </div>
          <section className="paper">
            <h2>Round {team.rotationIndex + 1}: The 20 cm question</h2>
            <p className="mono">Distance = 24 cm. if distance &lt; 20: stop; else: move 10 cm.</p>
            {team.status === 'completed' ? (
              <>
                <p className="fact">{team.evidenceBoard.at(-1)}</p>
                <p>Read your role’s evidence aloud, then hand the device to the next driver.</p>
                <Button
                  onClick={() => {
                    setHandoff(true)
                    void save({ ...rotateRoles(team), status: 'active' })
                  }}
                >
                  Rotate roles & start next round
                </Button>
              </>
            ) : ready ? (
              <>
                <p>
                  Every teammate has locked a prediction. Now the driver can run the actual program.
                </p>
                <Button onClick={() => void run()}>Run the shared program</Button>
              </>
            ) : (
              member && (
                <>
                  {handoff ? (
                    <>
                      <p>
                        Pass the device to <strong>{member.alias}</strong>. Other predictions stay
                        hidden.
                      </p>
                      <Button onClick={() => setHandoff(false)}>I’m {member.alias} — ready</Button>
                    </>
                  ) : (
                    <fieldset disabled={busy}>
                      <legend>{member.alias}, what happens first?</legend>
                      <div className="button-row">
                        <Button onClick={() => void predict('move')}>Predict move</Button>
                        <Button variant="outline" onClick={() => void predict('stop')}>
                          Predict stop
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
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </main>
  )
}
