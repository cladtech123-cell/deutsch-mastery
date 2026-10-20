import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, queryClient } from '../api/client'
import type { Settings, UserOut } from '../api/types'
import { routes } from '../routes'

export interface Req {
  method: string
  url: string
  params: Record<string, unknown> | undefined
  body: unknown
}

class Reply {
  status: number
  data: unknown
  constructor(status: number, data: unknown) {
    this.status = status
    this.data = data
  }
}
export const reply = (status: number, data: unknown = {}) => new Reply(status, data)
type Handler = unknown | ((req: Req) => unknown)

/** Mocks the network boundary: a custom axios adapter keyed by "METHOD /path". Unmocked routes → 404. */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: Req[] = []
  http.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const req: Req = {
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      params: config.params as Record<string, unknown> | undefined,
      body: typeof config.data === 'string' && config.data ? JSON.parse(config.data) : undefined,
    }
    calls.push(req)
    const key = `${req.method} ${req.url}`
    const h = handlers[key]
    let out: unknown = h === undefined ? reply(404, { detail: `not mocked: ${key}` }) : h
    if (typeof out === 'function') out = await (out as (r: Req) => unknown)(req)
    const { status, data } = out instanceof Reply ? out : new Reply(200, out)
    const response = { data, status, statusText: String(status), headers: new AxiosHeaders(), config }
    if (status >= 400) throw new AxiosError(`HTTP ${status}`, 'ERR_BAD_RESPONSE', config, null, response)
    return response
  }
  return calls
}

export const user: UserOut = { id: 'u1', email: 'ali@example.com', display_name: 'Ali', is_demo: false }
export const settings: Settings = {
  current_level: 'A1',
  start_module: 1,
  daily_minutes: 45,
  goal: 'general',
  weekly_goal_days: 5,
  reminders_enabled: false,
  new_per_day: 15,
  onboarding_done: true,
}
export const authed = { 'GET /auth/me': user, 'GET /settings': settings }

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const ue = userEvent.setup()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, user: ue }
}

export function renderWithClient(ui: ReactElement) {
  const ue = userEvent.setup()
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
  return { user: ue }
}

export const never = () => new Promise(() => {})
