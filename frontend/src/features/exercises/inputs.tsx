import { Mic, Volume2, VolumeX, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { NO_AUDIO_TEXT } from '../../components/Audio'
import type { Answer, ExerciseOut, ExerciseType } from '../../api/types'
import { dict, list, str } from './answer'
import { wordCount } from '../../lib/labels'
import { recognitionSupported, recognizeOnce, RECOGNITION_PRIVACY_NOTE } from '../../lib/speech'
import { useTts } from '../../lib/tts'

const CHOICE = new Set<ExerciseType>([
  'multiple_choice', 'situation_choice', 'next_line', 'reading', 'listen_choice', 'article', 'find_error',
])
const TEXT = new Set<ExerciseType>(['fill_blank', 'conjugate', 'plural', 'translate_de_uz', 'translate_uz_de', 'dictation'])
const OPEN = new Set<ExerciseType>(['short_text', 'speak'])

export interface InputProps {
  exercise: ExerciseOut
  value: Answer | undefined
  onChange: (v: Answer) => void
  disabled?: boolean
}

/** Question text, German prompt and (for listen_choice/dictation) the audio. */
export function ExerciseQuestion({ exercise }: { exercise: ExerciseOut }) {
  const showPrompt = exercise.prompt_de && !exercise.question.includes(exercise.prompt_de)
  return (
    <div className="space-y-2">
      <p className="font-medium">{exercise.question}</p>
      {showPrompt && (
        <p lang="de" className="rounded-lg bg-slate-100 px-3 py-2 text-lg">
          {exercise.prompt_de}
        </p>
      )}
      {exercise.audio_text && <AudioPrompt text={exercise.audio_text} />}
    </div>
  )
}

function AudioPrompt({ text }: { text: string }) {
  const tts = useTts()
  const [reveal, setReveal] = useState(false)
  if (tts.available) {
    return (
      <button type="button" className="btn" onClick={() => tts.speak(text)}>
        <Volume2 aria-hidden className="size-4" /> Audioni tinglash
      </button>
    )
  }
  return (
    <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="note">
      <p className="flex items-start gap-2">
        <VolumeX aria-hidden className="mt-0.5 size-4 shrink-0" />
        {NO_AUDIO_TEXT}
      </p>
      {reveal ? (
        <p lang="de" className="text-base font-medium text-slate-900">
          {text}
        </p>
      ) : (
        <button type="button" className="btn btn-sm" onClick={() => setReveal(true)}>
          Audio o'rniga matnni ko'rsatish
        </button>
      )}
    </div>
  )
}

function ChoiceInput({ exercise, value, onChange, disabled }: InputProps) {
  const name = useId()
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">Javob variantlari</legend>
      <div className="grid gap-2">
        {(exercise.options ?? []).map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 has-checked:border-indigo-600 has-checked:bg-indigo-50"
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="size-4 accent-indigo-700"
            />
            <span lang={exercise.type === 'find_error' || exercise.type === 'article' ? 'de' : undefined}>{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü']

/** Text field with ä ö ü ß insert buttons (§5: grader warns on ae/oe/ue/ss, UI makes umlauts easy). */
export function UmlautField({
  value,
  onChange,
  disabled,
  label,
  multiline = false,
  german = true,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  label: string
  multiline?: boolean
  german?: boolean
}) {
  const id = useId()
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const insert = (ch: string) => {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + ch + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + ch.length, start + ch.length)
    })
  }
  const common = {
    id,
    ref,
    value,
    disabled,
    lang: german ? 'de' : undefined,
    autoComplete: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    className: 'input',
  }
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={5} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />
      )}
      {german && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Maxsus harflar">
          {UMLAUTS.map((ch) => (
            <button
              key={ch}
              type="button"
              className="btn btn-sm min-w-9 font-semibold"
              disabled={disabled}
              onClick={() => insert(ch)}
              aria-label={`${ch} harfini qo'shish`}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TextInput({ exercise, value, onChange, disabled }: InputProps) {
  return (
    <UmlautField
      label="Javobingiz"
      value={str(value)}
      onChange={onChange}
      disabled={disabled}
      german={exercise.type !== 'translate_de_uz'}
    />
  )
}

function MatchInput({ exercise, value, onChange, disabled }: InputProps) {
  const pairs = dict(value)
  const baseId = useId()
  const used = new Set(Object.values(pairs))
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="sr-only">Juftlash</legend>
      {(exercise.left ?? []).map((l, i) => (
        <div key={l} className="grid grid-cols-1 items-center gap-1 sm:grid-cols-2 sm:gap-3">
          <label htmlFor={`${baseId}-${i}`} lang="de" className="font-medium">
            {l}
          </label>
          <select
            id={`${baseId}-${i}`}
            className="input"
            value={pairs[l] ?? ''}
            onChange={(e) => onChange({ ...pairs, [l]: e.target.value })}
          >
            <option value="">— tanlang —</option>
            {(exercise.right ?? []).map((r) => (
              <option key={r} value={r}>
                {r}
                {used.has(r) && pairs[l] !== r ? ' (tanlangan)' : ''}
              </option>
            ))}
          </select>
        </div>
      ))}
    </fieldset>
  )
}

function OrderWordsInput({ exercise, value, onChange, disabled }: InputProps) {
  const chosen = list(value)
  // Remaining pool = options minus chosen, as a multiset (tokens may repeat).
  const pool = [...(exercise.options ?? [])]
  for (const w of chosen) {
    const i = pool.indexOf(w)
    if (i >= 0) pool.splice(i, 1)
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="label" id={`${exercise.id}-built`}>
          Sizning gapingiz
        </p>
        <div
          aria-labelledby={`${exercise.id}-built`}
          aria-live="polite"
          className="flex min-h-12 flex-wrap gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white p-2"
        >
          {chosen.length === 0 && <span className="self-center text-sm text-slate-500">So'zlarni bosib gap tuzing</span>}
          {chosen.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              lang="de"
              className="btn btn-sm border-indigo-300 bg-indigo-50 text-base"
              disabled={disabled}
              aria-label={`${w} — olib tashlash`}
              onClick={() => onChange(chosen.filter((_, k) => k !== i))}
            >
              {w} <X aria-hidden className="size-3" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="So'zlar">
        {pool.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            lang="de"
            className="btn text-base"
            disabled={disabled}
            onClick={() => onChange([...chosen, w])}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  )
}

function OpenInput({ exercise, value, onChange, disabled }: InputProps) {
  const text = str(value)
  const [recError, setRecError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const crit = exercise.criteria
  const lower = text.toLowerCase()
  const listen = async () => {
    setRecError(null)
    setListening(true)
    try {
      const heard = await recognizeOnce()
      onChange(text ? `${text} ${heard}` : heard)
    } catch (e) {
      setRecError(e instanceof Error ? e.message : String(e))
    } finally {
      setListening(false)
    }
  }
  return (
    <div className="space-y-2">
      {exercise.type === 'speak' && (
        <div className="space-y-2 rounded-lg bg-slate-100 p-3 text-sm">
          <p>Javobni avval ovoz chiqarib ayting, keyin yozing{recognitionSupported() ? ' yoki mikrofon orqali kiriting' : ''}.</p>
          {recognitionSupported() ? (
            <>
              <button type="button" className="btn btn-sm" disabled={disabled || listening} onClick={() => void listen()}>
                <Mic aria-hidden className="size-4" /> {listening ? 'Tinglanmoqda…' : 'Mikrofon orqali aytish'}
              </button>
              <p className="text-xs text-slate-600">{RECOGNITION_PRIVACY_NOTE}</p>
            </>
          ) : (
            <p className="text-xs text-slate-600">
              Brauzeringiz nutqni tanishni qo'llamaydi — aytganingizni yozib kiriting.
            </p>
          )}
          {recError && (
            <p role="alert" className="text-red-700">
              {recError}
            </p>
          )}
        </div>
      )}
      <UmlautField label="Javobingiz" value={text} onChange={onChange} disabled={disabled} multiline />
      {crit && (
        <ul className="text-sm text-slate-700" aria-label="Baholash mezonlari">
          <li>
            So'zlar soni: {wordCount(text)} / kamida {crit.min_words} {wordCount(text) >= crit.min_words ? '✓' : ''}
          </li>
          {crit.required_words.length > 0 && (
            <li>
              Kerakli so'zlar:{' '}
              {crit.required_words.map((w) => (
                <span key={w} lang="de" className={`chip mr-1 ${lower.includes(w.toLowerCase()) ? 'bg-green-100 text-green-900' : ''}`}>
                  {w}
                </span>
              ))}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function ExerciseInput(props: InputProps) {
  const t = props.exercise.type
  if (CHOICE.has(t)) return <ChoiceInput {...props} />
  if (TEXT.has(t)) return <TextInput {...props} />
  if (OPEN.has(t)) return <OpenInput {...props} />
  if (t === 'match') return <MatchInput {...props} />
  if (t === 'order_words') return <OrderWordsInput {...props} />
  return <p className="text-red-700">Noma'lum mashq turi: {t}</p>
}
