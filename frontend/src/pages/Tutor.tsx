import { useMutation } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage, statusOf } from '../api/client'
import { api } from '../api/endpoints'
import { useAiStatus } from '../api/queries'
import { PageHeader, QueryView } from '../components/States'

const NOT_CONFIGURED =
  "AI tutor hozircha sozlanmagan: serverda AI xizmati (AI_PROVIDER va API kaliti) yoqilmagan. Kursning qolgan barcha qismlari — darslar, lug'at, takrorlash, testlar va progress — odatdagidek ishlaydi."

function NotConfigured() {
  return (
    <div role="note" className="card space-y-2 border-amber-200 bg-amber-50 text-amber-950">
      <p>{NOT_CONFIGURED}</p>
      <Link to="/lessons" className="btn">
        Darsga o'tish
      </Link>
    </div>
  )
}

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string>()
  const send = useMutation({
    mutationFn: (message: string) => api.tutor(message, sessionId),
    onSuccess: (r) => {
      setSessionId(r.session_id)
      setMessages((m) => [...m, { role: 'assistant', text: r.reply }])
    },
  })
  const unavailable = statusOf(send.error) === 503
  if (unavailable) return <NotConfigured />
  return (
    <div className="space-y-3">
      <ol className="space-y-2" aria-live="polite">
        {messages.length === 0 && (
          <li className="muted">
            Masalan: "Akkusativ nima?", "Ich habe gestern Fußball gespielt — to'g'rimi?", "Restoranda buyurtma berishni mashq
            qilaylik".
          </li>
        )}
        {messages.map((m, i) => (
          <li
            key={i}
            className={`max-w-[90%] rounded-xl px-3 py-2 whitespace-pre-wrap ${m.role === 'user' ? 'ml-auto bg-ink text-white' : 'border border-stone-200 bg-white'}`}
          >
            <span className="sr-only">{m.role === 'user' ? 'Siz: ' : 'Tutor: '}</span>
            {/* Plain text only — model output is never rendered as HTML. */}
            {m.text}
          </li>
        ))}
        {send.isPending && <li className="muted">Tutor yozmoqda…</li>}
      </ol>
      {send.isError && (
        <p role="alert" className="text-sm text-red-700">
          {statusOf(send.error) === 429 ? "Bugungi AI xabarlar limiti tugadi. Ertaga qayta urinib ko'ring." : errorMessage(send.error)}
        </p>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const text = input.trim()
          if (!text) return
          setMessages((m) => [...m, { role: 'user', text }])
          setInput('')
          send.mutate(text)
        }}
      >
        <div className="flex-1">
          <label htmlFor="tutor-in" className="sr-only">
            Xabar
          </label>
          <textarea
            id="tutor-in"
            rows={2}
            className="input"
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Savolingizni yozing…"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={send.isPending || !input.trim()} aria-label="Yuborish">
          <Send aria-hidden className="size-4" />
        </button>
      </form>
      <p className="text-xs text-stone-600">
        AI javoblari xato bo'lishi mumkin. Grammatika qoidalarini kurs materiallari bilan solishtiring.
      </p>
    </div>
  )
}

export function TutorPage() {
  const status = useAiStatus()
  return (
    <>
      <PageHeader title="AI tutor" subtitle="O'zbek tilida tushuntiradigan nemis tili yordamchisi." />
      <QueryView query={status}>{(s) => (s.configured ? <Chat /> : <NotConfigured />)}</QueryView>
    </>
  )
}
