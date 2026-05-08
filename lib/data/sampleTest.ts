import type { QuestionType, SkillType } from '@/lib/types/database'

export interface SampleQuestion {
  id: string
  section: SkillType
  question_type: QuestionType
  order_index: number
  passage_text?: string
  question_text: string
  options?: string[]
  correct_answer: string | string[]
  explanation?: string
  marks: number
}

export const SAMPLE_TEST_META = {
  id: 'sample-test-1',
  title: 'IELTS Academic Practice Test 1',
  description: 'A full-length academic IELTS practice test covering all four skills.',
  test_type: 'academic' as const,
  sections: ['reading', 'listening', 'writing', 'speaking'] as SkillType[],
  time_limit_minutes: 160,
}

const READING_PASSAGE = `The concept of emotional intelligence (EI) was first formally defined by psychologists Peter Salovey and John Mayer in 1990. They described it as the ability to perceive, use, understand, and manage emotions. However, it was Daniel Goleman's 1995 book that brought the concept to mainstream attention, arguing that EI could be more important than IQ in determining life success.

Critics of emotional intelligence argue that the concept is too vague to be measured reliably. Traditional psychometric tests require precise definitions and standardised measurements. Emotional states, they argue, are far too subjective and context-dependent to be quantified meaningfully. Furthermore, some researchers suggest that what is called emotional intelligence may simply be a combination of established personality traits and general cognitive ability.

Despite these criticisms, organisations worldwide have embraced EI as a framework for leadership and team effectiveness. Many corporations now include emotional intelligence assessments in their hiring processes, and numerous training programmes claim to develop EI competencies in employees. The business world's enthusiasm for emotional intelligence may not be grounded in rigorous science, but it reflects a widespread intuition that success in social and professional contexts requires more than raw intellectual ability.`

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  // ── READING (Questions 1–6) ────────────────────────────────────────────────
  {
    id: 'r1',
    section: 'reading',
    question_type: 'true_false_ng',
    order_index: 1,
    passage_text: READING_PASSAGE,
    question_text: 'Emotional intelligence was first defined by Daniel Goleman in 1990.',
    options: ['True', 'False', 'Not Given'],
    correct_answer: 'False',
    explanation: 'The passage states that EI was first formally defined by Salovey and Mayer in 1990. Goleman published his book in 1995.',
    marks: 1,
  },
  {
    id: 'r2',
    section: 'reading',
    question_type: 'true_false_ng',
    order_index: 2,
    passage_text: READING_PASSAGE,
    question_text: "Goleman's book helped bring emotional intelligence into mainstream awareness.",
    options: ['True', 'False', 'Not Given'],
    correct_answer: 'True',
    explanation: "The passage explicitly states that Goleman's 1995 book brought the concept to mainstream attention.",
    marks: 1,
  },
  {
    id: 'r3',
    section: 'reading',
    question_type: 'true_false_ng',
    order_index: 3,
    passage_text: READING_PASSAGE,
    question_text: 'The majority of psychologists support emotional intelligence as a valid construct.',
    options: ['True', 'False', 'Not Given'],
    correct_answer: 'Not Given',
    explanation: 'The passage mentions critics but does not specify whether the majority of psychologists support or oppose EI.',
    marks: 1,
  },
  {
    id: 'r4',
    section: 'reading',
    question_type: 'multiple_choice',
    order_index: 4,
    passage_text: READING_PASSAGE,
    question_text: 'According to critics, what is a primary problem with measuring emotional intelligence?',
    options: [
      'A) It requires too much time to administer',
      'B) Emotional states are too subjective to quantify',
      'C) It overlaps entirely with IQ measurement',
      'D) It was developed without peer review',
    ],
    correct_answer: 'B) Emotional states are too subjective to quantify',
    explanation: "Critics argue that emotional states are 'too subjective and context-dependent to be quantified meaningfully'.",
    marks: 1,
  },
  {
    id: 'r5',
    section: 'reading',
    question_type: 'fill_blank',
    order_index: 5,
    passage_text: READING_PASSAGE,
    question_text: "Complete the sentence: Some researchers suggest that emotional intelligence may simply be a combination of established personality traits and general _____ ability.",
    correct_answer: 'cognitive',
    explanation: "The passage states '...what is called emotional intelligence may simply be a combination of established personality traits and general cognitive ability.'",
    marks: 1,
  },
  {
    id: 'r6',
    section: 'reading',
    question_type: 'multiple_choice',
    order_index: 6,
    passage_text: READING_PASSAGE,
    question_text: "What does the author suggest about business enthusiasm for emotional intelligence?",
    options: [
      'A) It is fully supported by rigorous scientific evidence',
      'B) It reflects an intuition that success requires more than raw intellect',
      'C) It has been officially discredited by academics',
      'D) It is driven purely by profit motives',
    ],
    correct_answer: 'B) It reflects an intuition that success requires more than raw intellect',
    explanation: "The passage states the enthusiasm 'reflects a widespread intuition that success in social and professional contexts requires more than raw intellectual ability.'",
    marks: 1,
  },

  // ── WRITING (Questions 7–8) ────────────────────────────────────────────────
  {
    id: 'w1',
    section: 'writing',
    question_type: 'essay',
    order_index: 7,
    question_text: `**IELTS Writing Task 1**

The bar chart below shows the percentage of people who used different modes of transport to commute to work in a European city in 2000 and 2020.

*[Imagine a bar chart showing: Car: 65% → 48%, Public transport: 20% → 35%, Cycling: 8% → 12%, Walking: 7% → 5%]*

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write **at least 150 words**.`,
    correct_answer: '',
    marks: 9,
  },
  {
    id: 'w2',
    section: 'writing',
    question_type: 'essay',
    order_index: 8,
    question_text: `**IELTS Writing Task 2**

Some people believe that social media has had a predominantly negative effect on both individuals and society. Others, however, argue that it has brought significant benefits.

Discuss both views and give your own opinion.

Write **at least 250 words**.`,
    correct_answer: '',
    marks: 9,
  },

  // ── SPEAKING (Questions 9–11) ───────────────────────────────────────────────
  {
    id: 's1',
    section: 'speaking',
    question_type: 'essay',
    order_index: 9,
    question_text: `**Speaking Part 1 — Introduction and Interview**

Answer the following questions naturally, as if speaking to an examiner.

1. Where are you from originally?
2. Do you work or are you a student?
3. What do you enjoy doing in your free time?
4. How important is learning languages to you?

*Aim for natural, fluent responses of 2–4 sentences per question.*`,
    correct_answer: '',
    marks: 9,
  },
  {
    id: 's2',
    section: 'speaking',
    question_type: 'essay',
    order_index: 10,
    question_text: `**Speaking Part 2 — Individual Long Turn**

You have 1 minute to prepare and then speak for 1–2 minutes on the following topic:

**Describe a time when you helped someone.**

You should say:
- Who you helped and how you knew them
- What the situation was and what you did
- How the person reacted
- And explain how you felt afterwards`,
    correct_answer: '',
    marks: 9,
  },
  {
    id: 's3',
    section: 'speaking',
    question_type: 'essay',
    order_index: 11,
    question_text: `**Speaking Part 3 — Two-Way Discussion**

Discuss the following questions in depth, giving reasons and examples.

1. Why do you think people are willing to help strangers in some situations but not others?
2. Do you think modern society has become less community-oriented than in the past?
3. What role should governments play in encouraging people to help one another?`,
    correct_answer: '',
    marks: 9,
  },
]
