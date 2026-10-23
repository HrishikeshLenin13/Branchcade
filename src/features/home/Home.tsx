import { Link } from 'react-router-dom'
import { ArrowUpRight, MoveRight, ScanLine, ShieldCheck } from 'lucide-react'
import { COPY } from '../../domain/constants'
import { Button } from '../../components/ui/button'
import { Stage } from '../../components/illustration/Stage'
import { makeWorld } from '../../engine/world'
import { initialRobot } from '../../engine/robot'
const world = makeWorld()
export default function Home() {
  return (
    <main className="home page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="lab-label">
            <ScanLine size={18} /> A robotics learning lab
          </div>
          <h1>{COPY.tagline}</h1>
          <p className="hero-description">
            Don’t just tell the robot what to do.
            <br />
            Understand <em>why</em> it does it.
          </p>
          <p className="muted">
            Predict a move. Follow the real sensor reading. Change one thing and make the connection
            yourself.
          </p>
          <div className="button-row">
            <Button size="lg" asChild>
              <Link to="/start">
                Enter the lab <MoveRight size={18} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="privacy-note">
            <ShieldCheck size={15} /> No account. No tracking. Just your curiosity.
          </p>
        </div>
        <div className="hero-instrument">
          <div className="instrument-title">
            <span>Inside the lab</span>
            <span className="mono">Distance sensor / 01</span>
          </div>
          <Stage world={world} robot={initialRobot(world)} />
          <div className="question-strip">
            <div>
              <span className="muted">The sensor reads 24 cm.</span>
              <strong>Will the robot move or stop?</strong>
            </div>
            <code>if distance &lt; 20</code>
          </div>
          <p className="instrument-caption">
            A real question. An inspectable program. No mystery answers.
          </p>
        </div>
      </section>
      <section className="home-bottom">
        <div>
          <span className="section-index">Your first investigation</span>
          <h2>The 20 cm question</h2>
          <p>One sensor, two branches, and a result you can explain.</p>
          <Link className="text-link" to="/missions/m01">
            Open the guided mission <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="learning-strip">
          <h2>Think it. Test it. Understand it.</h2>
          <p>Observe → Predict → Execute → Compare → Investigate → Experiment → Reassess</p>
          <p className="muted">Your first wrong answer is a starting point, never a label.</p>
        </div>
      </section>
    </main>
  )
}
