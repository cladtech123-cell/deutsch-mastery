import { ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useGrammarList, useGrammarTopic } from '../api/queries'
import type { GrammarSummary } from '../api/types'
import { TtsStatus } from '../components/Audio'
import { Blocks, Examples, Mistakes } from '../components/Content'
import { PageHeader, QueryView } from '../components/States'
import { ExerciseCard } from '../features/exercises/ExerciseCard'

function TopicLinks({ ids, titles, label }: { ids: string[]; titles: Map<string, string>; label: string }) {
  if (ids.length === 0) return null
  return (
    <p className="text-sm">
      <span className="text-stone-600">{label}: </span>
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <Link to={`/grammar/${id}`} className="text-ink underline">
            {titles.get(id) ?? id}
          </Link>
        </span>
      ))}
    </p>
  )
}

const titleMap = (list: GrammarSummary[] | undefined) => new Map((list ?? []).map((t) => [t.id, t.title]))

/** Topic map: grouped by level, in order, each with prerequisites and next topics. */
export function GrammarListPage() {
  const q = useGrammarList()
  return (
    <>
      <PageHeader title="Grammatika markazi" subtitle="Mavzular xaritasi: avval oldingi bilimlar, keyin keyingi mavzular." />
      <QueryView query={q} isEmpty={(l) => l.length === 0} empty="Grammatika mavzulari hali yuklanmagan.">
        {(list) => {
          const titles = titleMap(list)
          return (
            <div className="space-y-6">
              {(['A1', 'A2'] as const).map((lvl) => {
                const topics = list.filter((t) => t.level === lvl).sort((a, b) => a.order - b.order)
                if (topics.length === 0) return null
                return (
                  <section key={lvl} aria-labelledby={`g-${lvl}`}>
                    <h2 id={`g-${lvl}`} className="h2 mb-3">
                      {lvl}
                    </h2>
                    <ol className="space-y-2">
                      {topics.map((t) => (
                        <li key={t.id} className="card">
                          <Link to={`/grammar/${t.id}`} className="flex items-center justify-between gap-2 font-semibold">
                            <span>
                              {t.order}. {t.title}
                            </span>
                            <ArrowRight aria-hidden className="size-4 shrink-0" />
                          </Link>
                          <TopicLinks ids={t.prerequisites} titles={titles} label="Oldin o'rganing" />
                          <TopicLinks ids={t.next} titles={titles} label="Keyingi" />
                        </li>
                      ))}
                    </ol>
                  </section>
                )
              })}
            </div>
          )
        }}
      </QueryView>
    </>
  )
}

export function GrammarTopicPage() {
  const { id = '' } = useParams()
  const q = useGrammarTopic(id)
  const list = useGrammarList()
  const titles = titleMap(list.data)
  return (
    <QueryView query={q}>
      {(t) => (
        <article className="space-y-5">
          <PageHeader title={t.title} subtitle={`${t.level} grammatika`}>
            <Link to="/grammar" className="btn btn-sm">
              Mavzular xaritasi
            </Link>
          </PageHeader>
          <div className="card space-y-1">
            <TopicLinks ids={t.prerequisites} titles={titles} label="Oldingi bilimlar" />
            <TopicLinks ids={t.next} titles={titles} label="Keyingi mavzular" />
          </div>
          <section className="card space-y-3">
            <div>
              <h2 className="font-semibold">Qoida</h2>
              <p>{t.rule}</p>
            </div>
            <div>
              <h2 className="font-semibold">Qachon ishlatiladi</h2>
              <p>{t.when}</p>
            </div>
            <div>
              <h2 className="font-semibold">Gap tuzilishi</h2>
              <p lang="de" className="rounded bg-stone-100 px-2 py-1 font-mono text-sm">
                {t.structure}
              </p>
            </div>
            {t.explanation && t.explanation.length > 0 && <Blocks blocks={t.explanation} />}
          </section>
          <section className="card space-y-2">
            <h2 className="font-semibold">Misollar</h2>
            <TtsStatus />
            <Examples examples={t.examples} />
          </section>
          <section className="card space-y-2">
            <h2 className="font-semibold">Ko'p uchraydigan xatolar</h2>
            <Mistakes mistakes={t.common_mistakes} />
          </section>
          <section className="space-y-3">
            <h2 className="h2">Mashqlar</h2>
            {t.exercises.map((e, i) => (
              <ExerciseCard key={e.id} exercise={e} index={i + 1} />
            ))}
          </section>
        </article>
      )}
    </QueryView>
  )
}
