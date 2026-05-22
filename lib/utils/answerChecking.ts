export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const normalize = (str: string) => str
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')

  const user = normalize(userAnswer)
  const correct = normalize(correctAnswer)

  if (user === correct) return true

  // Support alternative answers separated by //
  const alternatives = correctAnswer.split('//').map(normalize)
  if (alternatives.some(alt => user === alt)) return true

  // Accept if user's answer contains all words from the correct answer
  // e.g. "the road system" matches correct "road system"
  if (correct.split(' ').every(word => user.includes(word))) return true

  return false
}
