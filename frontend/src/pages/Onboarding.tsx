import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { errorMessage, queryClient } from '../api/client'
import { api } from '../api/endpoints'
import { keys, useSettings } from '../api/queries'
import type { Goal, Level, PlacementResult, Settings } from '../api/types'
import { ExamForm } from '../features/exercises/ExerciseCard'
import { QueryView } from '../components/States'
import { SkillScores } from './Tests'
import { GOALS, MINUTES } from '../lib/labels'

type Known = 'beginner' | 'a1' | 'a1_refresh' | 'unknown'

const KNOWN: { value: Known; label: string }[] = [
  { value: 'beginner', label: 'Mutlaqo boshlovchiman' },
  { value: 'a1', label: 'A1 darajasini bilaman' },
  { value: 'a1_refresh', label: 'A1 ni mustahkamlamoqchiman' },
  { value: 'unknown', label: 'Bilmayman' },
]
// Self-assessment → starting point before (or instead of) the diagnostic test.
const START: Record<Known, { level: Level; module: number }> = {
  beginner: { level: 'A1', module: 1 },
  a1: { level: 'A2', module: 13 },
  a1_refresh: { level: 'A1', module: 1 },
  unknown: { level: 'A1', module: 1 },
}


type Step = 'profile' | 'choose' | 'test' | 'result'

export function OnboardingPage() {
  const settings = useSettings()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-1 font-bold text-indigo-800">Deutsch Mastery</p>
      <QueryView query={settings}>{(s) => <Wizard initial={s} />}</QueryView>
    </main>
  )
}

function Wizard({ initial }: { initial: Settings }) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('profile')
  const [known, setKnown] = useState<Known>('beginner')
  const [form, setForm] = useState<Settings>({ ...initial, daily_minutes: initial.daily_minutes ?? 45 })
  const [placement, setPlacement] = useState<PlacementResult | null>(null)

  const save = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (s) => queryClient.setQueryData(keys.settings, s),
  })
  const finish = (level: Level, module: number) =>
    save.mutate(
      { ...form, current_level: level, start_module: module, onboarding_done: true },
      { onSuccess: () => void navigate('/', { replace: true }) },
    )

  const submitProfile = (e: FormEvent) => {
    e.preventDefault()
    const start = START[known]
    const next = { ...form, current_level: start.level, start_module: start.module, onboarding_done: false }
    setForm(next)
    save.mutate(next, { onSuccess: () => setStep('choose') })
  }

  const error = save.isError && (
    <p role="alert" className="text-sm text-red-700">
      {errorMessage(save.error)}
    </p>
  )

  if (step === 'profile') {
    return (
      <form className="card space-y-5" onSubmit={submitProfile}>
        <div>
          <h1 className="h1">Xush kelibsiz!</h1>
          <p className="muted">Bir necha savol — rejangizni sizga moslaymiz. Keyin sozlamalarda o'zgartirish mumkin.</p>
        </div>
        <fieldset>
          <legend className="label">Nemis tilini bilish darajangiz</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {KNOWN.map((k) => (
              <label key={k.value} className="flex items-center gap-2 rounded-lg border border-slate-300 p-2.5 has-checked:border-indigo-600 has-checked:bg-indigo-50">
                <input type="radio" name="known" checked={known === k.value} onChange={() => setKnown(k.value)} className="accent-indigo-700" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">Kuniga qancha vaqt ajratasiz?</legend>
          <div className="flex flex-wrap gap-2">
            {MINUTES.map((m) => (
              <label key={m} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 has-checked:border-indigo-600 has-checked:bg-indigo-50">
                <input type="radio" name="minutes" checked={form.daily_minutes === m} onChange={() => setForm({ ...form, daily_minutes: m })} className="accent-indigo-700" />
                {m} daqiqa
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="goal" className="label">
            Asosiy maqsadingiz
          </label>
          <select id="goal" className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="weekly" className="label">
            Haftalik maqsad: haftada necha kun o'qiysiz?
          </label>
          <select id="weekly" className="input" value={form.weekly_goal_days} onChange={(e) => setForm({ ...form, weekly_goal_days: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {d} kun
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.reminders_enabled} onChange={(e) => setForm({ ...form, reminders_enabled: e.target.checked })} className="size-4 accent-indigo-700" />
          Dars va takrorlash eslatmalarini yoqish
        </label>
        {error}
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          Davom etish
        </button>
      </form>
    )
  }

  if (step === 'choose') {
    return (
      <section className="card space-y-4">
        <h1 className="h1">Diagnostik test</h1>
        <p>
          Qisqa test lug'at, grammatika, gap tuzilishi, o'qish va tinglashni tekshiradi. Natijaga qarab boshlang'ich nuqtani
          taklif qilamiz. Qiyin bo'lsa ham xavotir olmang — darslar har doim ochiq.
        </p>
        {error}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => setStep('test')}>
            Testni boshlash
          </button>
          <button type="button" className="btn" disabled={save.isPending} onClick={() => finish('A1', 1)}>
            Testsiz, noldan boshlash
          </button>
          {known === 'a1' && (
            <button type="button" className="btn" disabled={save.isPending} onClick={() => finish('A2', 13)}>
              Testsiz, A2 dan boshlash
            </button>
          )}
        </div>
      </section>
    )
  }

  if (step === 'test') {
    return (
      <PlacementTest
        onResult={(r) => {
          setPlacement(r)
          setStep('result')
        }}
        onSkip={() => finish('A1', 1)}
      />
    )
  }

  return (
    <section className="card space-y-4">
      <h1 className="h1">Natija</h1>
      {placement && (
        <>
          <p className="text-lg">
            Umumiy natija: <strong>{Math.round(placement.percent)}%</strong>
          </p>
          <SkillScores scores={placement.score_by_skill} />
          <p>
            Tavsiya: <strong>{placement.recommended_level}</strong>, {placement.recommended_module}-modul.
          </p>
          <p className="muted">Bu ichki diagnostika natijasi, rasmiy sertifikat emas.</p>
        </>
      )}
      {error}
      <div className="flex flex-wrap gap-2">
        {placement && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={save.isPending}
            onClick={() => finish(placement.recommended_level, placement.recommended_module)}
          >
            Tavsiya bo'yicha boshlash
          </button>
        )}
        <button type="button" className="btn" disabled={save.isPending} onClick={() => finish('A1', 1)}>
          Noldan boshlash
        </button>
      </div>
    </section>
  )
}

function PlacementTest({ onResult, onSkip }: { onResult: (r: PlacementResult) => void; onSkip: () => void }) {
  const test = useQuery({ queryKey: ['placement'], queryFn: api.placement })
  const submit = useMutation({ mutationFn: api.submitPlacement, onSuccess: onResult })
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">Diagnostik test</h1>
        <button type="button" className="btn" onClick={onSkip}>
          Testni o'tkazib, noldan boshlash
        </button>
      </div>
      <QueryView query={test}>
        {(t) => (
          <>
            <ExamForm
              sections={t.sections}
              pending={submit.isPending}
              onSubmit={(answers) => submit.mutate(answers)}
              submitLabel="Natijani ko'rish"
            />
            {submit.isError && (
              <p role="alert" className="text-sm text-red-700">
                {errorMessage(submit.error)}
              </p>
            )}
          </>
        )}
      </QueryView>
    </section>
  )
}
