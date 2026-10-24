import type { Reassessment } from '../domain/types'
import type { DiagnosisState } from './diagnosis'

/** G6 "What changed?" / next-step copy after a transfer check. It reports facts about
 * different executed examples and never claims one activity caused learning. */
export function transferAdvice(
  firstCorrect: boolean,
  transfer: Pick<Reassessment, 'correct'>,
  state: DiagnosisState | null,
) {
  const idea = state?.ranked.find(
    (h) => h.supports.length && (h.status === 'evidence_for' || h.conflicting),
  )
  const argued = idea?.contradictions.some((n) => n.answerId.includes('-transfer-'))
  const phrase = idea?.entry.learnerText
    .replace(/^You might be /, 'you might be ')
    .replace(/\.$/, '')
  if (transfer.correct && firstCorrect)
    return 'Both of your predictions matched the real robot. That is good evidence, but not proof: try another new example later to make sure the rule really sticks.'
  if (transfer.correct)
    return `Your new-numbers prediction matched the real robot${argued ? `, and that example argues against the idea that ${phrase}` : ''}. One correct answer isn’t mastery. Another fresh example will show whether the rule holds.`
  return idea
    ? `This prediction was different from the real run. ${idea.entry.correctIdea} Try “Practice this again” for a different example.`
    : 'This prediction was different from the real run. Look at the decision in the trace, then try a different example. Mistakes are how we find the rule.'
}
