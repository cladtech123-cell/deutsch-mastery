import { ArrowRight, Bell, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router'
import { useDashboard, useMe, useSettings } from '../api/queries'
import type { Dashboard } from '../api/types'
import { Loading, PageHeader, ProgressBar, QueryView } from '../components/States'
import { formatDate, SKILLS, skillLabel, weekdayShort } from '../lib/labels'

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
      <h2 className="mb-3 text-sm font-semibold text-slate-500">{title}</h2>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const q = useDashboard()
  const me = useMe()
  const name = me.data?.display_name?.split(' ')[0]
  return (
    <>
      <PageHeader title="Bosh sahifa" subtitle={name ? `Salom, ${name}! Bugun ham bir qadam oldinga.` : undefined} />
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
      <section
        aria-label="Bugungi dars"
        className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-raised sm:col-span-2 sm:p-6"
      >
        <h2 className="text-sm font-semibold text-indigo-100">Bugungi dars</h2>
        {d.today_lesson ? (
          <Link
            to={`/lessons/${d.today_lesson.id}`}
            className="group mt-1 flex flex-wrap items-end justify-between gap-4 rounded-xl focus-visible:outline-white"
          >
            <span className="font-display text-2xl leading-tight font-extrabold text-balance sm:text-3xl">
              {d.today_lesson.title}
            </span>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-700 transition-colors duration-150 group-hover:bg-indigo-50">
              Darsni boshlash <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ) : (
          <p className="mt-1 text-indigo-50">Barcha darslar tugallangan yoki dars tanlanmagan.</p>
        )}
      </section>
      <Tile title="Joriy daraja va kurs">
        <p className="mb-2 flex items-baseline gap-3">
          <span className="font-display text-4xl font-extrabold text-indigo-700">{d.level}</span>
          <span className="text-slate-700">
            Kurs: <strong>{Math.round(d.course_percent)}%</strong>
          </span>
        </p>
        <ProgressBar value={d.course_percent} label="Kurs bajarilishi" />
        <p className="muted mt-2">
          {d.lessons_completed} / {d.lessons_total} dars tugallangan
        </p>
      </Tile>


      <Tile title="Bugungi takrorlash">
        <p className="mb-2 text-slate-800">
          <strong className="font-display text-3xl font-extrabold text-slate-900">{d.due_reviews}</strong> ta so'z takrorlanishi kerak
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
        {SKILLS.every((s) => d.skills[s] == null) ? (
          <p className="text-slate-600">
            Bir nechta mashq bajaring — o'qish, tinglash, yozish va boshqa ko'nikmalar bo'yicha natijangiz shu
            yerda chiqadi.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {SKILLS.map((s) => {
              const v = d.skills[s]
              return (
                <li key={s}>
                  <div className="flex justify-between text-sm">
                    <span>{skillLabel[s]}</span>
                    {v == null ? (
                      <span className="text-slate-500">
                        <span aria-hidden>—</span>
                        <span className="sr-only">ma'lumot yetarli emas</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-800">{Math.round(v)}%</span>
                    )}
                  </div>
                  {v != null && <ProgressBar value={v} label={`${skillLabel[s]} ko'nikmasi`} />}
                </li>
              )
            })}
          </ul>
        )}
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
              <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-slate-100">
                <div
                  className="w-full rounded-md bg-indigo-500"
                  style={{ height: `${(w.exercises / maxEx) * 100}%` }}
                  title={`${w.exercises} mashq`}
                />
              </div>
              <span className="text-[10px] text-slate-600">
                {weekdayShort(w.day)}
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
