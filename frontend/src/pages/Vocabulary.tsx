import { useDeferredValue, useState } from 'react'
import { useVocabulary } from '../api/queries'
import { TtsStatus } from '../components/Audio'
import { VocabCard } from '../components/Content'
import { PageHeader, QueryView } from '../components/States'

type Filter = 'all' | 'saved' | 'weak'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'saved', label: 'Saqlanganlar' },
  { value: 'weak', label: 'Zaif so\'zlar' },
]

export function VocabularyPage() {
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const q = useDeferredValue(search.trim())
  const query = useVocabulary({
    q: q || undefined,
    topic: topic || undefined,
    level: level || undefined,
    saved: filter === 'saved' || undefined,
    weak: filter === 'weak' || undefined,
  })
  const topics = query.data?.topics ?? []

  return (
    <>
      <PageHeader title="Lug'at" subtitle="So'zlarni qidiring, mavzu bo'yicha saralang va o'z lug'atingizga qo'shing." />
      <div className="card mb-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor="vq" className="label">
            Qidirish (nemischa yoki o'zbekcha)
          </label>
          <input id="vq" type="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label htmlFor="vtopic" className="label">
            Mavzu
          </label>
          <select id="vtopic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Barcha mavzular</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="vlevel" className="label">
            Daraja
          </label>
          <select id="vlevel" className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">A1 va A2</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
          </select>
        </div>
        <fieldset>
          <legend className="label">Ko'rsatish</legend>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                className={`btn btn-sm ${filter === f.value ? 'btn-primary' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mb-3">
        <TtsStatus />
      </div>
      <QueryView
        query={query}
        isEmpty={(d) => d.items.length === 0}
        empty={
          filter === 'saved'
            ? "Saqlangan so'z yo'q. Dars yoki lug'atdagi \"Lug'atga qo'shish\" tugmasini bosing."
            : filter === 'weak'
              ? "Zaif so'zlar yo'q — takrorlashda xato qilingan so'zlar shu yerda chiqadi."
              : "Hech narsa topilmadi."
        }
      >
        {(d) => (
          <>
            <p className="muted mb-2">{d.items.length} ta so'z</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {d.items.map((v) => (
                <VocabCard key={`${v.id}-${v.user?.saved ?? false}`} vocab={v} showUserStats />
              ))}
            </div>
          </>
        )}
      </QueryView>
    </>
  )
}
