import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { checkResult, ex } from '../../test/fixtures'
import { mockApi, renderWithClient } from '../../test/utils'
import { ExamForm, ExerciseCard } from './ExerciseCard'

const checkBtn = () => screen.getByRole('button', { name: 'Tekshirish' })

describe('choice exercise', () => {
  it('sends the chosen option as a string and shows correct feedback', async () => {
    const e = ex({ id: 'e1', type: 'multiple_choice', question: 'Ertalab nima deysiz?', options: ['Guten Morgen!', 'Gute Nacht!'] })
    const calls = mockApi({
      'POST /exercises/e1/check': checkResult({ exercise_id: 'e1', correct: true, explanation: 'Ertalab "Guten Morgen!" deyiladi.' }),
    })
    const { user } = renderWithClient(<ExerciseCard exercise={e} />)
    expect(checkBtn()).toBeDisabled()
    await user.click(screen.getByLabelText('Guten Morgen!'))
    await user.click(checkBtn())
    expect(await screen.findByText("To'g'ri!")).toBeInTheDocument()
    expect(screen.getByText('Ertalab "Guten Morgen!" deyiladi.')).toBeInTheDocument()
    expect(calls.at(-1)).toMatchObject({ method: 'POST', url: '/exercises/e1/check', body: { answer: 'Guten Morgen!' } })
    expect(screen.queryByRole('button', { name: 'Tekshirish' })).not.toBeInTheDocument()
  })
})

describe('text exercise', () => {
  it('inserts umlauts, sends a string and shows correct answer, warning, error type and retry exercise', async () => {
    const e = ex({ id: 'e2', type: 'fill_blank', question: 'Das Gras ist ___.' })
    const retry = ex({ id: 'e9', type: 'multiple_choice', question: 'Qayta savol: rang?', options: ['grün', 'rot'] })
    const calls = mockApi({
      'POST /exercises/e2/check': checkResult({
        exercise_id: 'e2',
        correct: false,
        correct_answer: 'grün',
        explanation: "Grün — yashil.",
        error_type: 'spelling',
        warning: "Katta-kichik harfga e'tibor bering.",
        retry_exercise: retry,
      }),
    })
    const { user } = renderWithClient(<ExerciseCard exercise={e} />)
    const input = screen.getByLabelText('Javobingiz')
    await user.type(input, 'Gr')
    await user.click(screen.getByRole('button', { name: "ü harfini qo'shish" }))
    await user.type(input, 'n')
    expect(input).toHaveValue('Grün')
    await user.click(checkBtn())

    expect(await screen.findByText("Noto'g'ri")).toBeInTheDocument()
    expect(calls.at(-1)?.body).toEqual({ answer: 'Grün' })
    expect(screen.getByRole('status')).toHaveTextContent("To'g'ri javob: grün")
    expect(screen.getByText("Katta-kichik harfga e'tibor bering.")).toBeInTheDocument()
    expect(screen.getByText('Imlo')).toBeInTheDocument()
    expect(screen.getByText('Shu bilimni boshqa misolda tekshiring')).toBeInTheDocument()
    expect(screen.getByText('Qayta savol: rang?')).toBeInTheDocument()
  })

  it('does not offer umlaut buttons when the answer is Uzbek', () => {
    renderWithClient(<ExerciseCard exercise={ex({ id: 'e3', type: 'translate_de_uz' })} />)
    expect(screen.queryByRole('button', { name: "ä harfini qo'shish" })).not.toBeInTheDocument()
  })
})

describe('match exercise', () => {
  it('sends a {left: right} object once every pair is chosen', async () => {
    const e = ex({ id: 'm1', type: 'match', left: ['Hallo', 'Danke', 'Nein'], right: ["Yo'q", 'Salom', 'Rahmat'] })
    const calls = mockApi({ 'POST /exercises/m1/check': checkResult({ exercise_id: 'm1', correct: true }) })
    const { user } = renderWithClient(<ExerciseCard exercise={e} />)
    await user.selectOptions(screen.getByLabelText('Hallo'), 'Salom')
    await user.selectOptions(screen.getByLabelText('Danke'), 'Rahmat')
    expect(checkBtn()).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Nein'), "Yo'q")
    await user.click(checkBtn())
    await screen.findByText("To'g'ri!")
    expect(calls.at(-1)?.body).toEqual({ answer: { Hallo: 'Salom', Danke: 'Rahmat', Nein: "Yo'q" } })
  })
})

describe('order_words exercise', () => {
  it('builds the sentence by tapping tokens and sends list[str]', async () => {
    const e = ex({ id: 'o1', type: 'order_words', options: ['bin', 'Tom', 'Ich'] })
    const calls = mockApi({ 'POST /exercises/o1/check': checkResult({ exercise_id: 'o1', correct: true }) })
    const { user } = renderWithClient(<ExerciseCard exercise={e} />)
    const pool = screen.getByRole('group', { name: "So'zlar" })
    await user.click(within(pool).getByRole('button', { name: 'Tom' }))
    await user.click(screen.getByRole('button', { name: 'Tom — olib tashlash' }))
    await user.click(within(pool).getByRole('button', { name: 'Ich' }))
    await user.click(within(pool).getByRole('button', { name: 'bin' }))
    expect(checkBtn()).toBeDisabled()
    await user.click(within(pool).getByRole('button', { name: 'Tom' }))
    await user.click(checkBtn())
    await screen.findByText("To'g'ri!")
    expect(calls.at(-1)?.body).toEqual({ answer: ['Ich', 'bin', 'Tom'] })
  })
})

describe('short_text exercise', () => {
  it('shows criteria while typing and the criteria checks after submit', async () => {
    const e = ex({ id: 's1', type: 'short_text', criteria: { min_words: 3, required_words: ['heiße'] } })
    const calls = mockApi({
      'POST /exercises/s1/check': checkResult({
        exercise_id: 's1',
        correct: true,
        checks: [
          { name: 'min_words', ok: true, message: "So'zlar soni yetarli (4)." },
          { name: 'required_words', ok: true, message: '"heiße" ishlatilgan.' },
        ],
      }),
    })
    const { user } = renderWithClient(<ExerciseCard exercise={e} />)
    expect(screen.getByText(/kamida 3/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Javobingiz'), 'Ich heiße Ali Karimov')
    expect(screen.getByText(/So'zlar soni: 4/)).toBeInTheDocument()
    await user.click(checkBtn())
    expect(await screen.findByText("So'zlar soni yetarli (4).")).toBeInTheDocument()
    expect(calls.at(-1)?.body).toEqual({ answer: 'Ich heiße Ali Karimov' })
  })
})

describe('audio exercises without TTS', () => {
  it('says audio is not available instead of showing a play button, and can reveal the text', async () => {
    const e = ex({ id: 'l1', type: 'listen_choice', options: ['Ertalab', 'Kechqurun'], audio_text: 'Guten Abend!' })
    const { user } = renderWithClient(<ExerciseCard exercise={e} />)
    expect(screen.getByText(/Audio mavjud emas/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Audioni tinglash/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: "Audio o'rniga matnni ko'rsatish" }))
    expect(screen.getByText('Guten Abend!')).toBeInTheDocument()
  })

  it('plays audio through the German voice when available', async () => {
    const speak = vi.fn()
    const synth = { getVoices: () => [{ lang: 'de-DE', name: 'Anna' }], speak, cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.stubGlobal('speechSynthesis', synth)
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text } })
    try {
      const e = ex({ id: 'l2', type: 'dictation', audio_text: 'Auf Wiedersehen!' })
      const { user } = renderWithClient(<ExerciseCard exercise={e} />)
      await user.click(screen.getByRole('button', { name: /Audioni tinglash/ }))
      expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Auf Wiedersehen!', lang: 'de-DE' }))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('ExamForm', () => {
  it('submits only answered questions as {id: answer}', async () => {
    const onSubmit = vi.fn()
    const a = ex({ id: 'q1', type: 'multiple_choice', options: ['ja', 'nein'] })
    const b = ex({ id: 'q2', type: 'fill_blank' })
    const { user } = renderWithClient(<ExamForm sections={[{ exercises: [a, b] }]} onSubmit={onSubmit} />)
    expect(screen.getByText('Javob berilgan: 0 / 2')).toBeInTheDocument()
    await user.click(screen.getByLabelText('ja'))
    await user.click(screen.getByRole('button', { name: 'Javoblarni yuborish' }))
    expect(onSubmit).toHaveBeenCalledWith({ q1: 'ja' })
  })
})
