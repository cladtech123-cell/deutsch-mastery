import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { errorMessage } from '../api/client'
import { api, type Answers } from '../api/endpoints'
import { invalidateProgress, useExams } from '../api/queries'
import type { ExamKind, ExamOut, ExamResult, PlacementResult, SkillScore } from '../api/types'
import { PageHeader, QueryView } from '../components/States'
import { ExamForm, ResultsList } from '../features/exercises/ExerciseCard'
import { examKindLabel, skillLabel } from '../lib/labels'

const DISCLAIMER =
  "Bu platformaning ichki testlari. Natija rasmiy sertifikat (Goethe, telc, ÖSD) o'rnini bosmaydi; rasmiy imtihon talablari alohida."

function fmtScore(s: SkillScore): string {
  if (typeof s === 'number') return `${Math.round(s)}%`
  if (s.percent != null) return `${Math.round(s.percent)}%`
  if (s.score != null && s.total != null) return `${s.score} / ${s.total}`
  return '—'
}

export function SkillScores({ scores }: { scores: Record<string, SkillScore> }) {
  const entries = Object.entries(scores)
  if (entries.length === 0) return null
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-slate-100 p-2">
          <dt className="text-xs text-slate-600">{skillLabel[k] ?? k}</dt>
          <dd className="font-semibold">{fmtScore(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

const KIND_ORDER: ExamKind[] = ['placement', 'module_test', 'midterm', 'level_exam']

export function TestsPage() {
  const q = useExams()
  return (
    <>
      <PageHeader title="Testlar" subtitle={DISCLAIMER} />
      <section className="card mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Zaif mavzular va xatolar bo'yicha test</h2>
          <p className="muted">Avval xato qilgan savollaringiz va shu mavzudagi yangi savollar.</p>
        </div>
        <Link to="/practice?mode=mistakes" className="btn">
          Boshlash
        </Link>
      </section>
      <section className="card mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Lug'atni takrorlash testi</h2>
          <p className="muted">Bugungi SRS kartalari.</p>
        </div>
        <Link to="/review" className="btn">
          Boshlash
        </Link>
      </section>
      <QueryView query={q} isEmpty={(l) => l.length === 0} empty="Testlar hali yuklanmagan.">
        {(list) => (
          <div className="space-y-5">
            {KIND_ORDER.map((kind) => {
              const items = list.filter((e) => e.kind === kind)
              if (kind === 'placement' && items.length === 0) items.push({ id: 'placement', kind, level: 'A1', title: 'Diagnostik test', pass_percent: 0 })
              if (items.length === 0) return null
              return (
                <section key={kind} aria-labelledby={`k-${kind}`}>
                  <h2 id={`k-${kind}`} className="h2 mb-2">
                    {examKindLabel[kind]}
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {items.map((e) => (
                      <li key={e.id}>
                        <Link to={`/tests/${e.id}`} className="card flex items-center justify-between gap-2 hover:border-indigo-300">
                          <span>
                            <span className="chip mr-2">{e.level}</span>
                            {e.title}
                          </span>
                          <ArrowRight aria-hidden className="size-4 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </QueryView>
    </>
  )
}

function ExamResultView({ r, exam }: { r: ExamResult; exam: ExamOut }) {
  return (
    <div className="space-y-4">
      <div role="status" className={`card space-y-2 ${r.passed ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
        <p className="text-lg font-semibold">
          Natija: {r.score} / {r.total} ({Math.round(r.percent)}%) — {r.passed ? "o'tdingiz" : "o'tmadingiz"}
        </p>
        <p className="muted">O'tish chegarasi: {exam.pass_percent}%. {DISCLAIMER}</p>
        <SkillScores scores={r.by_skill} />
      </div>
      <h2 className="h2">Savollar bo'yicha izohlar</h2>
      <ResultsList results={r.results} exercises={exam.sections.flatMap((s) => s.exercises)} />
    </div>
  )
}

function PlacementResultView({ r }: { r: PlacementResult }) {
  return (
    <div role="status" className="card space-y-2">
      <p className="text-lg font-semibold">Umumiy natija: {Math.round(r.percent)}%</p>
      <SkillScores scores={r.score_by_skill} />
      <p>
        Tavsiya etilgan boshlang'ich nuqta: <strong>{r.recommended_level}</strong>, {r.recommended_module}-modul. Uni
        sozlamalarda tanlashingiz mumkin.
      </p>
      <Link to="/settings" className="btn">
        Sozlamalar
      </Link>
    </div>
  )
}

export function TestRunPage() {
  const { id = '' } = useParams()
  const isPlacement = id === 'placement'
  const exam = useQuery({ queryKey: ['exam', id], queryFn: () => (isPlacement ? api.placement() : api.exam(id)) })
  const submit = useMutation({
    mutationFn: (answers: Answers): Promise<ExamResult | PlacementResult> => (isPlacement ? api.submitPlacement(answers) : api.submitExam(id, answers)),
    onSuccess: invalidateProgress,
  })
  return (
    <QueryView query={exam}>
      {(e) => (
        <div className="space-y-4">
          <PageHeader title={e.title} subtitle={`${e.level} · ${examKindLabel[e.kind] ?? e.kind}`}>
            <Link to="/tests" className="btn btn-sm">
              Barcha testlar
            </Link>
          </PageHeader>
          {submit.data ? (
            <>
              {'recommended_level' in submit.data ? (
                <PlacementResultView r={submit.data} />
              ) : (
                <ExamResultView r={submit.data} exam={e} />
              )}
              <button type="button" className="btn" onClick={() => submit.reset()}>
                Qayta topshirish
              </button>
            </>
          ) : (
            <ExamForm sections={e.sections} pending={submit.isPending} onSubmit={(a) => submit.mutate(a)} />
          )}
          {submit.isError && (
            <p role="alert" className="text-sm text-red-700">
              {errorMessage(submit.error)}
            </p>
          )}
        </div>
      )}
    </QueryView>
  )
}
