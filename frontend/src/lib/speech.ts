/** Browser SpeechRecognition (de-DE). Chrome sends audio to Google's servers — the UI must say so (§6 privacy). */

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const recognitionSupported = () => typeof window !== 'undefined' && ctor() !== null

export const RECOGNITION_PRIVACY_NOTE =
  "Diqqat: nutqni tanish brauzer funksiyasi. Ba'zi brauzerlar (masalan, Chrome) ovozingizni tanish uchun " +
  "Google serverlariga yuborishi mumkin. Deutsch Mastery serveriga ovoz yuborilmaydi — faqat tanilgan matn saqlanadi."

/** Resolves with the recognized German text; rejects with an Uzbek message. */
export function recognizeOnce(): Promise<string> {
  const Ctor = ctor()
  if (!Ctor) return Promise.reject(new Error("Brauzeringiz nutqni tanishni qo'llamaydi."))
  return new Promise((resolve, reject) => {
    const rec = new Ctor()
    let text = ''
    rec.lang = 'de-DE'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      text = Array.from(e.results, (r) => r[0]?.transcript ?? '').join(' ').trim()
    }
    rec.onerror = (e) =>
      reject(
        new Error(
          e.error === 'not-allowed' || e.error === 'service-not-allowed'
            ? 'Mikrofonga ruxsat berilmadi.'
            : e.error === 'no-speech'
              ? 'Ovoz eshitilmadi. Qayta urinib ko\'ring.'
              : `Nutqni tanib bo'lmadi (${e.error}).`,
        ),
      )
    rec.onend = () => (text ? resolve(text) : reject(new Error("Hech narsa tanilmadi. Qayta urinib ko'ring.")))
    rec.start()
  })
}
