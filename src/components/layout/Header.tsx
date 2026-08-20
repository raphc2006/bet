import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLocale } from '../../hooks/useLocale'
import { usePendingFriendRequestsCount } from '../../hooks/useFriends'

function TabLink({ to, label, badge }: { to: string; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `relative border-b-2 px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'border-win text-win' : 'border-transparent text-slate-400 hover:text-slate-100'
        }`
      }
    >
      {label}
      {!!badge && (
        <span className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-loss px-1 font-mono text-[10px] font-semibold leading-none text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function Header({ children, friendRequestCount }: { children?: ReactNode; friendRequestCount?: number }) {
  const { t } = useLocale()
  const { count: fetchedFriendRequestCount } = usePendingFriendRequestsCount()
  const pendingFriendRequests = friendRequestCount ?? fetchedFriendRequestCount
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
        <TabLink to="/friends" label={t('nav.friends')} badge={pendingFriendRequests} />
      </nav>
    </header>
  )
}
