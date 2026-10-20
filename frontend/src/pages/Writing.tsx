import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage, queryClient } from '../api/client'
import { api } from '../api/endpoints'
import { invalidateProgress, useWritingSubmissions, useWritingTasks } from '../api/queries'
import type { WritingSubmission, WritingTask } from '../api/types'
import { PageHeader, QueryView } from '../components/States'
import { UmlautField } from '../features/exercises/inputs'
import { formatDate, wordCount } from '../lib/labels'

/** AI feedback shape is provider-defined; always rendered as plain text, never as HTML. */
function AiFeedback({ value }: { value: unknown }) {
  if (value == null) return null
  const render = (v: unknown): ReactNode => {
    if (v == null) return null
    if (typeof v !== 'object') return String(v)
    if (Array.isArray(v)) return <ul className="list-disc pl-5">{v.map((x, i) => <li key={i}>{render(x)}</li>)}</ul>
    return (
      <dl className="space-y-1">
        {Object.entries(v).map(([k, x]) => (
          <div key={k}>
            <dt className="font-medium">{k}</dt>
            <dd className="pl-3">{render(x)}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm whitespace-pre-wrap">
      <h3 className="mb-1 font-semibold">AI tavsiyalari</h3>
      {render(value)}
      <p className="mt-2 text-xs text-slate-600">AI izohlari xato bo'lishi mumkin — kurs qoidalari bilan solishtiring.</p>
    </section>
  )
}

function SubmissionResult({ s, task }: { s: WritingSubmission; task: WritingTask }) {
  return (
    <div className="space-y-3" role="status">
      <p className="text-sm text-slate-600">
        {formatDate(s.created_at)} · {s.word_count} so'z
      </p>
      <blockquote lang="de" className="rounded-lg bg-slate-100 p-3 whitespace-pre-wrap">
        {s.text}
      </blockquote>
      <ul className="space-y-1 text-sm">
        {s.checks.map((c) => (
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
      <AiFeedback value={s.ai_feedback} />
      {task.sample_answer && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Namunaviy javob</summary>
          <p lang="de" className="mt-1 whitespace-pre-wrap">
            {task.sample_answer}
          </p>
        </details>
      )}
    </div>
  )
}

function TaskView({ task }: { task: WritingTask }) {
  const [text, setText] = useState('')
  const history = useWritingSubmissions()
  const submit = useMutation({
    mutationFn: () => api.submitWriting(task.id, text),
    onSuccess: () => {
      invalidateProgress()
      void queryClient.invalidateQueries({ queryKey: ['writing', 'submissions'] })
    },
  })
  const n = wordCount(text)
  const past = (history.data ?? []).filter((s) => s.task_id === task.id && s.id !== submit.data?.id)
  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="h2">{task.title}</h2>
        <p>{task.task_uz}</p>
        <p className="text-sm text-slate-700">
          Daraja: {task.level} · Uzunlik: {task.min_words}–{task.max_words} so'z
        </p>
        {task.required_words.length > 0 && (
          <p className="text-sm">
            Kerakli so'zlar:{' '}
            {task.required_words.map((w) => (
              <span key={w} lang="de" className={`chip mr-1 ${text.toLowerCase().includes(w.toLowerCase()) ? 'bg-green-100 text-green-900' : ''}`}>
                {w}
              </span>
            ))}
          </p>
        )}
        <div className="text-sm">
          <p className="font-medium">Baholash mezonlari:</p>
          <ul className="list-disc pl-5">
            {task.criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </section>
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit.mutate()
        }}
      >
        <UmlautField label="Matningiz (nemischa)" value={text} onChange={setText} multiline disabled={submit.isPending} />
        <p className={`text-sm ${n < task.min_words || n > task.max_words ? 'text-slate-600' : 'text-green-800'}`}>
          {n} so'z (tavsiya: {task.min_words}–{task.max_words})
        </p>
        {submit.isError && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage(submit.error)}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submit.isPending || n === 0}>
          {submit.isPending ? 'Tekshirilmoqda…' : 'Yuborish va tekshirish'}
        </button>
      </form>
      {submit.data && (
        <section className="card">
          <h2 className="h2 mb-2">Natija</h2>
          <SubmissionResult s={submit.data} task={task} />
        </section>
      )}
      {past.length > 0 && (
        <section className="card space-y-3">
          <h2 className="h2">Oldingi urinishlar</h2>
          {past.map((s) => (
            <details key={s.id}>
              <summary className="cursor-pointer text-sm">
                {formatDate(s.created_at)} · {s.word_count} so'z
              </summary>
              <SubmissionResult s={s} task={task} />
            </details>
          ))}
        </section>
      )}
    </div>
  )
}

export function WritingPage() {
  const q = useWritingTasks()
  const [params, setParams] = useSearchParams()
  return (
    <>
      <PageHeader title="Yozish" subtitle="Har bir modul uchun yozma topshiriq: avtomatik tekshiruv va (sozlangan bo'lsa) AI tavsiyalari." />
      <QueryView query={q} isEmpty={(t) => t.length === 0} empty="Yozma topshiriqlar hali yo'q.">
        {(tasks) => {
          const task = tasks.find((t) => t.id === params.get('task')) ?? tasks[0]
          return (
            <div className="space-y-4">
              <div>
                <label htmlFor="wtask" className="label">
                  Topshiriq
                </label>
                <select
                  id="wtask"
                  className="input"
                  value={task.id}
                  onChange={(e) => setParams({ task: e.target.value }, { replace: true })}
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.level} · {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <TaskView key={task.id} task={task} />
            </div>
          )
        }}
      </QueryView>
    </>
  )
}
