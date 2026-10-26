import { CircleCheck, CircleDashed, Info } from 'lucide-react'
import type { Goal } from '../../domain/types'
import { factView } from '../../missions/goal-display'
import './goal-facts.css'

/** The mission goal checklist: a check for each goal met, a dashed circle for "not yet". */
export function GoalFacts({ facts, goals }: { facts: readonly string[]; goals: readonly Goal[] }) {
  return (
    <ul className="goal-facts">
      {facts.map((fact) => {
        const view = factView(fact, goals)
        const Icon =
          view.status === 'met' ? CircleCheck : view.status === 'not-met' ? CircleDashed : Info
        return (
          <li key={fact} className={`goal-fact goal-fact-${view.status}`} data-fact={fact}>
            <Icon aria-hidden size={18} />
            <span>
              {view.status !== 'note' && (
                <span className="sr-only">{view.status === 'met' ? 'Done: ' : 'Not yet: '}</span>
              )}
              {view.text}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
