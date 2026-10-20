import type { UseQueryResult } from '@tanstack/react-query'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../api/client'

export function Loading({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-slate-600">
      <Loader2 aria-hidden className="size-5 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 border-red-200 bg-red-50">
      <p className="flex items-center gap-2 font-medium text-red-800">
        <AlertCircle aria-hidden className="size-5 shrink-0" />
        {errorMessage(error)}
      </p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card flex items-center gap-3 text-slate-600">
      <Inbox aria-hidden className="size-5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

/** Loading → error (with retry) → empty → data, used by every page. */
export function QueryView<T>({
  query,
  children,
  isEmpty,
  empty,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
}) {
  if (query.isPending) return <Loading />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  if (isEmpty?.(query.data)) return <Empty>{empty ?? "Hozircha ma'lumot yo'q."}</Empty>
  return <>{children(query.data)}</>
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80"
    >
      <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out" style={{ width: `${v}%` }} />
    </div>
  )
}

export function NotFound() {
  return (
    <Empty>
      Sahifa topilmadi.{' '}
      <Link to="/" className="text-indigo-700 underline">
        Bosh sahifaga qaytish
      </Link>
    </Empty>
  )
}
