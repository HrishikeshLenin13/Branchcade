import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useSession } from '../../app/session'

const adjectives = ['Curious', 'Clever', 'Brave', 'Bright', 'Patient', 'Nimble']
const animals = ['Otter', 'Panda', 'Robin', 'Badger', 'Fox', 'Gecko']
export function friendlyAlias() {
  const random = crypto.getRandomValues(new Uint32Array(3))
  return `${adjectives[random[0]! % adjectives.length]} ${animals[random[1]! % animals.length]} ${10 + (random[2]! % 90)}`
}
export function validNickname(value: string) {
  const trimmed = value.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= 20 &&
    !/[<>]/.test(trimmed) &&
    [...trimmed].every((character) => character.charCodeAt(0) >= 32)
  )
}
type Mode = 'solo' | 'team' | 'instructor'
type Destination = 'mission' | 'lab' | 'team'
export default function Onboarding() {
  const start = useSession((s) => s.start)
  const replace = useSession((s) => s.replace)
  const profile = useSession((s) => s.data.profile)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>('solo')
  const [nickname, setNickname] = useState(() => profile?.nickname ?? friendlyAlias())
  const [destination, setDestination] = useState<Destination>('mission')
  const [tutorial, setTutorial] = useState(false)
  // Learners see the workbench button tour by default; it has its own Skip tutorial button.
  const [tour, setTour] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function advance() {
    if (step === 0) {
      setStep(1)
      return
    }
    if (!validNickname(nickname)) return
    setBusy(true)
    try {
      const learner = await start()
      await replace({
        ...useSession.getState().data,
        profile: { ...learner, nickname: nickname.trim() },
      })
      setStep(2)
    } catch {
      setError('We could not save your local nickname. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  async function finish(skip = false, target?: string) {
    if (!skip && !validNickname(nickname)) {
      setError('Use 1–20 characters without markup or control characters.')
      return
    }
    setBusy(true)
    try {
      const learner = await start()
      await replace({
        ...useSession.getState().data,
        profile: {
          ...learner,
          nickname: skip ? (profile?.nickname ?? friendlyAlias()) : nickname.trim(),
        },
      })
      navigate(
        target ??
          (mode === 'instructor'
            ? tutorial && !skip
              ? '/how-it-works'
              : '/instructor'
            : destination === 'team'
              ? '/team'
              : `${destination === 'lab' ? '/lab' : '/missions/m01'}${tour && !skip ? '?tour=1' : ''}`),
      )
    } catch {
      setError('We could not open your local profile. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page narrow onboarding">
      <span className="section-index">Your work stays on this device</span>
      <h1>
        A little curiosity.
        <br />
        No account required.
      </h1>
      <ol className="onboarding-steps" aria-label="Setup progress">
        {['Your way', 'Lab name', 'First discovery'].map((label, i) => (
          <li key={label} aria-current={step === i ? 'step' : undefined}>
            <span className="mono">0{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <section className="paper onboarding-panel" aria-labelledby="onboarding-title">
        {step === 0 && (
          <>
            <h2 id="onboarding-title">Who are you exploring as?</h2>
            <p>Pick a starting place. Every feature stays available to everyone.</p>
            <fieldset>
              <legend className="sr-only">Choose your learning mode</legend>
              {(
                [
                  ['solo', 'Learning solo', 'Follow your own predictions.'],
                  ['team', 'Learning with a team', 'Pass the computer and take turns.'],
                  ['instructor', 'I’m an instructor', 'Review activity from this browser.'],
                ] as const
              ).map(([value, label, detail]) => (
                <label
                  className="choice onboarding-choice"
                  key={value}
                  htmlFor={`mode-${value}`}
                  aria-label={label}
                >
                  <input
                    type="radio"
                    id={`mode-${value}`}
                    name="mode"
                    checked={mode === value}
                    onChange={() => {
                      setMode(value)
                      setDestination(value === 'team' ? 'team' : 'mission')
                    }}
                  />
                  <span>
                    <strong>{label}</strong>
                    <span className="muted">{detail}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}
        {step === 1 && (
          <>
            <h2 id="onboarding-title">Pick a lab name</h2>
            <p>Use a made-up nickname. Please don’t enter your real name or personal details.</p>
            <label htmlFor="lab-name">
              Your local nickname
              <input
                id="lab-name"
                type="text"
                autoComplete="off"
                value={nickname}
                maxLength={20}
                aria-invalid={!validNickname(nickname)}
                aria-describedby="name-note"
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError('')
                }}
              />
            </label>
            <p id="name-note" className="muted">
              Up to 20 characters. Saved only in this browser.
            </p>
            <Button variant="outline" onClick={() => setNickname(friendlyAlias())}>
              <RefreshCw size={16} /> Shuffle name
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 id="onboarding-title">How would you like to start?</h2>
            {mode === 'instructor' ? (
              <>
                <p>Create a local group in Team Mode or review genuine activity on this device.</p>
                <div className="button-row">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void finish(false, '/team')}
                  >
                    Create local group
                  </Button>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={tutorial}
                    onChange={(e) => setTutorial(e.target.checked)}
                  />
                  See a controls tutorial first
                </label>
              </>
            ) : (
              <fieldset>
                <legend className="sr-only">Choose your first activity</legend>
                {(
                  [
                    ['mission', 'Guided first mission'],
                    ['lab', 'Explore free lab'],
                    ['team', 'Join team on this device'],
                  ] as const
                ).map(([value, label]) => (
                  <label className="choice" key={value}>
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === value}
                      onChange={() => setDestination(value)}
                    />
                    {label}
                  </label>
                ))}
                {destination !== 'team' && (
                  <label className="checkbox tutorial-choice">
                    <input
                      type="checkbox"
                      checked={tour}
                      onChange={(e) => setTour(e.target.checked)}
                    />
                    Show me what each button does
                  </label>
                )}
              </fieldset>
            )}
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="onboarding-actions">
          <Button
            variant="ghost"
            disabled={step === 0 || busy}
            title={step === 0 ? 'This is the first setup step' : undefined}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          {step < 2 ? (
            <Button
              disabled={busy || (step === 1 && !validNickname(nickname))}
              title={
                step === 1 && !validNickname(nickname)
                  ? 'Enter a nickname using 1–20 characters without markup'
                  : undefined
              }
              onClick={() => void advance()}
            >
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void finish()}>
              {busy ? 'Opening your lab…' : 'Create my local alias & start'}{' '}
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </section>
      <div className="button-row">
        <Button variant="ghost" disabled={busy} onClick={() => void finish(true)}>
          Skip intro
        </Button>
        <p className="muted onboarding-privacy">
          No registration. You control exports and deletion in Settings. Clearing browser data can
          erase your work.
        </p>
      </div>
    </main>
  )
}
