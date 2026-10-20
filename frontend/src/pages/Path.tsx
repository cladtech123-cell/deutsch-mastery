import { CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import { Link } from 'react-router'
import { useCurriculum } from '../api/queries'
import type { CurriculumLesson } from '../api/types'
import { PageHeader, ProgressBar, QueryView } from '../components/States'

function StatusIcon({ status }: { status: CurriculumLesson['status'] }) {
  if (status === 'completed') return <CheckCircle2 aria-label="tugallangan" className="size-5 shrink-0 text-green-700" />
  if (status === 'started') return <PlayCircle aria-label="boshlangan" className="size-5 shrink-0 text-ink" />
  return <Circle aria-label="boshlanmagan" className="size-5 shrink-0 text-stone-500" />
}

export function PathPage() {
  const q = useCurriculum()
  return (
    <>
      <PageHeader title="O'quv yo'li" subtitle="A1 va A2: 24 modul. Istalgan darsni ochishingiz mumkin." />
      <QueryView query={q} isEmpty={(c) => c.levels.length === 0} empty="Kurs hali yuklanmagan.">
        {(c) => (
          <div className="space-y-8">
            {c.levels.map((level) => (
              <section key={level.code} aria-labelledby={`lvl-${level.code}`}>
                <h2 id={`lvl-${level.code}`} className="h2 mb-3">
                  {level.title}
                </h2>
                <ol className="space-y-3">
                  {level.modules.map((m) => (
                    <li key={m.id} className="card">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-semibold">
                          {m.number}-modul. {m.title}{' '}
                          <span lang="de" className="font-normal text-stone-600">
                            ({m.title_de})
                          </span>
                        </h3>
                        <span className="text-sm text-stone-600">{Math.round(m.percent)}%</span>
                      </div>
                      <ProgressBar value={m.percent} label={`${m.number}-modul bajarilishi`} />
                      {m.goals.length > 0 && (
                        <details className="mt-2 text-sm">
                          <summary className="cursor-pointer text-stone-700">Modul maqsadlari</summary>
                          <ul className="mt-1 list-disc pl-5 text-stone-700">
                            {m.goals.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <ul className="mt-3 divide-y divide-stone-100">
                        {m.lessons.map((l) => (
                          <li key={l.id}>
                            <Link to={`/lessons/${l.id}`} className="flex items-center gap-3 rounded py-2 hover:bg-stone-50">
                              <StatusIcon status={l.status} />
                              <span className="flex-1">
                                {l.order}. {l.title}
                              </span>
                              {l.best_score != null && (
                                <span className="text-sm text-stone-600">{Math.round(l.best_score)}%</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link to={`/tests/mtest-${m.id}`} className="btn btn-sm">
                          Modul testi
                        </Link>
                        <Link to={`/writing?task=w-${m.id}`} className="btn btn-sm">
                          Yozma topshiriq
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </QueryView>
    </>
  )
}
