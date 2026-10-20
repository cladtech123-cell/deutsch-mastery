import { useCallback, useSyncExternalStore } from 'react'
import { useUi } from '../store/ui'

/** Web Speech API adapter (PROJECT_PLAN §2). No German voice → `available=false`, UI says audio is not available. */

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

export function germanVoice(): SpeechSynthesisVoice | null {
  const s = synth()
  if (!s) return null
  const voices = s.getVoices()
  return voices.find((v) => v.lang === 'de-DE') ?? voices.find((v) => v.lang.toLowerCase().startsWith('de')) ?? null
}

function subscribe(cb: () => void) {
  const s = synth()
  if (!s) return () => {}
  s.addEventListener('voiceschanged', cb)
  return () => s.removeEventListener('voiceschanged', cb)
}

const hasVoice = () => germanVoice() !== null

export function speak(text: string, rate: number, onEnd?: () => void): boolean {
  const s = synth()
  const voice = germanVoice()
  if (!s || !voice) return false
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = rate
  if (onEnd) u.onend = () => onEnd()
  s.speak(u)
  return true
}

export function stopSpeaking() {
  synth()?.cancel()
}

export function useTts() {
  const available = useSyncExternalStore(subscribe, hasVoice, () => false)
  const rate = useUi((s) => s.ttsRate)
  const say = useCallback((text: string, onEnd?: () => void) => speak(text, rate, onEnd), [rate])
  return { available, speak: say, stop: stopSpeaking }
}
