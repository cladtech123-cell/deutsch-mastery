import { useMutation } from '@tanstack/react-query'
import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'
import { api } from '../api/endpoints'
import { invalidateProgress, useListening } from '../api/queries'
import type { SpeakingAttemptOut } from '../api/types'
import { SpeakButton, TtsStatus } from '../components/Audio'
import { PageHeader, QueryView } from '../components/States'
import { recognitionSupported, recognizeOnce, RECOGNITION_PRIVACY_NOTE } from '../lib/speech'

const recorderSupported = () =>
  typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia

/** Records in the browser only (D8): the blob never leaves the page. */
function Recorder() {
  const [state, setState] = useState<'idle' | 'recording'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<MediaRecorder | null>(null)

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  if (!recorderSupported()) {
    return <p className="muted">Brauzeringiz ovoz yozishni qo'llamaydi. Gapni ovoz chiqarib ayting va o'zingizni baholang.</p>
  }

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: Blob[] = []
      const r = new MediaRecorder(stream)
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })))
        setState('idle')
      }
      rec.current = r
      r.start()
      setState('recording')
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? "Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering yoki gapni ovoz chiqarib aytib, o'zingizni baholang."
          : "Mikrofon topilmadi yoki ishlamayapti. Gapni ovoz chiqarib aytib, o'zingizni baholang.",
      )
    }
  }

  return (
    <div className="space-y-2">
      {state === 'recording' ? (
        <button type="button" className="btn btn-danger" onClick={() => rec.current?.stop()}>
          <Square aria-hidden className="size-4" /> Yozishni to'xtatish
        </button>
      ) : (
        <button type="button" className="btn" onClick={() => void start()}>
          <Mic aria-hidden className="size-4" /> Ovozimni yozish
        </button>
      )}
      {url && (
        <div>
          <p className="text-sm text-slate-700">Yozuvingiz (faqat shu brauzerda):</p>
          <audio controls src={url} className="w-full" />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

function SimilarityResult({ r }: { r: SpeakingAttemptOut }) {
  // Backend may report 0..1 or 0..100.
  const pct = r.similarity == null ? null : Math.round(r.similarity <= 1 ? r.similarity * 100 : r.similarity)
  return (
    <div role="status" className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {pct != null && (
        <p>
          Matn o'xshashligi: <strong>{pct}%</strong>
        </p>
      )}
      {r.diff.length > 0 && (
        <p lang="de" className="flex flex-wrap gap-1" aria-label="So'zma-so'z taqqoslash">
          {r.diff.map((d, i) => (
            <span
              key={i}
              className={`rounded px-1.5 ${d.ok ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900 underline decoration-wavy'}`}
            >
              {d.word}
              <span className="sr-only">{d.ok ? ' (to\'g\'ri)' : ' (farq bor)'}</span>
            </span>
          ))}
        </p>
      )}
      <p className="text-xs text-slate-600">
        Bu faqat tanilgan matnni asl matn bilan taqqoslash, talaffuzning fonetik bahosi emas. Qizil so'zlarni sekin
        tinglab, qayta ayting.
      </p>
    </div>
  )
}

function Shadowing({ target }: { target: string }) {
  const [recognized, setRecognized] = useState('')
  const [recError, setRecError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const attempt = useMutation({ mutationFn: api.speakingAttempt, onSuccess: invalidateProgress })

  const listen = async () => {
    setRecError(null)
    setListening(true)
    try {
      setRecognized(await recognizeOnce())
    } catch (e) {
      setRecError(e instanceof Error ? e.message : String(e))
    } finally {
      setListening(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-2">
        <SpeakButton text={target} />
        <p lang="de" className="text-xl font-medium">
          {target}
        </p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>Gapni tinglang (yoki o'qing).</li>
        <li>Diktor bilan birga yoki ortidan takrorlang (shadowing).</li>
        <li>Ovozingizni yozib, qayta tinglang va taqqoslang.</li>
      </ol>
      <Recorder />
      {recognitionSupported() ? (
        <div className="space-y-2">
          <button type="button" className="btn" disabled={listening} onClick={() => void listen()}>
            <Mic aria-hidden className="size-4" /> {listening ? 'Tinglanmoqda…' : 'Aytib, matnni tanitish'}
          </button>
          <p className="text-xs text-slate-600">{RECOGNITION_PRIVACY_NOTE}</p>
          {recognized && (
            <p>
              Tanilgan matn: <span lang="de" className="font-medium">{recognized}</span>
            </p>
          )}
          {recError && (
            <p role="alert" className="text-sm text-red-700">
              {recError}
            </p>
          )}
        </div>
      ) : (
        <p className="muted">
          Brauzeringizda nutqni tanish (SpeechRecognition) mavjud emas. Yozuvingizni tinglab, o'zingizni baholang.
        </p>
      )}
      <fieldset>
        <legend className="label">O'zingizni baholang (1 — qiyin, 5 — a'lo)</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={rating === n}
              className={`btn btn-sm min-w-10 ${rating === n ? 'btn-primary' : ''}`}
              onClick={() => setRating(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="btn btn-primary"
        disabled={attempt.isPending || (!recognized && rating == null)}
        onClick={() =>
          attempt.mutate({
            target_text: target,
            recognized_text: recognized || undefined,
            self_rating: rating ?? undefined,
          })
        }
      >
        Natijani saqlash
      </button>
      {attempt.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage(attempt.error)}
        </p>
      )}
      {attempt.data && <SimilarityResult r={attempt.data} />}
    </div>
  )
}

export function SpeakingPage() {
  const q = useListening()
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [line, setLine] = useState(0)
  return (
    <>
      <PageHeader title="Gapirish" subtitle="Tinglang, takrorlang, yozib oling va taqqoslang." />
      <section className="card mb-4 space-y-2 text-sm" aria-label="Maxfiylik">
        <h2 className="font-semibold">Maxfiylik</h2>
        <p>
          Ovoz yozuvlaringiz serverga yuborilmaydi va faqat shu sahifa ochiq turganda brauzeringizda saqlanadi. Serverga
          faqat maqsad matn, tanilgan matn va o'z bahoyingiz yuboriladi.
        </p>
        <p>{RECOGNITION_PRIVACY_NOTE}</p>
      </section>
      <div className="mb-3">
        <TtsStatus />
      </div>
      <QueryView query={q} isEmpty={(items) => items.length === 0} empty="Gapirish uchun dialoglar hali yo'q.">
        {(items) => {
          const item = items.find((i) => i.lesson_id === lessonId) ?? items[0]
          const idx = Math.min(line, item.lines.length - 1)
          return (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="sp-lesson" className="label">
                    Dialog
                  </label>
                  <select
                    id="sp-lesson"
                    className="input"
                    value={item.lesson_id}
                    onChange={(e) => {
                      setLessonId(e.target.value)
                      setLine(0)
                    }}
                  >
                    {items.map((i) => (
                      <option key={i.lesson_id} value={i.lesson_id}>
                        {i.level} · {i.lesson_title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sp-line" className="label">
                    Jumla
                  </label>
                  <select id="sp-line" className="input" value={idx} onChange={(e) => setLine(Number(e.target.value))}>
                    {item.lines.map((l, i) => (
                      <option key={i} value={i}>
                        {l.speaker}: {l.de}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="muted">Tarjima: {item.lines[idx].uz}</p>
              <Shadowing key={`${item.lesson_id}-${idx}`} target={item.lines[idx].de} />
            </div>
          )
        }}
      </QueryView>
    </>
  )
}
