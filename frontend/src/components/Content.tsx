import { useMutation } from '@tanstack/react-query'
import { BookmarkCheck, BookmarkPlus, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { errorMessage, queryClient } from '../api/client'
import { api } from '../api/endpoints'
import type { Block, Example, Mistake, VocabOut } from '../api/types'
import { cardStateLabel, formatDate, formLabel, posLabel } from '../lib/labels'
import { SpeakButton } from './Audio'

/** Explanation blocks: p / table / tip (§5). */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === 'table' && b.headers && b.rows) {
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    {b.headers.map((h) => (
                      <th key={h} scope="col" className="border-b-2 border-slate-300 px-3 py-2 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, ri) => (
                    <tr key={ri} className="odd:bg-slate-50">
                      {r.map((c, ci) => (
                        <td key={ci} className="border-b border-slate-200 px-3 py-2">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (b.type === 'tip') {
          return (
            <p key={i} className="flex gap-2 rounded-lg bg-indigo-50 p-3 text-indigo-950">
              <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                <strong>Maslahat: </strong>
                {b.text}
              </span>
            </p>
          )
        }
        return (
          <p key={i} className="leading-relaxed">
            {b.text}
          </p>
        )
      })}
    </div>
  )
}

export function Examples({ examples }: { examples: Example[] }) {
  return (
    <ul className="space-y-2">
      {examples.map((e, i) => (
        <li key={i} className="flex items-start gap-2">
          <SpeakButton text={e.de} />
          <div>
            <p lang="de" className="font-medium">
              {e.de}
            </p>
            <p className="muted">{e.uz}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Mistakes({ mistakes }: { mistakes: Mistake[] }) {
  return (
    <ul className="space-y-2">
      {mistakes.map((m, i) => (
        <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
          <p>
            <span className="font-medium text-red-800">Xato: </span>
            <s lang="de">{m.wrong}</s>
          </p>
          <p>
            <span className="font-medium text-green-800">To'g'ri: </span>
            <span lang="de">{m.right}</span>
          </p>
          <p className="muted">{m.why}</p>
        </li>
      ))}
    </ul>
  )
}

export function SaveWordButton({ vocab }: { vocab: VocabOut }) {
  const [saved, setSaved] = useState(vocab.user?.saved ?? false)
  const m = useMutation({
    mutationFn: () => (saved ? api.unsaveWord(vocab.id) : api.saveWord(vocab.id)),
    onSuccess: (res) => {
      setSaved(res.user?.saved ?? !saved)
      void queryClient.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
  return (
    <div>
      <button type="button" className="btn btn-sm" aria-pressed={saved} disabled={m.isPending} onClick={() => m.mutate()}>
        {saved ? <BookmarkCheck aria-hidden className="size-4" /> : <BookmarkPlus aria-hidden className="size-4" />}
        {saved ? "Lug'atda" : "Lug'atga qo'shish"}
      </button>
      {m.isError && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {errorMessage(m.error)}
        </p>
      )}
    </div>
  )
}

export function VocabCard({ vocab, showUserStats = false }: { vocab: VocabOut; showUserStats?: boolean }) {
  const word = vocab.article ? `${vocab.article} ${vocab.de}` : vocab.de
  const u = vocab.user
  return (
    <article className="card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 lang="de" className="text-lg font-semibold break-words">
            {word}
          </h3>
          <p className="text-slate-800">{vocab.uz}</p>
        </div>
        <SpeakButton text={word} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-slate-500">Turkum</dt>
        <dd>{posLabel[vocab.pos] ?? vocab.pos}</dd>
        {vocab.pos === 'noun' && vocab.plural && (
          <>
            <dt className="text-slate-500">Ko'plik</dt>
            <dd lang="de">{vocab.plural === '-' ? "ko'plik shakli yo'q" : vocab.plural}</dd>
          </>
        )}
        {vocab.forms &&
          Object.entries(vocab.forms).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{formLabel[k] ?? k}</dt>
              <dd lang="de">{v}</dd>
            </div>
          ))}
      </dl>
      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-sm">
        <SpeakButton text={vocab.example_de} label={`Misolni tinglash: ${vocab.example_de}`} />
        <div>
          <p lang="de">{vocab.example_de}</p>
          <p className="text-slate-600">{vocab.example_uz}</p>
        </div>
      </div>
      {showUserStats && u && (
        <p className="text-xs text-slate-600">
          Holat: {cardStateLabel[u.state]} · to'g'ri {u.correct_count} / xato {u.wrong_count}
          {u.due_at && <> · keyingi takrorlash: {formatDate(u.due_at)}</>}
        </p>
      )}
      <div className="mt-auto pt-1">
        <SaveWordButton vocab={vocab} />
      </div>
    </article>
  )
}
