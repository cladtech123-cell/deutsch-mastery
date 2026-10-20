import { useQuery } from '@tanstack/react-query'
import { useCallback, useSyncExternalStore } from 'react'
import { http } from '../api/client'
import { useUi } from '../store/ui'

/**
 * German speech. Prefers the browser's own de-DE Web Speech voice (instant, offline); many browsers have none
 * (Firefox on Windows, in-app browsers), so it falls back to server-side audio from GET /api/tts (Piper).
 * Only when both are missing is `available=false` and the UI says audio is not available.
 */

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

let current: HTMLAudioElement | null = null

function playServerAudio(text: string, rate: number, onEnd?: () => void): boolean {
  stopSpeaking()
  const audio = new Audio(`/api/tts?${new URLSearchParams({ text, rate: String(rate) })}`)
  current = audio
  const done = () => {
    if (current === audio) current = null
    onEnd?.()
  }
  audio.onended = done
  audio.onerror = done
  audio.play().catch(done)
  return true
}

export function speak(text: string, rate: number, onEnd?: () => void, server = false): boolean {
  const s = synth()
  const voice = germanVoice()
  if (s && voice) {
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = rate
    if (onEnd) u.onend = () => onEnd()
    s.speak(u)
    return true
  }
  return server ? playServerAudio(text, rate, onEnd) : false
}

export function stopSpeaking() {
  synth()?.cancel()
  if (current) {
    // a stop is not an end: callers chaining sentences must not advance
    current.onended = null
    current.onerror = null
    current.pause()
    current = null
  }
}

export function useTts() {
  const browser = useSyncExternalStore(subscribe, hasVoice, () => false)
  const server = useQuery({
    queryKey: ['tts-status'],
    queryFn: async () => (await http.get<{ available: boolean }>('/tts/status')).data.available,
    enabled: !browser,
    staleTime: Infinity,
    retry: false,
  })
  const serverOk = !browser && server.data === true
  const rate = useUi((s) => s.ttsRate)
  const say = useCallback((text: string, onEnd?: () => void) => speak(text, rate, onEnd, serverOk), [rate, serverOk])
  return { available: browser || serverOk, speak: say, stop: stopSpeaking }
}
