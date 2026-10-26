import type { Goal } from '../domain/types'
import { describeGoal } from './goals'

/** A saved goal fact turned into a plain sentence for learners. The saved text itself
 * ("Goal 3 (programmed-stop): met") is unchanged; this only decides how it is shown. */
export interface FactView {
  status: 'met' | 'not-met' | 'note'
  text: string
}

const KIND_LABEL: Record<string, string> = {
  branch: 'The program chose the expected branch.',
  distance: 'The robot drove far enough.',
  reach: 'The robot reached the target spot.',
  stopped: 'The robot finished stopped.',
  event: 'The program used the needed block.',
  'color-stop': 'The robot stopped on the right floor color.',
  heading: 'The robot finished facing the right way.',
  'programmed-stop': 'End with a stop block, not by bumping into something.',
  'final-distance': 'The robot finished the right distance from the wall.',
  path: 'The robot followed the path in order.',
  'color-stop-within': 'The robot stopped quickly on the right floor color.',
}

export function factView(fact: string, goals: readonly Goal[]): FactView {
  const goal = /^Goal (\d+) \(([^)]+)\): (met|not met)$/.exec(fact)
  if (goal) {
    const authored = goals[Number(goal[1]) - 1]
    return {
      status: goal[3] === 'met' ? 'met' : 'not-met',
      // An attempt from an older mission version may list different goals.
      text:
        authored && authored.kind === goal[2]
          ? describeGoal(authored)
          : (KIND_LABEL[goal[2]!] ?? `Goal ${goal[1]}.`),
    }
  }
  const scenario = /^Scenario “(.+)”: (met|not met)(?: \((.+)\))?$/.exec(fact)
  if (scenario)
    return scenario[2] === 'met'
      ? { status: 'met', text: `It also works when: ${scenario[1]}.` }
      : {
          status: 'not-met',
          text: `Not working yet when: ${scenario[1]}${scenario[3] ? ` (${scenario[3]})` : ''}.`,
        }
  return { status: 'note', text: fact }
}
