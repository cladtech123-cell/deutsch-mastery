import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboard } from './fixtures'
import { authed, mockApi, never, renderApp, reply, settings } from './utils'

const tile = (name: string) => screen.getByRole('region', { name })

describe('dashboard', () => {
  it('renders every item from GET /progress/dashboard', async () => {
    mockApi({ ...authed, 'GET /progress/dashboard': dashboard })
    renderApp('/')
    await screen.findByRole('region', { name: 'Joriy daraja va kurs' })

    expect(tile('Joriy daraja va kurs')).toHaveTextContent('A1')
    expect(tile('Joriy daraja va kurs')).toHaveTextContent('Kurs: 35%')
    expect(tile('Joriy daraja va kurs')).toHaveTextContent('25 / 72 dars tugallangan')
    expect(within(tile('Bugungi dars')).getByRole('link', { name: /Uyim/ })).toHaveAttribute('href', '/lessons/a1-m09-l2')
    expect(tile('Bugungi takrorlash')).toHaveTextContent("14 ta so'z takrorlanishi kerak")
    expect(within(tile('Keyingi tavsiya')).getByRole('link', { name: 'Akkusativ' })).toHaveAttribute('href', '/grammar/g-akkusativ')
    expect(tile('Keyingi tavsiya')).toHaveTextContent("to'g'rilik 40%")

    const skills = tile("Ko'nikmalar")
    expect(skills).toHaveTextContent('82%')
    expect(within(skills).getAllByText("ma'lumot yetarli emas")).toHaveLength(2) // reading, writing are null
    expect(within(skills).getByRole('progressbar', { name: "Lug'at ko'nikmasi" })).toHaveAttribute('aria-valuenow', '82')

    expect(tile('Haftalik faollik')).toHaveTextContent('Ketma-ketlik: 4 kun')
    expect(tile('Haftalik faollik')).toHaveTextContent('Haftalik maqsad: 3 / 5 kun')
    expect(within(tile('Haftalik faollik')).getAllByRole('listitem')).toHaveLength(7)
    expect(tile("O'rganilgan so'zlar")).toHaveTextContent('137')
    expect(within(tile('Zaif mavzular')).getByRole('link', { name: 'restaurant' })).toHaveAttribute(
      'href',
      '/practice?mode=topic&topic=restaurant',
    )
    expect(tile("So'nggi natijalar")).toHaveTextContent('1-dars yakuniy testi')
    expect(tile("So'nggi natijalar")).toHaveTextContent('80%')
  })

  it('shows a reminder when reminders are on and words are due', async () => {
    mockApi({ ...authed, 'GET /settings': { ...settings, reminders_enabled: true }, 'GET /progress/dashboard': dashboard })
    renderApp('/')
    expect(await screen.findByText(/Eslatma: bugun 14 ta so'z/)).toBeInTheDocument()
  })

  it('shows empty-ish states for a brand new user', async () => {
    mockApi({
      ...authed,
      'GET /progress/dashboard': { ...dashboard, today_lesson: null, due_reviews: 0, recent_results: [], weak_topics: [], next_recommendation: null },
    })
    renderApp('/')
    expect(await screen.findByText('Hali test topshirilmagan.')).toBeInTheDocument()
    expect(screen.getByText('Zaif mavzu topilmadi.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Takrorlashni boshlash' })).not.toBeInTheDocument()
  })

  it('shows a loading state', async () => {
    mockApi({ ...authed, 'GET /progress/dashboard': never })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Bosh sahifa' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Yuklanmoqda')
  })

  it('shows an error state and recovers on retry', async () => {
    let fail = true
    mockApi({
      ...authed,
      'GET /progress/dashboard': () => (fail ? reply(500, { detail: 'Server xatosi' }) : dashboard),
    })
    const { user } = renderApp('/')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Server xatosi')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByRole('region', { name: 'Joriy daraja va kurs' })).toBeInTheDocument()
  })
})
