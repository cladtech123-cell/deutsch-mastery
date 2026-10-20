import { asList, http, statusOf } from './client'
import type {
  AiStatus, Answer, CheckResult, Curriculum, Dashboard, ExamOut, ExamResult, ExamSummary, FinalResult,
  GrammarSummary, GrammarTopicOut, LessonOut, ListeningItem, PlacementResult, PracticeOut, ReadingOut,
  ReadingSummary, ReviewCardOut, ReviewQueue, Settings, SpeakingAttemptIn, SpeakingAttemptOut, Stats, TutorReply,
  UserOut, VocabOut, VocabularyList, WritingSubmission, WritingTask,
} from './types'

const get = async <T>(url: string, params?: object) => (await http.get<T>(url, { params })).data
const post = async <T>(url: string, body?: unknown) => (await http.post<T>(url, body)).data

export type Answers = Record<string, Answer>

export interface VocabularyQuery {
  q?: string
  topic?: string
  level?: string
  saved?: boolean
  weak?: boolean
}

export interface PracticeQuery {
  mode: 'mistakes' | 'topic' | 'skill'
  topic?: string
  skill?: string
  limit?: number
}

export const api = {
  // auth
  me: async (): Promise<UserOut | null> => {
    try {
      return await get<UserOut>('/auth/me')
    } catch (e) {
      if (statusOf(e) === 401) return null
      throw e
    }
  },
  login: (body: { email: string; password: string }) => post<UserOut>('/auth/login', body),
  register: (body: { email: string; password: string; display_name: string }) => post<UserOut>('/auth/register', body),
  logout: () => post<void>('/auth/logout'),
  deleteAccount: async (password: string) => {
    await http.delete('/users/me', { data: { password } })
  },

  settings: () => get<Settings>('/settings'),
  saveSettings: async (s: Settings) => (await http.put<Settings>('/settings', s)).data,

  // course
  curriculum: () => get<Curriculum>('/curriculum'),
  lesson: (id: string) => get<LessonOut>(`/lessons/${encodeURIComponent(id)}`),
  check: (id: string, answer: Answer) => post<CheckResult>(`/exercises/${encodeURIComponent(id)}/check`, { answer }),
  submitFinal: (lessonId: string, answers: Answers) =>
    post<FinalResult>(`/lessons/${encodeURIComponent(lessonId)}/final`, { answers }),
  practice: (q: PracticeQuery) => get<PracticeOut>('/practice', q),
  listening: async () => (await get<{ items: ListeningItem[] }>('/listening')).items,

  // vocabulary + review
  vocabulary: (q: VocabularyQuery) => get<VocabularyList>('/vocabulary', q),
  saveWord: (id: string) => post<VocabOut>(`/vocabulary/${encodeURIComponent(id)}/save`),
  unsaveWord: async (id: string) => (await http.delete<VocabOut>(`/vocabulary/${encodeURIComponent(id)}/save`)).data,
  reviewQueue: (limit = 20) => get<ReviewQueue>('/review/queue', { limit }),
  answerReview: (cardId: string | number, quality: number) => post<ReviewCardOut>(`/review/${cardId}/answer`, { quality }),

  // grammar
  grammarList: async () => asList(await get<GrammarSummary[] | { items: GrammarSummary[] }>('/grammar')),
  grammarTopic: (id: string) => get<GrammarTopicOut>(`/grammar/${encodeURIComponent(id)}`),

  // tests
  placement: () => get<ExamOut>('/placement'),
  submitPlacement: (answers: Answers) => post<PlacementResult>('/placement/submit', { answers }),
  exams: async () => asList(await get<ExamSummary[] | { items: ExamSummary[] }>('/exams')),
  exam: (id: string) => get<ExamOut>(`/exams/${encodeURIComponent(id)}`),
  submitExam: (id: string, answers: Answers) => post<ExamResult>(`/exams/${encodeURIComponent(id)}/submit`, { answers }),

  // reading / writing / speaking
  readingList: async () => asList(await get<ReadingSummary[] | { items: ReadingSummary[] }>('/reading')),
  reading: (id: string) => get<ReadingOut>(`/reading/${encodeURIComponent(id)}`),
  writingTasks: async () => asList(await get<WritingTask[] | { items: WritingTask[] }>('/writing/tasks')),
  writingSubmissions: async () =>
    asList(await get<WritingSubmission[] | { items: WritingSubmission[] }>('/writing/submissions')),
  submitWriting: (task_id: string, text: string) => post<WritingSubmission>('/writing/submissions', { task_id, text }),
  speakingAttempt: (body: SpeakingAttemptIn) => post<SpeakingAttemptOut>('/speaking/attempts', body),

  // progress
  dashboard: () => get<Dashboard>('/progress/dashboard'),
  stats: () => get<Stats>('/progress/stats'),

  // ai
  aiStatus: () => get<AiStatus>('/ai/status'),
  tutor: (message: string, session_id?: string) => post<TutorReply>('/ai/tutor', { message, session_id }),
}
