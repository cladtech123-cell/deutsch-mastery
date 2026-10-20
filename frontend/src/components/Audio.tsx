import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Line } from '../api/types'
import { useTts } from '../lib/tts'
import { useUi } from '../store/ui'

export const NO_AUDIO_TEXT =
  "Audio mavjud emas: brauzeringizda nemischa ovoz yo'q va server ovozi ham hozir ishlamayapti. Matnni o'qib mashq qiling."

/** Renders nothing when TTS is unavailable — never a fake audio button. Pair with <TtsStatus/>. */
export function SpeakButton({ text, label }: { text: string; label?: string }) {
  const tts = useTts()
  if (!tts.available) return null
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => tts.speak(text)}
      aria-label={label ?? `Tinglash: ${text}`}
      title="Tinglash"
    >
      <Volume2 aria-hidden className="size-4" />
    </button>
  )
}

export function RateControl() {
  const ttsRate = useUi((s) => s.ttsRate)
  const setTtsRate = useUi((s) => s.setTtsRate)
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      Tezlik
      <select className="input w-auto py-1" value={ttsRate} onChange={(e) => setTtsRate(Number(e.target.value))}>
        <option value={0.6}>Juda sekin</option>
        <option value={0.75}>Sekin</option>
        <option value={0.9}>O'rtacha</option>
        <option value={1}>Odatiy</option>
      </select>
    </label>
  )
}

/** Either the speed control or an honest "no audio" notice. */
export function TtsStatus() {
  const { available } = useTts()
  if (available) return <RateControl />
  return (
    <p role="note" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <VolumeX aria-hidden className="mt-0.5 size-4 shrink-0" />
      {NO_AUDIO_TEXT}
    </p>
  )
}

/** Dialogue with show/hide text, translation toggle, sentence-by-sentence and full playback. */
export function DialoguePlayer({ lines, hideTextByDefault = false }: { lines: Line[]; hideTextByDefault?: boolean }) {
  const tts = useTts()
  const [showText, setShowText] = useState(!hideTextByDefault)
  const [showUz, setShowUz] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const run = useRef(0)
  const { stop: stopTts, speak } = tts

  useEffect(() => () => stopTts(), [stopTts])

  const playFrom = (start: number, chain: boolean) => {
    const token = ++run.current
    const step = (k: number) => {
      if (token !== run.current || k >= lines.length) {
        if (token === run.current) setCurrent(null)
        return
      }
      setCurrent(k)
      speak(lines[k].de, () => (chain ? step(k + 1) : token === run.current && setCurrent(null)))
    }
    step(start)
  }
  const stop = () => {
    run.current++
    stopTts()
    setCurrent(null)
  }
  // Without audio the text is the only way to do the exercise, so it cannot be hidden.
  const textVisible = showText || !tts.available

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {tts.available &&
          (current === null ? (
            <button type="button" className="btn btn-primary" onClick={() => playFrom(0, true)}>
              <Play aria-hidden className="size-4" /> Hammasini tinglash
            </button>
          ) : (
            <button type="button" className="btn" onClick={stop}>
              <Pause aria-hidden className="size-4" /> To'xtatish
            </button>
          ))}
        {tts.available && (
          <button type="button" className="btn" aria-pressed={showText} onClick={() => setShowText((v) => !v)}>
            {showText ? 'Matnni yashirish' : "Matnni ko'rsatish"}
          </button>
        )}
        <button type="button" className="btn" aria-pressed={showUz} onClick={() => setShowUz((v) => !v)}>
          {showUz ? 'Tarjimani yashirish' : "Tarjimani ko'rsatish"}
        </button>
      </div>
      <TtsStatus />
      <ol className="space-y-2">
        {lines.map((l, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 rounded-lg border p-3 ${current === i ? 'border-stone-400 bg-marker-soft' : 'border-stone-200 bg-white'}`}
          >
            {tts.available && (
              <button
                type="button"
                className="btn btn-sm shrink-0"
                aria-label={`${i + 1}-gapni tinglash`}
                onClick={() => playFrom(i, false)}
              >
                <Volume2 aria-hidden className="size-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">{l.speaker}</p>
              {textVisible ? (
                <p lang="de" className="text-base">
                  {l.de}
                </p>
              ) : (
                <p className="text-stone-600 italic">(matn yashirilgan — tinglang)</p>
              )}
              {showUz && <p className="muted">{l.uz}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
