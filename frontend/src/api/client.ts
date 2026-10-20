import { QueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // 4xx will not fix itself on retry; one retry for network/5xx blips.
      retry: (count, err) => count < 1 && !(isAxiosError(err) && (err.response?.status ?? 500) < 500),
    },
  },
})

/** Auth is the httpOnly `dm_session` cookie (D2); no token ever touches JS. */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export const ME_KEY = ['auth', 'me'] as const

http.interceptors.response.use(undefined, (error: unknown) => {
  const url = isAxiosError(error) ? (error.config?.url ?? '') : ''
  // A 401 from a normal endpoint means the session expired: drop the user and RequireAuth redirects to /login.
  // /auth/* and DELETE /users/me (wrong password) report 401 as a form error instead.
  if (isAxiosError(error) && error.response?.status === 401 && !url.startsWith('/auth/') && url !== '/users/me') {
    queryClient.setQueryData(ME_KEY, null)
  }
  return Promise.reject(error)
})

export function statusOf(e: unknown): number | undefined {
  return isAxiosError(e) ? e.response?.status : undefined
}

/** Backend errors are `{"detail": "o'zbekcha xabar"}`; 422 from FastAPI is a list of {msg}. */
export function errorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    const detail: unknown = (e.response?.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const msgs = detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String(d.msg) : '')).filter(Boolean)
      if (msgs.length) return `Ma'lumot noto'g'ri: ${msgs.join('; ')}`
    }
    switch (e.response?.status) {
      case undefined:
        return "Server bilan aloqa yo'q. Internetni tekshirib, qayta urinib ko'ring."
      case 401:
        return 'Tizimga kirishingiz kerak.'
      case 404:
        return 'Topilmadi.'
      case 429:
        return "So'rovlar juda ko'p. Biroz kutib, qayta urinib ko'ring."
      case 503:
        return 'Xizmat hozircha mavjud emas.'
      default:
        return `Xatolik yuz berdi (${e.response?.status}).`
    }
  }
  return 'Kutilmagan xatolik yuz berdi.'
}

/** List endpoints whose wrapper is not fixed in §6 may return `T[]` or `{items: T[]}`. */
export function asList<T>(data: T[] | { items: T[] }): T[] {
  return Array.isArray(data) ? data : data.items
}
