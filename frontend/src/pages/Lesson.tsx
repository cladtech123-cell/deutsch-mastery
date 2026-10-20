import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { errorMessage, queryClient } from '../api/client'
import { api, type Answers } from '../api/endpoints'
import { invalidateProgress, keys, useLesson } from '../api/queries'
import type { CheckResult, ExerciseOut, ExerciseRef, LessonOut } from '../api/types'
import { DialoguePlayer, TtsStatus } from '../components/Audio'
import { Blocks, Examples, Mistakes, VocabCard } from '../components/Content'
import { Empty, PageHeader, QueryView } from '../components/States'
import { ExamForm, ExerciseCard, Feedback, ResultsList, RetryExercise } from '../features/exercises/ExerciseCard'
import { skillLabel } from '../lib/labels'

const SECTIONS = [
  ['maqsad', 'Maqsad'],
  ['tushuntirish', 'Tushuntirish'],
  ['lugat', "Lug'at"],
  ['grammatika', 'Grammatika'],
  ['tinglash', 'Tinglash'],
  ['mashqlar', 'Mashqlar'],
  ['vaziyat', 'Real vaziyat'],
  ['test', 'Yakuniy test'],
  ['xatolar', 'Xatolar tahlili'],
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 space-y-3">
      <h2 id={`${id}-h`} className="h2 border-b border-slate-200 pb-1">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function LessonPage() {
  const { id = '' } = useParams()
  const q = useLesson(id)
  return <QueryView query={q}>{(lesson) => <LessonView key={lesson.id} lesson={lesson} />}</QueryView>
}

interface Mistake {
  exercise: ExerciseOut
  result: CheckResult
}

function LessonView({ lesson }: { lesson: LessonOut }) {
  const byId = new Map([...lesson.exercises, ...lesson.final_test].map((e) => [e.id, e]))
  const resolve = (refs: ExerciseRef[]) =>
    refs.map((r) => (typeof r === 'string' ? byId.get(r) : r)).filter((e): e is ExerciseOut => !!e)
  const grammarIds = new Set(lesson.grammar.flatMap((g) => resolve(g.check).map((e) => e.id)))
  const listeningQs = resolve(lesson.listening.questions)
  const listeningIds = new Set(listeningQs.map((e) => e.id))
  // Exercises already shown under grammar/listening are not repeated in "Mashqlar".
  const practice = lesson.exercises.filter((e) => !grammarIds.has(e.id) && !listeningIds.has(e.id))
  const reviewWords = lesson.review_vocabulary.filter((v) => typeof v !== 'string')
  const reviewIds = lesson.review_vocabulary.filter((v) => typeof v === 'string')

  const [mistakes, setMistakes] = useState<Map<string, Mistake>>(new Map())
  const record = (exercise: ExerciseOut, result: CheckResult) =>
    setMistakes((prev) => {
      const next = new Map(prev)
      if (result.correct) next.delete(exercise.id)
      else next.set(exercise.id, { exercise, result })
      return next
    })

  const final = useMutation({
    mutationFn: (answers: Answers) => api.submitFinal(lesson.id, answers),
    onSuccess: (res) => {
      for (const r of res.results) {
        const ex = byId.get(r.exercise_id)
        if (ex) record(ex, r)
      }
      invalidateProgress()
      void queryClient.invalidateQueries({ queryKey: keys.lesson(lesson.id) })
      void queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
      void queryClient.invalidateQueries({ queryKey: keys.review })
    },
  })

  let n = 0
  const card = (e: ExerciseOut) => <ExerciseCard key={e.id} exercise={e} index={++n} onChecked={record} />

  return (
    <article className="space-y-8">
      <PageHeader
        title={lesson.title}
        subtitle={
          <>
            <span lang="de">{lesson.title_de}</span> · {lesson.level}, {lesson.module}-modul, {lesson.order}-dars
            {lesson.progress && (
              <>
                {' '}
                · {lesson.progress.status === 'completed' ? 'tugallangan' : 'boshlangan'}
                {lesson.progress.best_score != null && `, eng yaxshi natija ${Math.round(lesson.progress.best_score)}%`}
              </>
            )}
          </>
        }
      />

      <nav aria-label="Dars bo'limlari" className="-mx-4 overflow-x-auto px-4 pb-2">
        <ol className="flex gap-2 whitespace-nowrap">
          {SECTIONS.map(([sid, label], i) => (
            <li key={sid}>
              <a
                href={`#${sid}`}
                className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-card transition-colors duration-150 hover:border-indigo-300 hover:text-indigo-700"
              >
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="maqsad" title="Dars maqsadi">
        <p className="card text-lg">{lesson.goal}</p>
        <p className="flex flex-wrap gap-1.5">
          {lesson.skill_focus.map((s) => (
            <span key={s} className="chip">
              {skillLabel[s] ?? s}
            </span>
          ))}
        </p>
      </Section>

      <Section id="tushuntirish" title="Qisqa tushuntirish">
        <div className="card">
          <Blocks blocks={lesson.explanation} />
        </div>
      </Section>

      <Section id="lugat" title="Lug'at">
        <TtsStatus />
        <h3 className="font-semibold">Yangi so'zlar ({lesson.vocabulary.length})</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {lesson.vocabulary.map((v) => (
            <VocabCard key={v.id} vocab={v} />
          ))}
        </div>
        {(reviewWords.length > 0 || reviewIds.length > 0) && (
          <>
            <h3 className="font-semibold">Takrorlash uchun eski so'zlar</h3>
            {reviewWords.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {reviewWords.map((v) => (
                  <VocabCard key={v.id} vocab={v} />
                ))}
              </div>
            ) : (
              <p className="muted">{reviewIds.join(', ')}</p>
            )}
          </>
        )}
      </Section>

      <Section id="grammatika" title="Grammatika">
        {lesson.grammar.length === 0 && <Empty>Bu darsda yangi grammatika yo'q.</Empty>}
        {lesson.grammar.map((g) => (
          <div key={g.topic_id} className="space-y-3">
            <div className="card space-y-3">
              <div>
                <h3 className="font-semibold">Qoida</h3>
                <p>{g.rule}</p>
              </div>
              <div>
                <h3 className="font-semibold">Qachon ishlatiladi</h3>
                <p>{g.when}</p>
              </div>
              <div>
                <h3 className="font-semibold">Gap tuzilishi</h3>
                <p lang="de" className="rounded bg-slate-100 px-2 py-1 font-mono text-sm">
                  {g.structure}
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Misollar</h3>
                <Examples examples={g.examples} />
              </div>
              <div>
                <h3 className="mb-1 font-semibold">Ko'p uchraydigan xatolar</h3>
                <Mistakes mistakes={g.common_mistakes} />
              </div>
              <Link to={`/grammar/${g.topic_id}`} className="text-sm text-indigo-700 underline">
                Grammatika markazida batafsil
              </Link>
            </div>
            <h3 className="font-semibold">Tekshiruv mashqlari</h3>
            {resolve(g.check).map(card)}
          </div>
        ))}
      </Section>

      <Section id="tinglash" title={`Tinglash: ${lesson.listening.title}`}>
        <DialoguePlayer lines={lesson.listening.lines} hideTextByDefault />
        {listeningQs.map(card)}
      </Section>

      <Section id="mashqlar" title="Mashqlar">
        {practice.length === 0 ? <Empty>Qo'shimcha mashq yo'q.</Empty> : practice.map(card)}
      </Section>

      <Section id="vaziyat" title={`Real vaziyat: ${lesson.situation.title}`}>
        <p className="card">{lesson.situation.context_uz}</p>
        <DialoguePlayer lines={lesson.situation.lines} />
        <p className="rounded-lg bg-indigo-50 p-3 text-indigo-950">
          <strong>Topshiriq: </strong>
          {lesson.situation.task_uz}
        </p>
        <Link to="/speaking" className="btn">
          Gapirish bo'limida mashq qilish
        </Link>
      </Section>

      <Section id="test" title="Yakuniy test">
        {final.data ? (
          <div className="space-y-3">
            <div
              role="status"
              className={`card ${final.data.passed ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}
            >
              <p className="text-lg font-semibold">
                Natija: {final.data.score} / {final.data.total} ({Math.round(final.data.percent)}%)
              </p>
              <p>
                {final.data.passed
                  ? "Tabriklaymiz, dars tugallandi! Dars so'zlari takrorlash ro'yxatiga qo'shildi."
                  : "O'tish uchun kamida 70% kerak. Xatolar tahlilini ko'rib, qayta urinib ko'ring."}
              </p>
              <button type="button" className="btn mt-2" onClick={() => final.reset()}>
                Testni qayta topshirish
              </button>
            </div>
            <ResultsList results={final.data.results} exercises={lesson.final_test} />
          </div>
        ) : (
          <>
            <p className="muted">{lesson.final_test.length} ta savol. Natija darhol ko'rsatiladi.</p>
            <ExamForm
              sections={[{ exercises: lesson.final_test }]}
              pending={final.isPending}
              onSubmit={(answers) => final.mutate(answers)}
              submitLabel="Testni yakunlash"
            />
          </>
        )}
        {final.isError && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage(final.error)}
          </p>
        )}
      </Section>

      <Section id="xatolar" title="Xatolar tahlili">
        {mistakes.size === 0 ? (
          <Empty>Hozircha xato yo'q. Mashq va test xatolari shu yerda tushuntirish bilan ko'rsatiladi.</Empty>
        ) : (
          <ol className="space-y-4">
            {[...mistakes.values()].map(({ exercise, result }) => (
              <li key={exercise.id} className="card space-y-2">
                <p className="font-medium">{exercise.question}</p>
                <Feedback result={result} />
                {result.retry_exercise && <RetryExercise exercise={result.retry_exercise} />}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </article>
  )
}
