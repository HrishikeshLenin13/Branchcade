/** No points without actual goal proof. Revealed practice is not independent success. */
export function learningCredit(
  goalPassed: boolean,
  predictionCorrect: boolean,
  transferCorrect: boolean,
  workedModelShown: boolean,
) {
  return goalPassed && predictionCorrect && transferCorrect && !workedModelShown
    ? 'independent-evidence'
    : 'practice'
}
