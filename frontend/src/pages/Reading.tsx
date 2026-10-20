import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useReading, useReadingList } from '../api/queries'
import type { ReadingOut } from '../api/types'
import { SpeakButton, TtsStatus } from '../components/Audio'
import { PageHeader, QueryView } from '../components/States'
import { ExerciseCard } from '../features/exercises/ExerciseCard'

export function ReadingListPage() {
  const q = useReadingList()
  return (
    <>
      <PageHeader title="O'qish" subtitle="Darajangizga mos matnlar. Notanish so'zni bosing — tarjimasi chiqadi." />
      <QueryView query={q} isEmpty={(l) => l.length === 0} empty="O'qish matnlari hali yo'q.">
        {(list) => (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((t) => (
              <li key={t.id}>
                <Link to={`/reading/${t.id}`} className="card flex items-center justify-between gap-2 hover:border-indigo-300">
                  <span>
                    <span className="chip mr-2">{t.level}</span>
                    <span lang="de" className="font-semibold">
                      {t.title}
                    </span>
                    <span className="muted block">{t.title_uz}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </>
  )
}

const clean = (w: string) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')

function GlossText({ text }: { text: ReadingOut }) {
  const gloss = new Map(Object.entries(text.glossary).map(([k, v]) => [k.toLowerCase(), v]))
  const [picked, setPicked] = useState<{ word: string; tr: string } | null>(null)
  return (
    <div className="space-y-3">
      <div aria-live="polite" className="min-h-12 rounded-lg bg-indigo-50 p-3 text-indigo-950">
        {picked ? (
          <span className="flex items-center gap-2">
            <SpeakButton text={picked.word} />
            <strong lang="de">{picked.word}</strong> — {picked.tr}
          </span>
        ) : (
          <span className="text-sm">Ostiga chizilgan so'zni bosing — tarjimasi shu yerda chiqadi.</span>
        )}
      </div>
      <div lang="de" className="card space-y-3 text-lg leading-relaxed">
        {text.body.split(/\n+/).map((para, pi) => (
          <p key={pi}>
            {para.split(/(\s+)/).map((tok, i) => {
              const w = clean(tok)
              const tr = w && gloss.get(w.toLowerCase())
              if (!tr) return tok
              return (
                <button
                  key={i}
                  type="button"
                  className="cursor-pointer underline decoration-indigo-400 decoration-dotted underline-offset-4 hover:bg-indigo-50"
                  onClick={() => setPicked({ word: w, tr })}
                >
                  {tok}
                </button>
              )
            })}
          </p>
        ))}
      </div>
      <details className="card text-sm">
        <summary className="cursor-pointer font-medium">Lug'at ({gloss.size})</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {Object.entries(text.glossary).map(([k, v]) => (
            <div key={k} className="contents">
              <dt lang="de" className="font-medium">
                {k}
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}

export function ReadingTextPage() {
  const { id = '' } = useParams()
  const q = useReading(id)
  return (
    <QueryView query={q}>
      {(t) => (
        <article className="space-y-4">
          <PageHeader title={t.title} subtitle={`${t.level} · ${t.title_uz}`}>
            <Link to="/reading" className="btn btn-sm">
              Barcha matnlar
            </Link>
          </PageHeader>
          <TtsStatus />
          <GlossText text={t} />
          <section className="space-y-3">
            <h2 className="h2">Savollar</h2>
            {t.questions.map((e, i) => (
              <ExerciseCard key={e.id} exercise={e} index={i + 1} />
            ))}
          </section>
        </article>
      )}
    </QueryView>
  )
}
