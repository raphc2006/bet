import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLocale } from '../../hooks/useLocale'

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `border-b-2 px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'border-win text-win' : 'border-transparent text-slate-400 hover:text-slate-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export function Header({ children }: { children?: ReactNode }) {
  const { t } = useLocale()
  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-slate-50">
          {t('dashboard.title')}
        </Link>
        <div className="flex items-center gap-4">{children}</div>
      </div>
      <nav className="flex gap-1 px-6">
        <TabLink to="/" label={t('nav.dashboard')} />
        <TabLink to="/stats" label={t('nav.stats')} />
        <TabLink to="/bets" label={t('nav.bets')} />
        <TabLink to="/friends" label={t('nav.friends')} />
      </nav>
    </header>
  )
}
