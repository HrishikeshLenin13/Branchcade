import { Link } from 'react-router-dom'
import { ArrowUpRight, MoveRight, ScanLine, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Stage } from '../../components/illustration/Stage'
import { initialRobot } from '../../engine/robot'
import { FIRST_MISSION } from '../../missions/catalog'
import { readSensors } from '../../engine/sensors'
import { useSession } from '../../app/session'
import { draftRoute, resumableDraft } from '../missions/library-model'
const world = FIRST_MISSION.world
const robot = initialRobot(world)
const distance = readSensors(world, robot).distanceCm
export default function Home() {
  const data = useSession((s) => s.data)
  const resume = resumableDraft(data)
  return (
    <main className="home page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="lab-label">
            <ScanLine size={18} /> A robotics learning lab
          </div>
          <h1>Figure out why your robot did that.</h1>
          <p className="hero-description">
            Predict a move. Follow the evidence.
            <br />
            <em>Make the logic click.</em>
          </p>
          <p className="muted">
            A hands-on lab for curious beginners. Read the sensor, test your program, and change one
            thing to understand what happened.
          </p>
          <div className="button-row">
            <Button size="lg" asChild>
              <Link to={data.profile ? '/missions/m01' : '/start'}>
                Try a mission <MoveRight size={18} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/lab">Open the lab</Link>
            </Button>
          </div>
          {resume && (
            <Link className="text-link resume-link" to={draftRoute(resume.missionId)}>
              Continue learning <ArrowUpRight size={16} />
            </Link>
          )}
          <p className="privacy-note">
            <ShieldCheck size={15} /> No account. No tracking. Saved in this browser.
          </p>
        </div>
        <div className="hero-instrument">
          <div className="instrument-title">
            <span>One reading. One decision.</span>
            <span className="mono">Distance sensor / 01</span>
          </div>
          <Stage world={world} robot={robot} controls={false} />
          <div className="question-strip">
            <div>
              <span className="muted">
                The sensor reads {distance?.toFixed(0) ?? 'out of range'} cm.
              </span>
              <strong>Will the robot move or stop?</strong>
            </div>
            <code>{distance?.toFixed(0) ?? 'null'} cm &lt; 20 cm</code>
          </div>
          <p className="instrument-caption">
            A real centimeter world. An inspectable program. Your next discovery.
          </p>
        </div>
      </section>
      <ol className="home-flow" aria-label="How learning works">
        <li>
          <span className="mono">01 / Observe & predict</span>
          <h2>What do you think?</h2>
          <p>Look at the world and lock in your own prediction.</p>
        </li>
        <li>
          <span className="mono">02 / Run & investigate</span>
          <h2>Follow the decision.</h2>
          <p>See the exact reading, comparison, and branch the robot used.</p>
        </li>
        <li>
          <span className="mono">03 / Change & discover</span>
          <h2>Test another idea.</h2>
          <p>Change one thing, then try a fresh example.</p>
        </li>
      </ol>
      <section className="home-bottom">
        <div>
          <span className="section-index">Your first investigation</span>
          <h2>The Wall Problem</h2>
          <p>One sensor, two branches, and a result you can explain.</p>
          <Link className="text-link" to="/missions/m01">
            Open the guided mission <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="learning-strip">
          <h2>A wrong answer opens a useful question.</h2>
          <p>
            Your first answer is a starting point. We use further examples to check possible
            explanations.
          </p>
          <div className="button-row">
            <Link className="text-link" to="/how-it-works">
              How Branchcade works <ArrowUpRight size={16} />
            </Link>
            <Link className="text-link" to="/missions">
              Explore missions <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <p className="home-instructor muted">
        <Link className="text-link" to="/instructor">
          Instructor mode
        </Link>{' '}
        shows activity saved in this browser.
      </p>
    </main>
  )
}
