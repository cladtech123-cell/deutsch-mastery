import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { http, queryClient } from '../api/client'

queryClient.setDefaultOptions({ queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } })
const realAdapter = http.defaults.adapter

afterEach(() => {
  cleanup()
  queryClient.clear()
  http.defaults.adapter = realAdapter
  window.localStorage.clear()
})
