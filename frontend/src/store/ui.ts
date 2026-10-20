import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  /** Speech rate shared by every TTS button (lesson, listening, review, vocabulary). */
  ttsRate: number
  setTtsRate: (rate: number) => void
}

export const useUi = create<UiState>()(
  persist((set) => ({ ttsRate: 0.9, setTtsRate: (ttsRate) => set({ ttsRate }) }), { name: 'dm-ui' }),
)
