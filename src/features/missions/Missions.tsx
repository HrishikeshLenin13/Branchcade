import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock3, Search, SlidersHorizontal, X } from 'lucide-react'
import { recommend } from '../../learning/adaptive-planner'
import { curriculumFor } from '../../missions/curriculum'
import { MISSION_CATALOG, MISSION_META } from '../../missions/catalog'
import { useSession } from '../../app/session'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import type { Mission } from '../../domain/types'
import { CONCEPT_FILTERS, conceptLabel, missionActivity, type ConceptFilter } from './library-model'

type Sort = 'recommended' | 'order' | 'easiest' | 'recent'
export default function Missions() {
  const data = useSession((s) => s.data)
  const [search, setSearch] = useState('')
  const [concepts, setConcepts] = useState<ConceptFilter[]>([])
  const [difficulty, setDifficulty] = useState('All')
  const [sort, setSort] = useState<Sort>('recommended')
  const [preview, setPreview] = useState<Mission | null>(null)
  const [practice, setPractice] = useState(false)
  // Part G5 adaptive planner: one deterministic recommendation with its evidence-based reason.
  const learnerAttempts = data.attempts.filter((a) => a.learnerId === data.profile?.id)
  const plan = recommend(learnerAttempts, MISSION_CATALOG, data.profile?.completedMissions ?? [])
  const recommended = MISSION_CATALOG.find((m) => m.id === plan.missionId) ?? MISSION_CATALOG[0]
  const recommendedReason = recommended ? `Why this next? ${plan.reason}` : ''
  const missions = useMemo(
    () =>
      MISSION_CATALOG.filter((mission) => {
        const meta = MISSION_META[mission.id]!
        const matchesSearch =
          `${mission.title} ${mission.conceptGoals.join(' ')} ${mission.conceptGoals.map(conceptLabel).join(' ')}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        return (
          matchesSearch &&
          (!concepts.length ||
            mission.conceptGoals.some((concept) => concepts.includes(conceptLabel(concept)))) &&
          (difficulty === 'All' || meta.difficulty === difficulty)
        )
      }).sort((a, b) => {
        const order = MISSION_CATALOG.indexOf(a) - MISSION_CATALOG.indexOf(b)
        if (sort === 'recent')
          return (
            missionActivity(data, b).latestAt.localeCompare(missionActivity(data, a).latestAt) ||
            order
          )
        if (sort === 'easiest') {
          const levels = ['Foundations', 'Intermediate', 'Challenge']
          return (
            levels.indexOf(MISSION_META[a.id]!.difficulty) -
              levels.indexOf(MISSION_META[b.id]!.difficulty) || order
          )
        }
        if (sort === 'recommended')
          return Number(b.id === recommended?.id) - Number(a.id === recommended?.id) || order
        return order
      }),
    [search, concepts, difficulty, sort, data, recommended?.id],
  )
  const resetFilters = () => {
    setSearch('')
    setConcepts([])
    setDifficulty('All')
    setSort('recommended')
  }
  return (
    <main className="page mission-library">
      <span className="section-index">Investigations / Mission library</span>
      <div className="library-heading">
        <div>
          <h1>
            Small programs.
            <br />
            Big discoveries.
          </h1>
          <p className="lead">
            Learn to explain the robot’s decisions, one real experiment at a time.
          </p>
        </div>
        <div className="library-progress">
          <strong className="mono">
            {MISSION_CATALOG.filter((m) => missionActivity(data, m).completed).length}
            <span> / {MISSION_CATALOG.length}</span>
          </strong>
          <span>verified completions{data.profile ? ` · ${data.profile.nickname}` : ''}</span>
        </div>
      </div>
      {recommended && (
        <section className="recommended-banner" aria-label="Recommended next activity">
          <div>
            <span className="section-index">A good next investigation</span>
            <h2>{recommended.title}</h2>
            <p>{recommendedReason}</p>
          </div>
          <Button asChild>
            <Link to={`/missions/${recommended.id}`}>
              Continue recommended <ArrowUpRight size={16} />
            </Link>
          </Button>
        </section>
      )}
      <section className="mission-filters" aria-label="Mission filters">
        <div className="filter-topline">
          <label className="search-field" htmlFor="mission-search">
            <span>
              <Search size={16} /> Search missions
            </span>
            <div>
              <input
                id="mission-search"
                type="search"
                placeholder="Title or concept"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                >
                  <X size={17} />
                </Button>
              )}
            </div>
          </label>
          <label>
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {['All', 'Foundations', 'Intermediate', 'Challenge'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="recommended">Recommended</option>
              <option value="order">Learning order</option>
              <option value="easiest">Easiest first</option>
              <option value="recent">Recently played</option>
            </select>
          </label>
        </div>
        <fieldset className="concept-filters">
          <legend>
            <SlidersHorizontal size={15} /> Concepts{' '}
            <span className="muted">Match any selected concept</span>
          </legend>
          <div>
            {CONCEPT_FILTERS.map((concept) => (
              <button
                key={concept}
                className="filter-chip"
                aria-pressed={concepts.includes(concept)}
                onClick={() =>
                  setConcepts(
                    concepts.includes(concept)
                      ? concepts.filter((c) => c !== concept)
                      : [...concepts, concept],
                  )
                }
              >
                {concept}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="filter-footer">
          <p role="status">
            {missions.length} {missions.length === 1 ? 'mission' : 'missions'} shown
          </p>
          <Button variant="ghost" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </section>
      {missions.length ? (
        <div className="mission-grid">
          {missions.map((mission) => {
            const activity = missionActivity(data, mission)
            const meta = MISSION_META[mission.id]!
            const locked = activity.missingPrerequisites.length > 0 && !practice
            const lastAttempt = activity.attempts.at(-1)
            return (
              <article className="mission-card" key={mission.id}>
                <div className="mission-card-top">
                  <span className="mission-number">
                    {mission.id.replace(/^m/, '').padStart(2, '0')}
                  </span>
                  <span className={`status-chip ${activity.completed ? 'status-complete' : ''}`}>
                    {locked ? 'Locked' : activity.status}
                  </span>
                </div>
                <div className="mission-card-meta">
                  <span>{meta.difficulty}</span>
                  <span>
                    <Clock3 size={13} /> About {meta.estimatedMinutes} min
                  </span>
                </div>
                <h2>{mission.title}</h2>
                <p>{meta.objective}</p>
                <p className="mission-concepts">
                  {[...new Set(mission.conceptGoals.map(conceptLabel))].join(' · ')}
                </p>
                <p className="verified-outcome">{activity.verifiedOutcome}</p>
                {activity.missingPrerequisites.length > 0 && (
                  <p className="prerequisite-note">
                    Recommended first:{' '}
                    {activity.missingPrerequisites
                      .map((id) => MISSION_CATALOG.find((m) => m.id === id)?.title ?? id)
                      .join(', ')}
                    . Enable free practice below to explore early.
                  </p>
                )}
                <div className="button-row">
                  <Button
                    asChild={!locked}
                    disabled={locked}
                    title={
                      locked ? 'Complete the prerequisites or enable free practice' : undefined
                    }
                  >
                    {locked ? (
                      'Complete prerequisites'
                    ) : (
                      <Link
                        to={`/missions/${mission.id}${activity.draft && !activity.completed ? '' : '?new=1'}`}
                      >
                        {activity.completed
                          ? 'Retry'
                          : activity.draft
                            ? 'Resume'
                            : activity.missingPrerequisites.length
                              ? 'Practice mission'
                              : 'Start mission'}{' '}
                        <ArrowUpRight size={15} />
                      </Link>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setPreview(mission)}>
                    Preview
                  </Button>
                  {lastAttempt && (
                    <Link className="text-link" to={`/progress?attempt=${lastAttempt.id}`}>
                      View results
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <section className="paper empty-state">
          <h2>No missions match</h2>
          <p>Try another title or use fewer filters.</p>
          <Button onClick={resetFilters}>Clear filters</Button>
        </section>
      )}
      <label className="checkbox free-practice-toggle">
        <input type="checkbox" checked={practice} onChange={(e) => setPractice(e.target.checked)} />
        Allow free practice before prerequisites are complete
      </label>
      <p className="muted time-estimate-note">
        Times are authored estimates, not measured completion times. A goal verified in a run is
        separate from a completed learning investigation.
      </p>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>
              Read-only mission preview. Your code and attempt history stay as they are.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div>
              <p>{curriculumFor(preview.id)?.narrative}</p>
              <p>{MISSION_META[preview.id]!.objective}</p>
              <h3>You’ll practice</h3>
              <p>{curriculumFor(preview.id)?.targetConcept}</p>
              <h3>Words to know</h3>
              <p>
                {curriculumFor(preview.id)
                  ?.vocabulary.map((v) => v.term)
                  .join(' · ')}
              </p>
              <h3>Concepts</h3>
              <p>
                {preview.conceptGoals.map((concept) => concept.replaceAll('-', ' ')).join(', ')}.
              </p>
              <h3>The world</h3>
              <p>
                A {preview.world.widthCm} × {preview.world.heightCm} cm space with{' '}
                {preview.world.obstacles.length} obstacles and {preview.world.floorZones.length}{' '}
                colored zones. The robot starts facing {preview.world.spawn.headingDeg}°.
              </p>
              <p className="muted">
                Inspect the world and make your own prediction when you begin.
              </p>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Close preview
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
