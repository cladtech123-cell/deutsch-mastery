import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { errorMessage, ME_KEY, queryClient } from '../api/client'
import { api } from '../api/endpoints'
import { useMe } from '../api/queries'
import type { UserOut } from '../api/types'
import { Brand } from '../components/Layout'

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-center">
          <Brand />
        </div>
        <p className="muted mb-6 text-center">Nemis tili: noldan A2 gacha, o'zbek tilida</p>
        <div className="card">
          <h1 className="h1 mb-4">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}

function Field(props: { label: string; type: string; value: string; onChange: (v: string) => void; autoComplete: string; minLength?: number }) {
  const id = `f-${props.autoComplete}`
  return (
    <div>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <input
        id={id}
        className="input"
        type={props.type}
        required
        minLength={props.minLength}
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  )
}

const onAuthed = (user: UserOut) => {
  queryClient.clear()
  queryClient.setQueryData(ME_KEY, user)
}

export function LoginPage() {
  const me = useMe()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (user) => {
      onAuthed(user)
      void navigate(from, { replace: true })
    },
  })
  if (me.data) return <Navigate to="/" replace />
  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password })
  }
  return (
    <AuthShell title="Kirish">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Parol" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {login.isError && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage(login.error)}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={login.isPending}>
          {login.isPending ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
      <p className="muted mt-4 text-center">
        Hisobingiz yo'qmi?{' '}
        <Link to="/register" className="font-medium text-indigo-700 underline">
          Ro'yxatdan o'ting
        </Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const me = useMe()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useMutation({
    mutationFn: api.register,
    onSuccess: (user) => {
      onAuthed(user)
      void navigate('/onboarding', { replace: true })
    },
  })
  if (me.data) return <Navigate to="/" replace />
  const submit = (e: FormEvent) => {
    e.preventDefault()
    register.mutate({ email, password, display_name: name })
  }
  return (
    <AuthShell title="Ro'yxatdan o'tish">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Ismingiz" type="text" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <div>
          <Field
            label="Parol (kamida 8 belgi)"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {register.isError && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage(register.error)}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={register.isPending}>
          {register.isPending ? 'Yaratilmoqda…' : "Ro'yxatdan o'tish"}
        </button>
      </form>
      <p className="muted mt-4 text-center">
        Hisobingiz bormi?{' '}
        <Link to="/login" className="font-medium text-indigo-700 underline">
          Kirish
        </Link>
      </p>
    </AuthShell>
  )
}
