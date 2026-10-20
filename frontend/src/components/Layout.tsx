import {
  BarChart3, BookA, BookOpen, Bot, ClipboardCheck, Ear, GraduationCap, Home, LogOut, Map, Menu, Mic, PenLine,
  Repeat, Settings, SpellCheck, X, type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { useLogout, useMe, useSettings } from '../api/queries'
import { ErrorState, Loading } from './States'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** The 12 sections of request §5, plus reading and the AI tutor. */
const NAV: NavItem[] = [
  { to: '/', label: 'Bosh sahifa', icon: Home },
  { to: '/path', label: "O'quv yo'li", icon: Map },
  { to: '/lessons', label: 'Darslar', icon: GraduationCap },
  { to: '/vocabulary', label: "Lug'at", icon: BookA },
  { to: '/review', label: 'Takrorlash', icon: Repeat },
  { to: '/grammar', label: 'Grammatika', icon: SpellCheck },
  { to: '/listening', label: 'Tinglash', icon: Ear },
  { to: '/speaking', label: 'Gapirish', icon: Mic },
  { to: '/writing', label: 'Yozish', icon: PenLine },
  { to: '/tests', label: 'Testlar', icon: ClipboardCheck },
  { to: '/stats', label: 'Statistika', icon: BarChart3 },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
  { to: '/reading', label: "O'qish", icon: BookOpen },
  { to: '/tutor', label: 'AI tutor', icon: Bot },
]

const TABS: NavItem[] = [
  { to: '/', label: 'Bosh', icon: Home },
  { to: '/path', label: "Yo'l", icon: Map },
  { to: '/review', label: 'Takrorlash', icon: Repeat },
  { to: '/vocabulary', label: "Lug'at", icon: BookA },
]
const MORE = NAV.filter((n) => !TABS.some((t) => t.to === n.to))

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    isActive ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
  }`

export function Brand({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-display text-sm font-extrabold text-white shadow-raised"
      >
        DM
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-extrabold text-slate-900">Deutsch Mastery</span>
        {subtitle && <span className="block text-xs font-medium text-slate-500">Nemis tili · A1 → A2</span>}
      </span>
    </div>
  )
}

export function Layout() {
  const me = useMe()
  const logout = useLogout()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only z-50 rounded bg-white p-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Asosiy kontentga o'tish
      </a>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Brand subtitle />
        </div>
        <nav aria-label="Asosiy navigatsiya" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'} className={linkClass}>
                  <Icon aria-hidden className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-3 text-sm text-slate-700">{me.data?.display_name}</p>
          <button type="button" className="btn mt-2 w-full" onClick={() => logout.mutate()}>
            <LogOut aria-hidden className="size-4" /> Chiqish
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Brand />
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pb-10">
        <Outlet />
      </main>

      <nav
        aria-label="Pastki navigatsiya"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors duration-150 ${isActive ? 'text-indigo-700' : 'text-slate-600'}`
                }
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls="more-menu"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-600"
            >
              {moreOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
              Ko'proq
            </button>
          </li>
        </ul>
      </nav>
      {moreOpen && (
        <div id="more-menu" className="fixed inset-x-0 bottom-14 z-30 max-h-[70dvh] overflow-y-auto border-t border-slate-200 bg-white p-3 shadow-lg lg:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {MORE.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={linkClass} onClick={() => setMoreOpen(false)}>
                  <Icon aria-hidden className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <button type="button" className={linkClass({ isActive: false }) + ' w-full'} onClick={() => logout.mutate()}>
                <LogOut aria-hidden className="size-4" /> Chiqish
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

/** Logged in + onboarding finished, otherwise redirect. */
export function RequireAuth({ allowOnboarding = false }: { allowOnboarding?: boolean }) {
  const me = useMe()
  const location = useLocation()
  const settings = useSettings(!!me.data)
  if (me.isPending) return <Loading />
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (allowOnboarding) return <Outlet />
  if (settings.isPending) return <Loading />
  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
  if (!settings.data.onboarding_done) return <Navigate to="/onboarding" replace />
  return <Layout />
}
