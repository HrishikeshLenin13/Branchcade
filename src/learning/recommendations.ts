export function recommendation(correctPrediction: boolean, correctTransfer: boolean) {
  return correctPrediction && correctTransfer
    ? 'Try a new distance and explain the selected branch. This is evidence of understanding, not proof of mastery.'
    : 'Inspect the actual operands, change one parameter, then try a different transfer problem.'
}
