import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { checkResult, dashboard, hallo, lesson, morgen } from './fixtures'
import { authed, mockApi, renderApp, settings } from './utils'

describe('lesson page', () => {
  it('shows the sections in order, answers exercises, finishes the final test and lists mistakes', async () => {
    const calls = mockApi({
      ...authed,
      'GET /lessons/a1-m01-l1': lesson,
      'POST /exercises/a1-m01-l1-e01/check': checkResult({
        exercise_id: 'a1-m01-l1-e01',
        correct: false,
        correct_answer: 'Guten Morgen!',
        explanation: 'Ertalab "Guten Morgen!" deyiladi.',
        error_type: 'vocabulary',
      }),
      'POST /lessons/a1-m01-l1/final': {
        score: 1,
        total: 2,
        percent: 50,
        passed: false,
        results: [
          checkResult({ exercise_id: 'a1-m01-l1-t01', correct: true }),
          checkResult({ exercise_id: 'a1-m01-l1-t02', correct: false, correct_answer: 'Ich', explanation: '"bin" faqat "ich" bilan.' }),
        ],
      },
    })
    const { user } = renderApp('/lessons/a1-m01-l1')
    await screen.findByRole('heading', { level: 1, name: 'Salomlashish va xayrlashish' })

    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(h2).toEqual([
      'Dars maqsadi',
      'Qisqa tushuntirish',
      "Lug'at",
      'Grammatika',
      'Tinglash: Kursdagi birinchi kun',
      'Mashqlar',
      "Real vaziyat: Yangi qo'shni",
      'Yakuniy test',
      'Xatolar tahlili',
    ])
    // Vocabulary card: article + plural; no fake audio button without TTS.
    expect(screen.getByRole('heading', { name: 'der Morgen' })).toBeInTheDocument()
    expect(screen.getByText('die Morgen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Tinglash:/ })).not.toBeInTheDocument()
    // Grammar check exercise lives under grammar, not repeated under Mashqlar.
    const grammar = screen.getByRole('region', { name: 'Grammatika' })
    expect(within(grammar).getByText("Bo'sh joyni to'ldiring: Ich ___ Anna.")).toBeInTheDocument()
    const practice = screen.getByRole('region', { name: 'Mashqlar' })
    expect(within(practice).queryByText("Bo'sh joyni to'ldiring: Ich ___ Anna.")).not.toBeInTheDocument()

    await user.click(within(practice).getByLabelText('Gute Nacht!'))
    await user.click(within(practice).getByRole('button', { name: 'Tekshirish' }))
    await within(practice).findByText("Noto'g'ri")

    const test = screen.getByRole('region', { name: 'Yakuniy test' })
    await user.click(within(test).getByLabelText('Guten Abend!'))
    await user.type(within(test).getByLabelText('Javobingiz'), 'Er')
    await user.click(within(test).getByRole('button', { name: 'Testni yakunlash' }))
    expect(await within(test).findByText('Natija: 1 / 2 (50%)')).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/lessons/a1-m01-l1/final')?.body).toEqual({
      answers: { 'a1-m01-l1-t01': 'Guten Abend!', 'a1-m01-l1-t02': 'Er' },
    })

    const mistakes = screen.getByRole('region', { name: 'Xatolar tahlili' })
    expect(within(mistakes).getByText('Ertalab nima deysiz?')).toBeInTheDocument()
    expect(within(mistakes).getByText('___ bin Lena.')).toBeInTheDocument()
    expect(within(mistakes).getByText("Lug'at (so'z ma'nosi)")).toBeInTheDocument()
  })
})

describe('vocabulary page', () => {
  it('adds a word to the user vocabulary', async () => {
    const calls = mockApi({
      ...authed,
      'GET /vocabulary': { items: [hallo, morgen], topics: ['greetings'] },
      'POST /vocabulary/v-hallo/save': { ...hallo, user: { saved: true, state: 'new', due_at: null, correct_count: 0, wrong_count: 0 } },
    })
    const { user } = renderApp('/vocabulary')
    const card = (await screen.findByRole('heading', { name: 'Hallo' })).closest('article')!
    await user.click(within(card).getByRole('button', { name: "Lug'atga qo'shish" }))
    expect(await within(card).findByRole('button', { name: "Lug'atda" })).toHaveAttribute('aria-pressed', 'true')
    expect(calls.some((c) => c.method === 'POST' && c.url === '/vocabulary/v-hallo/save')).toBe(true)
  })

  it('passes filters to the API and shows an empty state', async () => {
    const calls = mockApi({ ...authed, 'GET /vocabulary': (r: { params?: Record<string, unknown> }) => ({ items: r.params?.saved ? [] : [hallo], topics: [] }) })
    const { user } = renderApp('/vocabulary')
    await screen.findByRole('heading', { name: 'Hallo' })
    await user.click(screen.getByRole('button', { name: 'Saqlanganlar' }))
    expect(await screen.findByText(/Saqlangan so'z yo'q/)).toBeInTheDocument()
    expect(calls.at(-1)?.params).toMatchObject({ saved: true })
  })
})

describe('review session', () => {
  it('reveals the card and sends quality 4 for "Yaxshi", then finishes', async () => {
    const calls = mockApi({
      ...authed,
      'GET /review/queue': { cards: [{ card_id: 7, vocab: morgen, direction: 'de_uz', state: 'learning' }], due_total: 1, new_today_left: 10 },
      'POST /review/7/answer': { id: 7, state: 'learning', due_at: '2026-10-23T00:00:00Z', interval_days: 3 },
    })
    const { user } = renderApp('/review')
    expect(await screen.findByText('der Morgen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Yaxshi/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: "Javobni ko'rsatish" }))
    expect(screen.getByText('tong')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Yaxshi/ }))
    expect(await screen.findByText('Seans tugadi!')).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/review/7/answer')?.body).toEqual({ quality: 4 })
  })

  it('maps all four buttons to SM-2 quality 1/3/4/5', async () => {
    const card = (id: number) => ({ card_id: id, vocab: hallo, direction: 'uz_de', state: 'new' })
    const calls = mockApi({
      ...authed,
      'GET /review/queue': { cards: [card(1), card(2), card(3), card(4)], due_total: 4, new_today_left: 0 },
      ...Object.fromEntries([1, 2, 3, 4].map((i) => [`POST /review/${i}/answer`, { id: i, state: 'learning', due_at: '', interval_days: 1 }])),
    })
    const { user } = renderApp('/review')
    for (const label of ['Yana', 'Qiyin', 'Yaxshi', 'Oson']) {
      await user.click(await screen.findByRole('button', { name: "Javobni ko'rsatish" }))
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))
    }
    await screen.findByText('Seans tugadi!')
    expect(calls.filter((c) => c.method === 'POST').map((c) => (c.body as { quality: number }).quality)).toEqual([1, 3, 4, 5])
  })

  it('shows an empty state when nothing is due', async () => {
    mockApi({ ...authed, 'GET /review/queue': { cards: [], due_total: 0, new_today_left: 15 } })
    renderApp('/review')
    expect(await screen.findByText(/Bugun takrorlanadigan so'z yo'q/)).toBeInTheDocument()
  })
})

describe('AI tutor', () => {
  it('explains clearly when AI is not configured', async () => {
    mockApi({ ...authed, 'GET /ai/status': { configured: false, provider: null } })
    renderApp('/tutor')
    expect(await screen.findByText(/AI tutor hozircha sozlanmagan/)).toBeInTheDocument()
  })

  it('renders replies as plain text, never as HTML', async () => {
    mockApi({
      ...authed,
      'GET /ai/status': { configured: true, provider: 'openai' },
      'POST /ai/tutor': { session_id: 's1', reply: '<img src=x onerror=alert(1)> Akkusativ' },
    })
    const { user } = renderApp('/tutor')
    await user.type(await screen.findByLabelText('Xabar'), 'Akkusativ nima?')
    await user.click(screen.getByRole('button', { name: 'Yuborish' }))
    expect(await screen.findByText('<img src=x onerror=alert(1)> Akkusativ')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })
})

describe('onboarding', () => {
  it('saves the profile, lets the user skip the test and start from zero', async () => {
    const saved: unknown[] = []
    mockApi({
      ...authed,
      'GET /settings': { ...settings, onboarding_done: false },
      'PUT /settings': (r: { body: unknown }) => {
        saved.push(r.body)
        return r.body
      },
      'GET /progress/dashboard': dashboard,
    })
    const { user, router } = renderApp('/onboarding')
    await screen.findByRole('heading', { name: 'Xush kelibsiz!' })
    await user.click(screen.getByLabelText('30 daqiqa'))
    await user.selectOptions(screen.getByLabelText('Asosiy maqsadingiz'), 'ausbildung')
    await user.click(screen.getByRole('button', { name: 'Davom etish' }))
    await user.click(await screen.findByRole('button', { name: 'Testsiz, noldan boshlash' }))
    await screen.findByRole('heading', { name: 'Bosh sahifa' })
    expect(router.state.location.pathname).toBe('/')
    expect(saved[0]).toMatchObject({ daily_minutes: 30, goal: 'ausbildung', onboarding_done: false })
    expect(saved[1]).toMatchObject({ current_level: 'A1', start_module: 1, onboarding_done: true })
  })
})
