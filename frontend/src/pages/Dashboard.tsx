import { ArrowRight, Bell, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { useDashboard, useSettings } from '../api/queries'
import type { Dashboard } from '../api/types'
import { Loading, PageHeader, ProgressBar, QueryView } from '../components/States'
import { formatDate, SKILLS, skillLabel } from '../lib/labels'

/** Where a recommendation of a given kind lives in the app. */
function recommendationHref(kind: string, id: string | null): string {
  switch (kind) {
    case 'lesson':
      return id ? `/lessons/${id}` : '/path'
    case 'review':
      return '/review'
    case 'grammar':
      return id ? `/grammar/${id}` : '/grammar'
    case 'exam':
    case 'module_test':
    case 'midterm':
    case 'level_exam':
    case 'placement':
      return id ? `/tests/${id}` : '/tests'
    case 'reading':
      return id ? `/reading/${id}` : '/reading'
    case 'writing':
      return '/writing'
    case 'practice':
    case 'topic':
      return id ? `/practice?mode=topic&topic=${encodeURIComponent(id)}` : '/practice'
    default:
      return '/path'
  }
}

function Tile({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`} aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-slate-600">{title}</h2>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const q = useDashboard()
  return (
    <>
      <PageHeader title="Bosh sahifa" />
      <QueryView query={q}>{(d) => <DashboardView d={d} />}</QueryView>
    </>
  )
}

/** /lessons → today's lesson, or the course map when there is none. */
export function LessonsIndexPage() {
  const q = useDashboard()
  if (q.isPending) return <Loading />
  return <Navigate to={q.data?.today_lesson ? `/lessons/${q.data.today_lesson.id}` : '/path'} replace />
}

function ReminderBanner({ due }: { due: number }) {
  const settings = useSettings()
  if (!settings.data?.reminders_enabled || due === 0) return null
  return (
    <p role="note" className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-indigo-950 sm:col-span-2">
      <Bell aria-hidden className="size-4 shrink-0" />
      Eslatma: bugun {due} ta so'z takrorlanishi kerak.{' '}
      <Link to="/review" className="font-medium underline">
        Boshlash
      </Link>
    </p>
  )
}

function DashboardView({ d }: { d: Dashboard }) {
  const maxEx = Math.max(1, ...d.weekly_activity.map((w) => w.exercises))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ReminderBanner due={d.due_reviews} />
      <Tile title="Joriy daraja va kurs">
        <p className="mb-2 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-indigo-800">{d.level}</span>
          <span className="text-slate-700">
            Kurs: <strong>{Math.round(d.course_percent)}%</strong>
          </span>
        </p>
        <ProgressBar value={d.course_percent} label="Kurs bajarilishi" />
        <p className="muted mt-2">
          {d.lessons_completed} / {d.lessons_total} dars tugallangan
        </p>
      </Tile>

      <Tile title="Bugungi dars">
        {d.today_lesson ? (
          <Link to={`/lessons/${d.today_lesson.id}`} className="btn btn-primary w-full justify-between">
            {d.today_lesson.title} <ArrowRight aria-hidden className="size-4" />
          </Link>
        ) : (
          <p className="text-slate-700">Barcha darslar tugallangan yoki dars tanlanmagan.</p>
        )}
      </Tile>

      <Tile title="Bugungi takrorlash">
        <p className="mb-2 text-slate-800">
          <strong className="text-2xl">{d.due_reviews}</strong> ta so'z takrorlanishi kerak
        </p>
        {d.due_reviews > 0 && (
          <Link to="/review" className="btn">
            Takrorlashni boshlash
          </Link>
        )}
      </Tile>

      <Tile title="Keyingi tavsiya">
        {d.next_recommendation ? (
          <>
            <Link
              to={recommendationHref(d.next_recommendation.kind, d.next_recommendation.id)}
              className="font-semibold text-indigo-800 underline"
            >
              {d.next_recommendation.title}
            </Link>
            <p className="muted mt-1">{d.next_recommendation.reason}</p>
          </>
        ) : (
          <p className="text-slate-700">Hozircha tavsiya yo'q.</p>
        )}
      </Tile>

      <Tile title="Ko'nikmalar">
        <ul className="space-y-2">
          {SKILLS.map((s) => {
            const v = d.skills[s]
            return (
              <li key={s}>
                <div className="flex justify-between text-sm">
                  <span>{skillLabel[s]}</span>
                  <span className="text-slate-600">{v == null ? "ma'lumot yetarli emas" : `${Math.round(v)}%`}</span>
                </div>
                {v != null && <ProgressBar value={v} label={`${skillLabel[s]} ko'nikmasi`} />}
              </li>
            )
          })}
        </ul>
      </Tile>

      <Tile title="Haftalik faollik">
        <p className="mb-3 flex items-center gap-2">
          <Flame aria-hidden className="size-5 text-orange-600" />
          <span>
            Ketma-ketlik: <strong>{d.streak}</strong> kun
          </span>
        </p>
        <ul className="flex h-28 items-end gap-1.5" aria-label="Oxirgi 7 kun">
          {d.weekly_activity.map((w) => (
            <li key={w.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-indigo-500"
                style={{ height: `${(w.exercises / maxEx) * 80}px` }}
                title={`${w.exercises} mashq`}
              />
              <span className="text-[10px] text-slate-600">
                {new Date(w.day).toLocaleDateString('uz-UZ', { weekday: 'short' })}
              </span>
              <span className="sr-only">
                {formatDate(w.day)}: {w.exercises} mashq, {w.correct} to'g'ri
              </span>
            </li>
          ))}
        </ul>
        <p className="muted mt-3">
          Haftalik maqsad: {d.weekly_goal.done_days} / {d.weekly_goal.target_days} kun
        </p>
        <ProgressBar
          value={(d.weekly_goal.done_days / Math.max(1, d.weekly_goal.target_days)) * 100}
          label="Haftalik maqsad"
        />
      </Tile>

      <Tile title="O'rganilgan so'zlar">
        <p className="text-3xl font-bold">{d.words_learned}</p>
        <Link to="/vocabulary" className="text-sm text-indigo-700 underline">
          Lug'atni ochish
        </Link>
      </Tile>

      <Tile title="Zaif mavzular">
        {d.weak_topics.length === 0 ? (
          <p className="text-slate-700">Zaif mavzu topilmadi.</p>
        ) : (
          <ul className="space-y-1">
            {d.weak_topics.map((t) => (
              <li key={t.topic} className="flex items-center justify-between gap-2 text-sm">
                <Link to={`/practice?mode=topic&topic=${encodeURIComponent(t.topic)}`} className="text-indigo-700 underline">
                  {t.topic}
                </Link>
                <span className="text-slate-600">
                  {Math.round(t.accuracy)}% · {t.attempts} urinish
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile title="So'nggi natijalar" className="sm:col-span-2">
        {d.recent_results.length === 0 ? (
          <p className="text-slate-700">Hali test topshirilmagan.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.recent_results.map((r, i) => (
              <li key={i} className="flex justify-between gap-2 py-1.5 text-sm">
                <span>{r.title}</span>
                <span className="shrink-0 text-slate-600">
                  {Math.round(r.percent)}% · {formatDate(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </div>
  )
}
