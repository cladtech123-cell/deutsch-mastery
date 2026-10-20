import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { PracticeQuery } from '../api/endpoints'
import { useListening, usePractice } from '../api/queries'
import { DialoguePlayer } from '../components/Audio'
import { PageHeader, QueryView } from '../components/States'
import { ExerciseCard } from '../features/exercises/ExerciseCard'
import { skillLabel } from '../lib/labels'

export function ListeningPage() {
  const q = useListening()
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <>
      <PageHeader title="Tinglash" subtitle="Dialoglarni jumlama-jumla tinglang, tezlikni sozlang, matnni yashiring yoki ko'rsating." />
      <QueryView query={q} isEmpty={(items) => items.length === 0} empty="Tinglash materiallari hali yo'q.">
        {(items) => {
          const item = items.find((i) => i.lesson_id === selected) ?? items[0]
          return (
            <div className="space-y-4">
              <div>
                <label htmlFor="lsel" className="label">
                  Dialog
                </label>
                <select id="lsel" className="input" value={item.lesson_id} onChange={(e) => setSelected(e.target.value)}>
                  {items.map((i) => (
                    <option key={i.lesson_id} value={i.lesson_id}>
                      {i.level} · {i.lesson_title} — {i.title}
                    </option>
                  ))}
                </select>
              </div>
              <section key={item.lesson_id} className="space-y-3">
                <h2 className="h2">{item.title}</h2>
                <DialoguePlayer lines={item.lines} hideTextByDefault />
                <h3 className="font-semibold">Savollar</h3>
                {item.questions.map((e, i) => (
                  <ExerciseCard key={e.id} exercise={e} index={i + 1} />
                ))}
                <Link to={`/lessons/${item.lesson_id}`} className="text-sm text-indigo-700 underline">
                  Darsni ochish
                </Link>
              </section>
            </div>
          )
        }}
      </QueryView>
    </>
  )
}

/** /practice?mode=mistakes|topic|skill — mistakes and weak-topic drills (GET /practice). */
export function PracticePage() {
  const [params] = useSearchParams()
  const mode = (params.get('mode') ?? 'mistakes') as PracticeQuery['mode']
  const topic = params.get('topic') ?? undefined
  const skill = params.get('skill') ?? undefined
  const q = usePractice({ mode, topic, skill, limit: 10 })
  const title =
    mode === 'topic' && topic
      ? `Mavzu bo'yicha mashq: ${topic}`
      : mode === 'skill' && skill
        ? `Ko'nikma bo'yicha mashq: ${skillLabel[skill] ?? skill}`
        : 'Xatolar ustida ishlash'
  return (
    <>
      <PageHeader title={title} subtitle="Avval xato qilingan yoki zaif mavzudagi savollar." />
      <QueryView
        query={q}
        isEmpty={(d) => d.exercises.length === 0}
        empty="Bu yerda mashq yo'q — hali xato qilinmagan yoki mavzu bo'yicha mashq topilmadi."
      >
        {(d) => (
          <div className="space-y-3">
            {d.exercises.map((e, i) => (
              <ExerciseCard key={e.id} exercise={e} index={i + 1} />
            ))}
            <button type="button" className="btn" onClick={() => void q.refetch()}>
              Yangi savollar
            </button>
          </div>
        )}
      </QueryView>
    </>
  )
}
