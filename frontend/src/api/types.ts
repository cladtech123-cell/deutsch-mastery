// Mirrors PROJECT_PLAN.md §5/§6. Keep in sync with backend/app/schemas.

export type Level = 'A1' | 'A2'
export type Skill = 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking'
export type ErrorType =
  | 'vocabulary' | 'article' | 'case' | 'conjugation' | 'word_order' | 'spelling'
  | 'plural' | 'comprehension' | 'preposition' | 'tense' | 'other'

export type ChoiceType =
  | 'multiple_choice' | 'situation_choice' | 'next_line' | 'reading' | 'listen_choice' | 'article' | 'find_error'
export type TextType = 'fill_blank' | 'conjugate' | 'plural' | 'translate_de_uz' | 'translate_uz_de' | 'dictation'
export type OpenType = 'short_text' | 'speak'
export type ExerciseType = ChoiceType | TextType | OpenType | 'match' | 'order_words'

/** Answer shapes (§5): choice/text/open → string, order_words → list[str], match → {de: uz}. */
export type Answer = string | string[] | Record<string, string>

export interface ExerciseOut {
  id: string
  version: number
  type: ExerciseType
  skill: Skill
  topic: string
  grammar_topic: string | null
  difficulty: number
  question: string
  prompt_de: string | null
  options: string[] | null
  left: string[] | null
  right: string[] | null
  hint: string | null
  audio_text: string | null
  criteria: { min_words: number; required_words: string[] } | null
  points: number
}

export interface CriterionCheck {
  name: string
  ok: boolean
  message: string
}

export interface CheckResult {
  exercise_id: string
  correct: boolean
  correct_answer: string | Record<string, string> | null
  explanation: string
  hint: string | null
  error_type: ErrorType | null
  warning: string | null
  points: number
  retry_exercise: ExerciseOut | null
  /** Open types (short_text/speak) — §5 "natija checks ro'yxati". */
  checks?: CriterionCheck[] | null
}

// --- auth / settings ---
export interface UserOut {
  id: string
  email: string
  display_name: string
  is_demo: boolean
}

export type Goal = 'daily' | 'living' | 'study' | 'ausbildung' | 'work' | 'general'
export type DailyMinutes = 15 | 30 | 45 | 60

export interface Settings {
  current_level: Level
  start_module: number
  daily_minutes: DailyMinutes
  goal: Goal
  weekly_goal_days: number
  reminders_enabled: boolean
  new_per_day: number
  onboarding_done: boolean
}

// --- vocabulary ---
export type CardState = 'new' | 'learning' | 'review' | 'mastered'

export interface VocabUser {
  saved: boolean
  state: CardState
  due_at: string | null
  correct_count: number
  wrong_count: number
}

export interface VocabOut {
  id: string
  de: string
  uz: string
  pos: string
  article: 'der' | 'die' | 'das' | null
  plural: string | null
  forms: Record<string, string> | null
  example_de: string
  example_uz: string
  topic: string
  level?: Level
  user?: VocabUser | null
}

export interface VocabularyList {
  items: VocabOut[]
  topics: string[]
}

// --- curriculum / lessons ---
export interface CurriculumLesson {
  id: string
  order: number
  title: string
  status: 'started' | 'completed' | 'not_started' | null
  best_score: number | null
}
export interface CurriculumModule {
  id: string
  number: number
  title: string
  title_de: string
  goals: string[]
  percent: number
  lessons: CurriculumLesson[]
}
export interface Curriculum {
  levels: { code: Level; title: string; modules: CurriculumModule[] }[]
}

export interface Block {
  type: 'p' | 'table' | 'tip'
  text?: string | null
  headers?: string[] | null
  rows?: string[][] | null
}
export interface Example {
  de: string
  uz: string
}
export interface Mistake {
  wrong: string
  right: string
  why: string
}
export interface Line {
  speaker: string
  de: string
  uz: string
}
/** Refs may come back as ids (per §5) or already expanded; the UI accepts both. */
export type ExerciseRef = string | ExerciseOut

export interface LessonGrammar {
  topic_id: string
  rule: string
  when: string
  structure: string
  examples: Example[]
  common_mistakes: Mistake[]
  check: ExerciseRef[]
}

export interface LessonProgress {
  status: 'started' | 'completed'
  best_score: number | null
  last_score: number | null
  attempts: number
}

export interface LessonOut {
  id: string
  version: number
  level: Level
  module: number
  order: number
  title: string
  title_de: string
  goal: string
  skill_focus: Skill[]
  explanation: Block[]
  vocabulary: VocabOut[]
  review_vocabulary: (string | VocabOut)[]
  grammar: LessonGrammar[]
  listening: { title: string; lines: Line[]; questions: ExerciseRef[] }
  situation: { title: string; context_uz: string; lines: Line[]; task_uz: string }
  exercises: ExerciseOut[]
  final_test: ExerciseOut[]
  progress: LessonProgress | null
}

export interface FinalResult {
  score: number
  total: number
  percent: number
  passed: boolean
  results: CheckResult[]
}

export interface PracticeOut {
  exercises: ExerciseOut[]
}

export interface ListeningItem {
  lesson_id: string
  lesson_title: string
  level: Level
  title: string
  lines: Line[]
  questions: ExerciseOut[]
}

// --- review ---
export interface ReviewCard {
  card_id: number | string
  vocab: VocabOut
  direction: 'de_uz' | 'uz_de'
  state: CardState
}
export interface ReviewQueue {
  cards: ReviewCard[]
  due_total: number
  new_today_left: number
}
export interface ReviewCardOut {
  id: number | string
  state: CardState
  due_at: string
  interval_days: number
}

// --- grammar ---
export interface GrammarSummary {
  id: string
  level: Level
  order: number
  title: string
  prerequisites: string[]
  next: string[]
}
export interface GrammarTopicOut extends GrammarSummary {
  rule: string
  when: string
  structure: string
  explanation?: Block[]
  examples: Example[]
  common_mistakes: Mistake[]
  exercises: ExerciseOut[]
}

// --- tests ---
export type ExamKind = 'placement' | 'midterm' | 'module_test' | 'level_exam'
export interface ExamSummary {
  id: string
  kind: ExamKind
  level: Level
  title: string
  pass_percent: number
}
export interface ExamSection {
  skill: Skill
  title: string
  exercises: ExerciseOut[]
}
export interface ExamOut extends ExamSummary {
  sections: ExamSection[]
}
export type SkillScore = number | { score?: number; total?: number; percent?: number }
export interface ExamResult {
  score: number
  total: number
  percent: number
  passed: boolean
  by_skill: Record<string, SkillScore>
  results: CheckResult[]
}
export interface PlacementResult {
  score_by_skill: Record<string, SkillScore>
  percent: number
  recommended_level: Level
  recommended_module: number
}

// --- reading ---
export interface ReadingSummary {
  id: string
  level: Level
  title: string
  title_uz: string
}
export interface ReadingOut extends ReadingSummary {
  body: string
  glossary: Record<string, string>
  questions: ExerciseOut[]
}

// --- writing ---
export interface WritingTask {
  id: string
  module_id?: string
  level: Level
  title: string
  task_uz: string
  required_words: string[]
  min_words: number
  max_words: number
  criteria: string[]
  sample_answer?: string | null
}
export interface WritingSubmission {
  id: number | string
  task_id: string
  text: string
  word_count: number
  checks: CriterionCheck[]
  ai_feedback: unknown
  created_at: string
}

// --- speaking ---
export interface SpeakingAttemptIn {
  exercise_id?: string
  target_text: string
  recognized_text?: string
  self_rating?: number
}
export interface SpeakingAttemptOut {
  id: number | string
  similarity: number | null
  diff: { word: string; ok: boolean }[]
}

// --- progress ---
export interface Dashboard {
  level: Level
  course_percent: number
  lessons_completed: number
  lessons_total: number
  today_lesson: { id: string; title: string } | null
  due_reviews: number
  next_recommendation: { kind: string; id: string | null; title: string; reason: string } | null
  recent_results: { kind: string; title: string; percent: number; created_at: string }[]
  skills: Record<Skill, number | null>
  streak: number
  weekly_activity: { day: string; exercises: number; correct: number }[]
  words_learned: number
  weak_topics: { topic: string; accuracy: number; attempts: number }[]
  weekly_goal: { target_days: number; done_days: number }
}

/** §6 says only "ko'nikma va mavzu bo'yicha batafsil"; this is the shape the UI reads. */
export interface Stats {
  skills?: Record<string, { accuracy: number | null; attempts: number } | number | null>
  topics?: { topic: string; accuracy: number; attempts: number }[]
}

// --- ai ---
export interface AiStatus {
  configured: boolean
  provider: string | null
}
export interface TutorReply {
  session_id: string
  reply: string
}
