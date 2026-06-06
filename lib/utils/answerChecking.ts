export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (str: string) => str
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(a|an|the) /, '') // ignore a single leading article

  const user = normalize(userAnswer)
  if (!user) return false

  // Each alternative (separated by //) is a complete acceptable answer. We match
  // the whole normalized answer — not a substring/word-subset, which previously
  // accepted things like "the road was closed" for the answer "road".
  return correctAnswer
    .split('//')
    .map(normalize)
    .some(alt => alt.length > 0 && user === alt)
}
