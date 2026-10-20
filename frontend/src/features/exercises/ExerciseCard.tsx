import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client'
import { api, type Answers } from '../../api/endpoints'
import { invalidateProgress } from '../../api/queries'
import type { Answer, CheckResult, ExerciseOut } from '../../api/types'
import { errorTypeLabel, formatAnswer, skillLabel } from '../../lib/labels'
import { isAnswered } from './answer'
import { ExerciseInput, ExerciseQuestion } from './inputs'

/** Result of a check: correct/incorrect, correct answer, why, warning, hint, error type, criteria checks. */
export function Feedback({ result }: { result: CheckResult }) {
  return (
    <div
      role="status"
      className={`space-y-2 rounded-lg border p-3 text-sm ${result.correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
    >
      <p className={`flex items-center gap-2 text-base font-semibold ${result.correct ? 'text-green-800' : 'text-red-800'}`}>
        {result.correct ? <CheckCircle2 aria-hidden className="size-5" /> : <XCircle aria-hidden className="size-5" />}
        {result.correct ? "To'g'ri!" : "Noto'g'ri"}
      </p>
      {!result.correct && result.correct_answer != null && (
        <p>
          <span className="font-medium">To'g'ri javob: </span>
          <span lang="de">{formatAnswer(result.correct_answer)}</span>
        </p>
      )}
      {result.warning && (
        <p className="flex items-start gap-2 text-amber-900">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {result.warning}
        </p>
      )}
      {result.explanation && (
        <p>
          <span className="font-medium">Nega: </span>
          {result.explanation}
        </p>
      )}
      {!result.correct && result.error_type && (
        <p>
          <span className="font-medium">Xato turi: </span>
          {errorTypeLabel[result.error_type] ?? result.error_type}
        </p>
      )}
      {result.hint && !result.correct && (
        <p>
          <span className="font-medium">Yordam: </span>
          {result.hint}
        </p>
      )}
      {result.checks && result.checks.length > 0 && (
        <ul className="space-y-1">
          {result.checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2">
              {c.ok ? (
                <CheckCircle2 aria-label="bajarildi" className="mt-0.5 size-4 shrink-0 text-green-700" />
              ) : (
                <XCircle aria-label="bajarilmadi" className="mt-0.5 size-4 shrink-0 text-red-700" />
              )}
              {c.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Meta({ exercise, index }: { exercise: ExerciseOut; index?: number }) {
  return (
    <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {index != null && <span className="font-semibold text-slate-700">{index}.</span>}
      <span className="chip">{skillLabel[exercise.skill] ?? exercise.skill}</span>
      <span>{exercise.points} ball</span>
    </p>
  )
}

/** Standalone exercise: answer → POST /exercises/{id}/check → feedback (+ retry exercise on the same topic). */
export function ExerciseCard({
  exercise,
  index,
  onChecked,
}: {
  exercise: ExerciseOut
  index?: number
  onChecked?: (exercise: ExerciseOut, result: CheckResult) => void
}) {
  const [value, setValue] = useState<Answer>()
  const [showHint, setShowHint] = useState(false)
  const check = useMutation({
    mutationFn: (answer: Answer) => api.check(exercise.id, answer),
    onSuccess: (r) => {
      invalidateProgress()
      onChecked?.(exercise, r)
    },
  })
  const result = check.data
  return (
    <article className="card space-y-3" aria-label={`Mashq ${index ?? ''}`.trim()}>
      <div>
        <Meta exercise={exercise} index={index} />
        <ExerciseQuestion exercise={exercise} />
      </div>
      <ExerciseInput exercise={exercise} value={value} onChange={setValue} disabled={!!result || check.isPending} />
      {!result && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isAnswered(exercise, value) || check.isPending}
            onClick={() => value !== undefined && check.mutate(value)}
          >
            {check.isPending ? 'Tekshirilmoqda…' : 'Tekshirish'}
          </button>
          {exercise.hint && (
            <button type="button" className="btn" aria-expanded={showHint} onClick={() => setShowHint((v) => !v)}>
              Yordam
            </button>
          )}
        </div>
      )}
      {showHint && !result && exercise.hint && <p className="rounded-lg bg-slate-100 p-2 text-sm">{exercise.hint}</p>}
      {check.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage(check.error)}
        </p>
      )}
      {result && <Feedback result={result} />}
      {result?.retry_exercise && <RetryExercise exercise={result.retry_exercise} />}
    </article>
  )
}

export function RetryExercise({ exercise }: { exercise: ExerciseOut }) {
  return (
    <section className="space-y-2 border-l-4 border-indigo-300 pl-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
        <RotateCcw aria-hidden className="size-4" /> Shu bilimni boshqa misolda tekshiring
      </h4>
      <ExerciseCard exercise={exercise} />
    </section>
  )
}

/** Test mode: collect all answers, submit once (final test, module test, exam, placement). */
export function ExamForm({
  sections,
  onSubmit,
  pending,
  submitLabel = 'Javoblarni yuborish',
}: {
  sections: { title?: string; exercises: ExerciseOut[] }[]
  onSubmit: (answers: Answers) => void
  pending?: boolean
  submitLabel?: string
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const all = sections.flatMap((s) => s.exercises)
  const done = all.filter((e) => isAnswered(e, answers[e.id])).length
  let n = 0
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        // Only answered questions are sent; unanswered ones are scored as wrong by the server.
        onSubmit(Object.fromEntries(all.filter((x) => isAnswered(x, answers[x.id])).map((x) => [x.id, answers[x.id]])))
      }}
    >
      {sections.map((s, si) => (
        <section key={si} className="space-y-3">
          {s.title && <h3 className="h2">{s.title}</h3>}
          {s.exercises.map((ex) => (
            <div key={ex.id} className="card space-y-3">
              <Meta exercise={ex} index={++n} />
              <ExerciseQuestion exercise={ex} />
              <ExerciseInput
                exercise={ex}
                value={answers[ex.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [ex.id]: v }))}
                disabled={pending}
              />
            </div>
          ))}
        </section>
      ))}
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 lg:bottom-4">
        <span className="text-sm text-slate-700">
          Javob berilgan: {done} / {all.length}
        </span>
        <button type="submit" className="btn btn-primary" disabled={pending || done === 0}>
          {pending ? 'Yuborilmoqda…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

/** Per-question results with explanations, after a test submit. */
export function ResultsList({ results, exercises }: { results: CheckResult[]; exercises: ExerciseOut[] }) {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  return (
    <ol className="space-y-3">
      {results.map((r, i) => (
        <li key={r.exercise_id} className="space-y-2">
          <p className="text-sm font-medium">
            {i + 1}. {byId.get(r.exercise_id)?.question ?? r.exercise_id}
          </p>
          <Feedback result={r} />
        </li>
      ))}
    </ol>
  )
}
