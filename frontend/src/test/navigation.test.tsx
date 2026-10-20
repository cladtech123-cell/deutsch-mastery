import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboard, hallo } from './fixtures'
import { authed, mockApi, renderApp, reply, settings } from './utils'

const SECTIONS = [
  'Bosh sahifa', "O'quv yo'li", 'Darslar', "Lug'at", 'Takrorlash', 'Grammatika',
  'Tinglash', 'Gapirish', 'Yozish', 'Testlar', 'Statistika', 'Sozlamalar',
]

describe('navigation and guards', () => {
  it('redirects to /login when there is no session', async () => {
    mockApi({ 'GET /auth/me': reply(401, { detail: 'Kirilmagan' }) })
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Kirish' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('sends a user who has not finished onboarding to /onboarding', async () => {
    mockApi({ ...authed, 'GET /settings': { ...settings, onboarding_done: false } })
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Xush kelibsiz!' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('shows the 12 main sections in the sidebar and navigates between pages', async () => {
    mockApi({
      ...authed,
      'GET /progress/dashboard': dashboard,
      'GET /vocabulary': { items: [hallo], topics: ['greetings'] },
    })
    const { user, router } = renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Asosiy navigatsiya' })
    for (const name of SECTIONS) expect(within(nav).getByRole('link', { name })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: "Lug'at" }))
    expect(router.state.location.pathname).toBe('/vocabulary')
    expect(await screen.findByRole('heading', { name: 'Hallo' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: "Lug'at" })).toHaveAttribute('aria-current', 'page')
  })

  it('has a mobile bottom tab bar with a "Ko\'proq" menu', async () => {
    mockApi({ ...authed, 'GET /progress/dashboard': dashboard })
    const { user } = renderApp('/')
    const tabs = await screen.findByRole('navigation', { name: 'Pastki navigatsiya' })
    for (const name of ['Bosh', "Yo'l", 'Takrorlash', "Lug'at"]) {
      expect(within(tabs).getByRole('link', { name })).toBeInTheDocument()
    }
    const more = within(tabs).getByRole('button', { name: "Ko'proq" })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById('more-menu')!
    expect(within(menu).getByRole('link', { name: 'AI tutor' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Grammatika' })).toBeInTheDocument()
  })

  it('redirects to /login when the session expires (401 on a data request)', async () => {
    mockApi({ ...authed, 'GET /progress/dashboard': reply(401, { detail: 'Sessiya tugadi' }) })
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Kirish' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('logs in and returns to the requested page', async () => {
    let loggedIn = false
    const calls = mockApi({
      'GET /auth/me': () => (loggedIn ? authed['GET /auth/me'] : reply(401)),
      'POST /auth/login': () => {
        loggedIn = true
        return authed['GET /auth/me']
      },
      'GET /settings': settings,
      'GET /progress/stats': { skills: {}, topics: [] },
      'GET /progress/dashboard': dashboard,
    })
    const { user, router } = renderApp('/stats')
    await screen.findByRole('heading', { name: 'Kirish' })
    await user.type(screen.getByLabelText('Email'), 'ali@example.com')
    await user.type(screen.getByLabelText('Parol'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Kirish' }))
    expect(await screen.findByRole('heading', { name: 'Statistika' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/stats')
    expect(calls.find((c) => c.url === '/auth/login')?.body).toEqual({ email: 'ali@example.com', password: 'secret123' })
  })
})
