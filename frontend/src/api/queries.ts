import { useMutation, useQuery } from '@tanstack/react-query'
import { ME_KEY, queryClient } from './client'
import { api, type PracticeQuery, type VocabularyQuery } from './endpoints'

export const keys = {
  settings: ['settings'] as const,
  curriculum: ['curriculum'] as const,
  lesson: (id: string) => ['lesson', id] as const,
  vocabulary: (q: VocabularyQuery) => ['vocabulary', q] as const,
  review: ['review', 'queue'] as const,
  dashboard: ['progress', 'dashboard'] as const,
  stats: ['progress', 'stats'] as const,
}

export const useMe = () => useQuery({ queryKey: ME_KEY, queryFn: api.me, staleTime: Infinity })
export const useSettings = (enabled = true) => useQuery({ queryKey: keys.settings, queryFn: api.settings, enabled })
export const useCurriculum = () => useQuery({ queryKey: keys.curriculum, queryFn: api.curriculum })
export const useLesson = (id: string) => useQuery({ queryKey: keys.lesson(id), queryFn: () => api.lesson(id) })
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard })
export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: api.stats })
export const useVocabulary = (q: VocabularyQuery) =>
  useQuery({ queryKey: keys.vocabulary(q), queryFn: () => api.vocabulary(q), placeholderData: (prev) => prev })
export const useReviewQueue = () => useQuery({ queryKey: keys.review, queryFn: () => api.reviewQueue(20) })
export const usePractice = (q: PracticeQuery) => useQuery({ queryKey: ['practice', q], queryFn: () => api.practice(q) })
export const useListening = () => useQuery({ queryKey: ['listening'], queryFn: api.listening })
export const useGrammarList = () => useQuery({ queryKey: ['grammar'], queryFn: api.grammarList })
export const useGrammarTopic = (id: string) => useQuery({ queryKey: ['grammar', id], queryFn: () => api.grammarTopic(id) })
export const useExams = () => useQuery({ queryKey: ['exams'], queryFn: api.exams })
export const useReadingList = () => useQuery({ queryKey: ['reading'], queryFn: api.readingList })
export const useReading = (id: string) => useQuery({ queryKey: ['reading', id], queryFn: () => api.reading(id) })
export const useWritingTasks = () => useQuery({ queryKey: ['writing', 'tasks'], queryFn: api.writingTasks })
export const useWritingSubmissions = () =>
  useQuery({ queryKey: ['writing', 'submissions'], queryFn: api.writingSubmissions })
export const useAiStatus = () => useQuery({ queryKey: ['ai', 'status'], queryFn: api.aiStatus })

/** Anything that records an attempt changes dashboard/stats/curriculum numbers. */
export function invalidateProgress() {
  void queryClient.invalidateQueries({ queryKey: ['progress'] })
  void queryClient.invalidateQueries({ queryKey: keys.curriculum })
}

export function useLogout() {
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(ME_KEY, null)
    },
  })
}
