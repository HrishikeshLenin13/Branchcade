/** Kid-facing wording must come from the saved facts without changing them. */
import { describe, expect, it } from 'vitest'
import { findMission } from '../src/missions/catalog'
import { factView } from '../src/missions/goal-display'
import { describeGoal } from '../src/missions/goals'
import { execute } from '../src/interpreter/interpreter'
import { plainEvent } from '../src/features/inspector/event-words'

describe('goal checklist wording', () => {
  const m01 = findMission('m01')!
  it('describes a saved goal fact with the authored goal', () => {
    expect(factView('Goal 1 (branch): met', m01.successPredicate)).toEqual({
      status: 'met',
      text: describeGoal(m01.successPredicate[0]!),
    })
    expect(factView('Goal 1 (branch): not met', m01.successPredicate).status).toBe('not-met')
  })
  it('falls back to a generic sentence when an older attempt lists a different goal', () => {
    expect(factView('Goal 1 (reach): met', m01.successPredicate).text).toBe(
      'The robot reached the target spot.',
    )
  })
  it('turns scenario facts into plain sentences and keeps other notes as written', () => {
    expect(factView('Scenario “wall 12 cm away”: met', []).text).toBe(
      'It also works when: wall 12 cm away.',
    )
    expect(factView('Scenario “wall 20 cm away”: not met (1 goal missed)', [])).toEqual({
      status: 'not-met',
      text: 'Not working yet when: wall 20 cm away (1 goal missed).',
    })
    expect(factView('Concept check: the robot got there', [])).toEqual({
      status: 'note',
      text: 'Concept check: the robot got there',
    })
  })
})

describe('trace wording', () => {
  it('gives every recorded event of a real run a plain sentence', () => {
    const m01 = findMission('m01')!
    const events = execute(m01.world, m01.starterProgram).events
    const words = events.map(plainEvent)
    expect(words[0]).toBe('The robot read its distance: 24 cm.')
    expect(words).toContain('The program made a decision: it chose the “else” part.')
    expect(words.every((w) => w.length > 0)).toBe(true)
  })
})
