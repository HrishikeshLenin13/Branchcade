import { Link } from 'react-router-dom'
export default function About() {
  return (
    <main className="page narrow">
      <span className="section-index">No mystery engine</span>
      <h1>You can follow the why.</h1>
      <section className="paper">
        <h2>A sensor measures. A program acts.</h2>
        <p>
          The world uses centimeters. A ray starts at the front of the robot and measures the first
          obstacle or boundary. The program compares that reading with a threshold. Only the
          selected branch executes.
        </p>
        <p>
          At 24 cm, the comparison <code>24 &lt; 20</code> is false. In the first program, the else
          branch tells the robot to move. Every displayed explanation comes from the executed
          operands and trace.
        </p>
      </section>
      <section className="paper">
        <h2>A wrong answer is not a label.</h2>
        <p>
          The same first answer can come from different reasoning. Two follow-up probes check
          comparison direction and the idea that a sensor acts on its own. Supporting and
          contradicting observations stay visible. Scores are transparent heuristics, not
          statistical probabilities or a diagnosis.
        </p>
        <p>
          A bounded counterexample search executes candidate programs, changes one parameter and
          checks both traces. A different transfer scenario asks for another prediction before
          showing its answer. One right response is not mastery.
        </p>
      </section>
      <section className="paper">
        <h2>Why this exists</h2>
        <p>
          The creator’s experience teaching a small group of about six younger robotics students
          exposed difficulties with roles, sensor logic, conditionals and functions. Branchcade
          turns that motivation into inspectable practice. No classroom effectiveness statistics or
          invented learner outcomes are claimed.
        </p>
        <h3>Private by design</h3>
        <p>
          Random local aliases, no registration, no learner-content network calls, no advertising or
          third-party analytics. Hosting infrastructure can still log ordinary page requests.
          Exported files contain learning records; treat them with care on shared devices.
        </p>
        <h3>What this release actually includes</h3>
        <p>
          Parts A–C foundation, one guided threshold investigation, a free sensor lab with a
          restricted Blockly editor, local evidence records and 2–6-person pass-and-play. Eight
          missions and the full later-phase simulator curriculum are not yet implemented.
        </p>
        <p>
          Code, original SVGs and tests in this session are AI-assisted. Student inspection and
          competition disclosure are still required; no human testing is claimed.
        </p>
        <Link className="text-link" to="/settings">
          Manage your local data
        </Link>
      </section>
    </main>
  )
}
