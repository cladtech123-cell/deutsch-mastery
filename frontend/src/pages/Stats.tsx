import { Link } from 'react-router'
import { useDashboard, useStats } from '../api/queries'
import { PageHeader, ProgressBar, QueryView } from '../components/States'
import { formatDate, skillLabel } from '../lib/labels'

type SkillStat = { accuracy: number | null; attempts: number } | number | null

const pct = (s: SkillStat) => (s == null ? null : typeof s === 'number' ? s : s.accuracy)

export function StatsPage() {
  const stats = useStats()
  const dash = useDashboard()
  return (
    <>
      <PageHeader title="Statistika" subtitle="Ko'nikma = so'nggi 50 urinishdagi to'g'rilik (5 tadan kam bo'lsa ko'rsatilmaydi)." />
      <div className="space-y-4">
        <QueryView query={stats}>
          {(s) => (
            <>
              <section className="card" aria-labelledby="st-skills">
                <h2 id="st-skills" className="h2 mb-3">
                  Ko'nikmalar
                </h2>
                <ul className="space-y-3">
                  {Object.entries(s.skills ?? {}).map(([k, v]) => {
                    const p = pct(v)
                    return (
                      <li key={k}>
                        <div className="flex justify-between text-sm">
                          <span>{skillLabel[k] ?? k}</span>
                          <span className="text-slate-600">
                            {p == null ? "ma'lumot yetarli emas" : `${Math.round(p)}%`}
                            {v != null && typeof v === 'object' && ` · ${v.attempts} urinish`}
                          </span>
                        </div>
                        {p != null && <ProgressBar value={p} label={skillLabel[k] ?? k} />}
                      </li>
                    )
                  })}
                </ul>
              </section>
              <section className="card overflow-x-auto" aria-labelledby="st-topics">
                <h2 id="st-topics" className="h2 mb-3">
                  Mavzular
                </h2>
                {(s.topics ?? []).length === 0 ? (
                  <p className="text-slate-700">Hali urinishlar yo'q.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th scope="col" className="py-1">Mavzu</th>
                        <th scope="col" className="py-1">To'g'rilik</th>
                        <th scope="col" className="py-1">Urinishlar</th>
                        <th scope="col" className="py-1"><span className="sr-only">Mashq</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(s.topics ?? [])]
                        .sort((a, b) => a.accuracy - b.accuracy)
                        .map((t) => (
                          <tr key={t.topic} className="border-t border-slate-100">
                            <td className="py-1.5">{t.topic}</td>
                            <td className={t.accuracy < 60 ? 'font-medium text-red-800' : ''}>{Math.round(t.accuracy)}%</td>
                            <td>{t.attempts}</td>
                            <td>
                              <Link to={`/practice?mode=topic&topic=${encodeURIComponent(t.topic)}`} className="text-indigo-700 underline">
                                Mashq
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </QueryView>
        <QueryView query={dash}>
          {(d) => (
            <section className="card" aria-labelledby="st-week">
              <h2 id="st-week" className="h2 mb-3">
                Faollik
              </h2>
              <p className="mb-2">
                Ketma-ketlik: <strong>{d.streak}</strong> kun · O'rganilgan so'zlar: <strong>{d.words_learned}</strong> ·
                Darslar: <strong>{d.lessons_completed}/{d.lessons_total}</strong>
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th scope="col">Kun</th>
                    <th scope="col">Mashqlar</th>
                    <th scope="col">To'g'ri</th>
                  </tr>
                </thead>
                <tbody>
                  {d.weekly_activity.map((w) => (
                    <tr key={w.day} className="border-t border-slate-100">
                      <td className="py-1.5">{formatDate(w.day)}</td>
                      <td>{w.exercises}</td>
                      <td>{w.correct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </QueryView>
      </div>
    </>
  )
}
