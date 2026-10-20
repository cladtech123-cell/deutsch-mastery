import type { RouteObject } from 'react-router'
import { RequireAuth } from './components/Layout'
import { NotFound } from './components/States'
import { LoginPage, RegisterPage } from './pages/Auth'
import { DashboardPage, LessonsIndexPage } from './pages/Dashboard'
import { GrammarListPage, GrammarTopicPage } from './pages/Grammar'
import { LessonPage } from './pages/Lesson'
import { ListeningPage, PracticePage } from './pages/Listening'
import { OnboardingPage } from './pages/Onboarding'
import { PathPage } from './pages/Path'
import { ReadingListPage, ReadingTextPage } from './pages/Reading'
import { ReviewPage } from './pages/Review'
import { SettingsPage } from './pages/Settings'
import { SpeakingPage } from './pages/Speaking'
import { StatsPage } from './pages/Stats'
import { TestRunPage, TestsPage } from './pages/Tests'
import { TutorPage } from './pages/Tutor'
import { VocabularyPage } from './pages/Vocabulary'
import { WritingPage } from './pages/Writing'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { element: <RequireAuth allowOnboarding />, children: [{ path: '/onboarding', element: <OnboardingPage /> }] },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/path', element: <PathPage /> },
      { path: '/lessons', element: <LessonsIndexPage /> },
      { path: '/lessons/:id', element: <LessonPage /> },
      { path: '/vocabulary', element: <VocabularyPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/grammar', element: <GrammarListPage /> },
      { path: '/grammar/:id', element: <GrammarTopicPage /> },
      { path: '/listening', element: <ListeningPage /> },
      { path: '/speaking', element: <SpeakingPage /> },
      { path: '/writing', element: <WritingPage /> },
      { path: '/reading', element: <ReadingListPage /> },
      { path: '/reading/:id', element: <ReadingTextPage /> },
      { path: '/tests', element: <TestsPage /> },
      { path: '/tests/:id', element: <TestRunPage /> },
      { path: '/practice', element: <PracticePage /> },
      { path: '/stats', element: <StatsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/tutor', element: <TutorPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
