import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { invalidateProgress, useReviewQueue } from '../api/queries'
import type { ReviewCard, ReviewQueue } from '../api/types'
import { SpeakButton, TtsStatus } from '../components/Audio'
import { PageHeader, ProgressBar, QueryView } from '../components/States'
import { cardStateLabel, formLabel } from '../lib/labels'

/** UI buttons → SM-2 quality (§6). */
const QUALITY = [
  { label: 'Yana', quality: 1, hint: 'eslay olmadim' },
  { label: 'Qiyin', quality: 3, hint: 'qiynalib esladim' },
  { label: 'Yaxshi', quality: 4, hint: 'esladim' },
  { label: 'Oson', quality: 5, hint: 'darhol esladim' },
] as const

export function ReviewPage() {
  const q = useReviewQueue()
  return (
    <>
      <PageHeader title="Takrorlash" subtitle="Interval takrorlash (SM-2): qiyin so'zlar tezroq, osonlari kechroq qaytadi." />
      <QueryView
        query={q}
        isEmpty={(d) => d.cards.length === 0}
        empty={
          <>
            Bugun takrorlanadigan so'z yo'q. Yangi so'zlar dars yakuniy testidan o'tganda qo'shiladi.{' '}
            <Link to="/lessons" className="text-ink underline">
              Darsga o'tish
            </Link>
          </>
        }
      >
        {(d) => <Session key={d.cards.map((c) => c.card_id).join()} queue={d} onRestart={() => void q.refetch()} />}
      </QueryView>
    </>
  )
}

function word(card: ReviewCard) {
  const v = card.vocab
  return v.article ? `${v.article} ${v.de}` : v.de
}

function Session({ queue, onRestart }: { queue: ReviewQueue; onRestart: () => void }) {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [counts, setCounts] = useState({ again: 0, ok: 0 })
  const answer = useMutation({
    mutationFn: ({ card, quality }: { card: ReviewCard; quality: number }) => api.answerReview(card.card_id, quality),
    onSuccess: (_r, { quality }) => {
      setCounts((c) => (quality < 3 ? { ...c, again: c.again + 1 } : { ...c, ok: c.ok + 1 }))
      setRevealed(false)
      setI((x) => x + 1)
      invalidateProgress()
    },
  })

  if (i >= queue.cards.length) {
    return (
      <div className="card space-y-3" role="status">
        <h2 className="h2">Seans tugadi!</h2>
        <p>
          {queue.cards.length} ta karta: {counts.ok} ta esladingiz, {counts.again} ta qayta takrorlanadi.
        </p>
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          Navbatni yangilash
        </button>
      </div>
    )
  }

  const card = queue.cards[i]
  const v = card.vocab
  const deFront = card.direction === 'de_uz'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <span>
          {i + 1} / {queue.cards.length} · jami muddati kelgan: {queue.due_total} · bugun yangi: {queue.new_today_left}
        </span>
        <TtsStatus />
      </div>
      <ProgressBar value={(i / queue.cards.length) * 100} label="Seans jarayoni" />
      <section className="card space-y-4 text-center" aria-live="polite">
        <p className="text-xs uppercase tracking-wide text-stone-600">
          {deFront ? "Nemischa → o'zbekcha" : "O'zbekcha → nemischa"} · {cardStateLabel[card.state]}
        </p>
        <div className="flex items-center justify-center gap-2">
          <p lang={deFront ? 'de' : undefined} className="text-3xl font-semibold">
            {deFront ? word(card) : v.uz}
          </p>
          {deFront && <SpeakButton text={word(card)} />}
        </div>
        {revealed ? (
          <div className="space-y-2 border-t border-stone-200 pt-4">
            <div className="flex items-center justify-center gap-2">
              <p lang={deFront ? undefined : 'de'} className="text-2xl font-medium text-ink">
                {deFront ? v.uz : word(card)}
              </p>
              {!deFront && <SpeakButton text={word(card)} />}
            </div>
            {v.plural && v.plural !== '-' && <p className="muted">Ko'plik: {v.plural}</p>}
            {v.forms && (
              <p className="muted">
                {Object.entries(v.forms)
                  .map(([k, f]) => `${formLabel[k] ?? k}: ${f}`)
                  .join(' · ')}
              </p>
            )}
            <p lang="de">{v.example_de}</p>
            <p className="muted">{v.example_uz}</p>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>
            Javobni ko'rsatish
          </button>
        )}
      </section>
      {revealed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Qanchalik esladingiz?">
          {QUALITY.map((b) => (
            <button
              key={b.quality}
              type="button"
              className="btn flex-col py-3"
              disabled={answer.isPending}
              onClick={() => answer.mutate({ card, quality: b.quality })}
            >
              <span className="text-base">{b.label}</span>
              <span className="text-xs font-normal text-stone-600">{b.hint}</span>
            </button>
          ))}
        </div>
      )}
      {answer.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage(answer.error)}
        </p>
      )}
    </div>
  )
}
