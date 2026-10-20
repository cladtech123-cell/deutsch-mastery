import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 'localhost' binds only [::1] on Windows, which makes http://127.0.0.1:5173 unreachable; browsers fall back to IPv4 for localhost
    host: '127.0.0.1',
    proxy: { '/api': { target: 'http://127.0.0.1:8001' } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
