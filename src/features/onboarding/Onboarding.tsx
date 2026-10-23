import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { useSession } from '../../app/session'
export default function Onboarding() {
  const start = useSession((s) => s.start),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false)
  return (
    <main className="page narrow">
      <span className="section-index">Your work stays on this device</span>
      <h1>
        A little curiosity.
        <br />
        No account required.
      </h1>
      <p>
        We’ll give you a random robot alias. You can export or delete your work at any time. Please
        don’t enter a real name or personal details.
      </p>
      <section className="paper">
        <h2>Start with a prediction</h2>
        <p>
          Look at the sensor, decide what the program will do, then follow the evidence. Getting it
          wrong is part of investigating.
        </p>
        <Button
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void start()
              .then(() => navigate('/missions/m01'))
              .finally(() => setBusy(false))
          }}
        >
          {busy ? 'Opening your lab…' : 'Create my local alias & start'}
        </Button>
      </section>
      <p className="muted">
        No data leaves this browser. This first foundation release includes one complete guided
        investigation; more curriculum follows in later phases.
      </p>
    </main>
  )
}
