import type { CheckResult, Dashboard, ExerciseOut, LessonOut, VocabOut } from '../api/types'

export function ex(over: Partial<ExerciseOut> & Pick<ExerciseOut, 'id' | 'type'>): ExerciseOut {
  return {
    version: 1,
    skill: 'vocabulary',
    topic: 'greetings',
    grammar_topic: null,
    difficulty: 1,
    question: `Savol ${over.id}`,
    prompt_de: null,
    options: null,
    left: null,
    right: null,
    hint: null,
    audio_text: null,
    criteria: null,
    points: 1,
    ...over,
  }
}

export function checkResult(over: Partial<CheckResult> & Pick<CheckResult, 'exercise_id' | 'correct'>): CheckResult {
  return {
    correct_answer: null,
    explanation: 'Izoh matni.',
    hint: null,
    error_type: null,
    warning: null,
    points: over.correct ? 1 : 0,
    retry_exercise: null,
    ...over,
  }
}

export const hallo: VocabOut = {
  id: 'v-hallo',
  de: 'Hallo',
  uz: 'Salom',
  pos: 'interjection',
  article: null,
  plural: null,
  forms: null,
  example_de: 'Hallo, ich bin Anna.',
  example_uz: 'Salom, men Annaman.',
  topic: 'greetings',
  user: null,
}

export const morgen: VocabOut = {
  ...hallo,
  id: 'v-der-morgen',
  de: 'Morgen',
  uz: 'tong',
  pos: 'noun',
  article: 'der',
  plural: 'die Morgen',
  example_de: 'Guten Morgen!',
  example_uz: 'Xayrli tong!',
}

export const dashboard: Dashboard = {
  level: 'A1',
  course_percent: 35,
  lessons_completed: 25,
  lessons_total: 72,
  today_lesson: { id: 'a1-m09-l2', title: 'Uyim' },
  due_reviews: 14,
  next_recommendation: { kind: 'grammar', id: 'g-akkusativ', title: 'Akkusativ', reason: "Akkusativ mavzusida to'g'rilik 40%" },
  recent_results: [{ kind: 'final', title: '1-dars yakuniy testi', percent: 80, created_at: '2026-10-18T10:00:00Z' }],
  skills: { vocabulary: 82, grammar: 61, reading: null, listening: 70, writing: null, speaking: 55 },
  streak: 4,
  weekly_activity: [
    { day: '2026-10-14', exercises: 0, correct: 0 },
    { day: '2026-10-15', exercises: 12, correct: 10 },
    { day: '2026-10-16', exercises: 8, correct: 5 },
    { day: '2026-10-17', exercises: 0, correct: 0 },
    { day: '2026-10-18', exercises: 20, correct: 17 },
    { day: '2026-10-19', exercises: 5, correct: 5 },
    { day: '2026-10-20', exercises: 3, correct: 2 },
  ],
  words_learned: 137,
  weak_topics: [{ topic: 'restaurant', accuracy: 45, attempts: 9 }],
  weekly_goal: { target_days: 5, done_days: 3 },
}

const e01 = ex({ id: 'a1-m01-l1-e01', type: 'multiple_choice', question: 'Ertalab nima deysiz?', options: ['Guten Morgen!', 'Gute Nacht!'] })
const e03 = ex({ id: 'a1-m01-l1-e03', type: 'fill_blank', skill: 'grammar', question: "Bo'sh joyni to'ldiring: Ich ___ Anna." })
const e05 = ex({ id: 'a1-m01-l1-e05', type: 'listen_choice', skill: 'listening', question: 'Tinglang. Qachon aytiladi?', options: ['Ertalab', 'Kechqurun'], audio_text: 'Guten Abend!' })
const t01 = ex({ id: 'a1-m01-l1-t01', type: 'multiple_choice', question: 'Kechqurun do\'konda nima deysiz?', options: ['Guten Abend!', 'Tschüs!'] })
const t02 = ex({ id: 'a1-m01-l1-t02', type: 'fill_blank', question: '___ bin Lena.' })

export const lesson: LessonOut = {
  id: 'a1-m01-l1',
  version: 1,
  level: 'A1',
  module: 1,
  order: 1,
  title: 'Salomlashish va xayrlashish',
  title_de: 'Begrüßung und Abschied',
  goal: 'Dars oxirida salomlasha olasiz.',
  skill_focus: ['vocabulary', 'speaking'],
  explanation: [
    { type: 'p', text: 'Nemislar salomlashganda kunning vaqtiga e\'tibor beradi.' },
    { type: 'table', headers: ['Ibora', "O'zbekcha"], rows: [['Guten Morgen!', 'Xayrli tong!']] },
    { type: 'tip', text: '"Gute Nacht" bilan salomlashilmaydi.' },
  ],
  vocabulary: [hallo, morgen],
  review_vocabulary: [],
  grammar: [
    {
      topic_id: 'g-sein-haben',
      rule: '"Ich bin" + ism.',
      when: 'Tanishganda.',
      structure: 'Ich + bin + ism.',
      examples: [
        { de: 'Ich bin Anna.', uz: 'Men Annaman.' },
        { de: 'Ich bin Tom.', uz: 'Men Tomman.' },
        { de: 'Ich bin Lena.', uz: 'Men Lenaman.' },
      ],
      common_mistakes: [{ wrong: 'Ich Anna.', right: 'Ich bin Anna.', why: "Fe'l tushib qolmaydi." }],
      check: ['a1-m01-l1-e03'],
    },
  ],
  listening: {
    title: 'Kursdagi birinchi kun',
    lines: [
      { speaker: 'Anna', de: 'Hallo! Ich bin Anna.', uz: 'Salom! Men Annaman.' },
      { speaker: 'Tom', de: 'Hallo, Anna! Ich bin Tom.', uz: 'Salom, Anna! Men Tomman.' },
    ],
    questions: ['a1-m01-l1-e05'],
  },
  situation: {
    title: "Yangi qo'shni",
    context_uz: 'Soat 19:00. Qo\'shningiz bilan uchrashdingiz.',
    lines: [
      { speaker: 'Herr Weber', de: 'Guten Abend!', uz: 'Xayrli kech!' },
      { speaker: 'Siz', de: 'Guten Abend! Ich bin Aziz.', uz: 'Xayrli kech! Men Azizman.' },
    ],
    task_uz: 'Dialogni ovoz chiqarib o\'qing.',
  },
  exercises: [e01, e03, e05],
  final_test: [t01, t02],
  progress: { status: 'started', best_score: null, last_score: null, attempts: 0 },
}
