import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { FIRST_MISSION } from '../../missions/catalog'
import { execute } from '../../interpreter/interpreter'
import { branchFacts } from '../../interpreter/trace'
import { pseudocode } from '../../interpreter/pseudocode'
import { Stage } from '../../components/illustration/Stage'
import { initialRobot } from '../../engine/robot'
import { Button } from '../../components/ui/button'
const example = execute(FIRST_MISSION.world, FIRST_MISSION.starterProgram)
export default function About() {
  const [showTrace, setShowTrace] = useState(false)
  return (
    <main className="page about-page">
      <span className="section-index">How it works / Follow the evidence</span>
      <h1>You can follow the why.</h1>
      <p className="lead">
        A sensor reads the world. A program makes a decision. Branchcade lets you inspect both.
      </p>
      <section className="about-example">
        <div className="world-panel">
          <div className="panel-header">
            <h2>Try the 24 cm example</h2>
            <span className="mono">Centimeters, not pixels</span>
          </div>
          <Stage
            world={FIRST_MISSION.world}
            robot={initialRobot(FIRST_MISSION.world)}
            controls={false}
          />
          <pre className="code-preview">{pseudocode(FIRST_MISSION.starterProgram)}</pre>
        </div>
        <div className="about-example-copy">
          <span className="section-index">01 / Measure → compare → act</span>
          <h2>
            A sensor measures.
            <br />A program acts.
          </h2>
          <p>
            A ray begins at the robot’s front sensor origin. The first obstacle or boundary it meets
            determines the distance. Out of range means no hit within the configured range, not zero
            centimeters.
          </p>
          <p>
            The interpreter evaluates the comparison and executes only its selected branch. Changing
            a sensor reading does not command the robot by itself.
          </p>
          <p className="fact">{branchFacts(example.events)}</p>
          <div className="button-row">
            <Button asChild>
              <Link to="/lab?example=24">
                Try 24 cm example <ArrowUpRight size={16} />
              </Link>
            </Button>
            <Button
              variant="outline"
              aria-expanded={showTrace}
              aria-controls="example-trace"
              onClick={() => setShowTrace(!showTrace)}
            >
              See logic trace <ChevronDown size={15} />
            </Button>
          </div>
        </div>
      </section>
      {showTrace && (
        <section className="paper" id="example-trace">
          <h2>An actual interpreter trace</h2>
          <p>
            Executed from the visible world and program. Movement advances in fixed 50 ms simulation
            ticks.
          </p>
          <ol className="example-trace">
            {example.events.map((event) => (
              <li key={event.seq}>
                <span className="mono">
                  #{event.seq} · {event.elapsedMs} ms · {event.nodeId}
                </span>
                <p>{event.facts.join('. ')}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="explanation-grid">
        <section className="paper">
          <span className="section-index">02 / Check competing ideas</span>
          <h2>One answer can have several explanations.</h2>
          <p>
            A wrong prediction might reflect a reversed comparison, a sensor misconception, or an
            uncertain guess. Follow-up examples separate these possibilities using the learner’s
            actual answers.
          </p>
          <p>
            Evidence supports or contradicts possible explanations. These scores are transparent
            heuristics. They are not probabilities about someone’s mind.
          </p>
        </section>
        <section className="paper">
          <span className="section-index">03 / Change one thing</span>
          <h2>A useful experiment makes ideas disagree.</h2>
          <p>
            A counterexample is verified by executing both scenarios. The experiment changes one
            relevant value and compares the resulting branch and behavior.
          </p>
          <p>
            If no valid discriminating example is available, the app says so. It never invents a
            successful search.
          </p>
        </section>
        <section className="paper">
          <span className="section-index">04 / Try a fresh challenge</span>
          <h2>Understanding needs more than one example.</h2>
          <p>
            Transfer tasks use a different world or constants. A correct response is one evidence
            point. Repeating the exact same scenario does not create independent evidence.
          </p>
          <p>
            Progress describes the recorded evidence; it cannot establish that the app caused an
            improvement.
          </p>
        </section>
        <section className="paper">
          <span className="section-index">Private by design</span>
          <h2>Curiosity without registration.</h2>
          <p>
            Aliases, programs, worlds, predictions and activity stay in this browser. There are no
            ads or learner-content network calls. You decide when to export a file or erase records.
          </p>
          <Link className="text-link" to="/settings#privacy">
            View privacy approach <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <section className="about-boundaries">
        <h2>What the lab can tell you</h2>
        <p>
          Branchcade explains a virtual robot’s recorded execution and checks possible programming
          misunderstandings. It does not read minds, control physical robots, teach every robotics
          concept, or automatically prove a learner has improved.
        </p>
        <div className="button-row">
          <Button asChild>
            <Link to="/missions/m01">
              Try a learning mission <ArrowUpRight size={16} />
            </Link>
          </Button>
          <Link className="text-link" to="/settings">
            Manage your local data
          </Link>
        </div>
      </section>
    </main>
  )
}
