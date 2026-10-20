import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { errorMessage, ME_KEY, queryClient } from '../api/client'
import { api } from '../api/endpoints'
import { keys, useLogout, useMe, useSettings } from '../api/queries'
import type { DailyMinutes, Goal, Level, Settings } from '../api/types'
import { RateControl } from '../components/Audio'
import { PageHeader, QueryView } from '../components/States'
import { GOALS, MINUTES } from '../lib/labels'

function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial)
  const save = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (res) => {
      queryClient.setQueryData(keys.settings, res)
      void queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(s)
  }
  return (
    <form className="card grid gap-4 sm:grid-cols-2" onSubmit={submit} aria-labelledby="st-h">
      <h2 id="st-h" className="h2 sm:col-span-2">
        O'quv rejasi
      </h2>
      <div>
        <label htmlFor="s-level" className="label">
          Joriy daraja
        </label>
        <select id="s-level" className="input" value={s.current_level} onChange={(e) => setS({ ...s, current_level: e.target.value as Level })}>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
        </select>
      </div>
      <div>
        <label htmlFor="s-module" className="label">
          Boshlang'ich modul
        </label>
        <select id="s-module" className="input" value={s.start_module} onChange={(e) => setS({ ...s, start_module: Number(e.target.value) })}>
          {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}-modul ({m <= 12 ? 'A1' : 'A2'})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s-min" className="label">
          Kunlik vaqt
        </label>
        <select id="s-min" className="input" value={s.daily_minutes} onChange={(e) => setS({ ...s, daily_minutes: Number(e.target.value) as DailyMinutes })}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m} daqiqa
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s-goal" className="label">
          Maqsad
        </label>
        <select id="s-goal" className="input" value={s.goal} onChange={(e) => setS({ ...s, goal: e.target.value as Goal })}>
          {GOALS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="s-week" className="label">
          Haftalik maqsad (kun)
        </label>
        <input id="s-week" type="number" min={1} max={7} className="input" value={s.weekly_goal_days} onChange={(e) => setS({ ...s, weekly_goal_days: Number(e.target.value) })} />
      </div>
      <div>
        <label htmlFor="s-new" className="label">
          Kuniga yangi so'zlar (takrorlash)
        </label>
        <input id="s-new" type="number" min={1} max={100} className="input" value={s.new_per_day} onChange={(e) => setS({ ...s, new_per_day: Number(e.target.value) })} />
      </div>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" className="size-4 accent-indigo-700" checked={s.reminders_enabled} onChange={(e) => setS({ ...s, reminders_enabled: e.target.checked })} />
        Dars va takrorlash eslatmalari (bosh sahifada ko'rsatiladi)
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          Saqlash
        </button>
        {save.isSuccess && <span role="status" className="text-sm text-green-800">Saqlandi.</span>}
        {save.isError && (
          <span role="alert" className="text-sm text-red-700">
            {errorMessage(save.error)}
          </span>
        )}
      </div>
    </form>
  )
}

function DeleteAccount() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState(false)
  const del = useMutation({
    mutationFn: () => api.deleteAccount(password),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(ME_KEY, null)
    },
  })
  return (
    <form
      className="card space-y-3 border-red-200"
      aria-labelledby="del-h"
      onSubmit={(e) => {
        e.preventDefault()
        del.mutate()
      }}
    >
      <h2 id="del-h" className="h2 text-red-800">
        Hisobni o'chirish
      </h2>
      <p className="text-sm">
        Hisobingiz va barcha ma'lumotlaringiz (progress, lug'at, yozuvlar, test natijalari) butunlay o'chiriladi. Buni
        qaytarib bo'lmaydi.
      </p>
      <div>
        <label htmlFor="del-pw" className="label">
          Tasdiqlash uchun parolingiz
        </label>
        <input id="del-pw" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-red-700" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        Ha, hisobimni va barcha ma'lumotlarimni o'chirmoqchiman
      </label>
      {del.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage(del.error)}
        </p>
      )}
      <button type="submit" className="btn btn-danger" disabled={!confirm || !password || del.isPending}>
        Hisobni o'chirish
      </button>
    </form>
  )
}

export function SettingsPage() {
  const settings = useSettings()
  const me = useMe()
  const logout = useLogout()
  return (
    <>
      <PageHeader title="Sozlamalar" subtitle={me.data ? `${me.data.display_name} · ${me.data.email}` : undefined} />
      <div className="space-y-4">
        <QueryView query={settings}>{(s) => <SettingsForm initial={s} />}</QueryView>
        <section className="card space-y-2" aria-labelledby="audio-h">
          <h2 id="audio-h" className="h2">
            Audio
          </h2>
          <RateControl />
          <p className="muted">Audio brauzerning nutq sintezi (de-DE ovozi) orqali ijro etiladi.</p>
        </section>
        <section className="card flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">Tizimdan chiqish</h2>
          <button type="button" className="btn" onClick={() => logout.mutate()}>
            Chiqish
          </button>
        </section>
        <DeleteAccount />
      </div>
    </>
  )
}
