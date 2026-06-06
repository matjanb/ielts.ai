export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (str: string) => str
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(a|an|the) /, '') // ignore a single leading article

  // Yes/No/Not-Given and True/False/Not-Given are the same IELTS question type,
  // so Yes ≡ True and No ≡ False. The reading UI shows YES/NO while answers are
  // often stored as True/False — canonicalise both sides so they match. Only
  // boolean answers are touched; content-word answers fall through unchanged.
  const asBool = (s: string): string | null =>
    s === 'true' || s === 'yes' ? 'true'
      : s === 'false' || s === 'no' ? 'false'
        : null

  const user = normalize(userAnswer)
  if (!user) return false
  const userBool = asBool(user)

  // Each alternative (separated by //) is a complete acceptable answer. We match
  // the whole normalized answer — not a substring/word-subset, which previously
  // accepted things like "the road was closed" for the answer "road".
  return correctAnswer
    .split('//')
    .map(normalize)
    .some(alt => {
      if (alt.length === 0) return false
      if (user === alt) return true
      const altBool = asBool(alt)
      return userBool !== null && userBool === altBool
    })
}
