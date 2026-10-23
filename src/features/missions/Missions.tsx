import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { FIRST_MISSION } from '../../missions/catalog'
export default function Missions() {
  return (
    <main className="page">
      <span className="section-index">Investigations</span>
      <h1>
        Small programs.
        <br />
        Big “oh, I get it” moments.
      </h1>
      <p className="lead">Begin with one distance sensor and a single decision.</p>
      <Link className="mission-tile" to="/missions/m01">
        <div className="mission-number">01</div>
        <div>
          <span className="muted">Conditionals · distance sensors</span>
          <h2>{FIRST_MISSION.title}</h2>
          <p>Read 24 cm. Predict the branch. Explain the move.</p>
        </div>
        <ArrowUpRight size={24} />
      </Link>
      <p className="muted">
        Only this verified mission is available in Parts A–C. The eight-mission curriculum belongs
        to later implementation phases.
      </p>
    </main>
  )
}
