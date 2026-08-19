import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useFriendView } from '../hooks/useFriendView'
import { useLocale } from '../hooks/useLocale'
import { computeStats, computeDailyNet, computeBalanceSeries, currentBalance } from '../lib/stats'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { PnlChart } from '../components/dashboard/PnlChart'
import { PnlCalendar } from '../components/dashboard/PnlCalendar'
import { BetList } from '../components/dashboard/BetList'

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { t } = useLocale()
  const profileState = useProfile()
  const friendView = useFriendView(userId)
  const [month, setMonth] = useState(() => new Date())

  const stats = useMemo(() => computeStats(friendView.bets), [friendView.bets])
  const dailyNet = useMemo(
    () => computeDailyNet(friendView.bets, friendView.adjustments),
    [friendView.bets, friendView.adjustments],
  )
  const balanceSeries = useMemo(
    () =>
      friendView.bankroll
        ? computeBalanceSeries(friendView.bankroll.starting_amount, friendView.bets, friendView.adjustments)
        : [],
    [friendView.bankroll, friendView.bets, friendView.adjustments],
  )
  const balance = friendView.bankroll
    ? currentBalance(friendView.bankroll.starting_amount, friendView.bets, friendView.adjustments)
    : 0
  const currency = friendView.bankroll?.currency ?? 'EUR'

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <Link to="/friends" className="text-sm text-slate-400 hover:text-slate-100">
          {t('friends.back')}
        </Link>

        {friendView.loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : friendView.error || !friendView.profile ? (
          <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
            {t('friends.viewError')}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Avatar url={friendView.profile.avatar_url} username={friendView.profile.username} size={44} />
              <h1 className="font-display text-2xl font-semibold text-slate-50">{friendView.profile.username}</h1>
            </div>

            <div className="rounded-xl border border-border bg-charcoal-light p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t('bankroll.current')}</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-slate-50">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(balance)}
              </p>
            </div>

            <StatsGrid stats={stats} currency={currency} />
            <PnlChart data={balanceSeries} currency={currency} />

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-100">{t('stats.thisMonth')}</h2>
              <PnlCalendar dailyNet={dailyNet} currency={currency} month={month} onMonthChange={setMonth} />
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-100">{t('friends.journal')}</h2>
              <BetList bets={friendView.bets} currency={currency} oddsFormat="decimal" readOnly />
            </section>
          </>
        )}
      </main>
    </div>
  )
}
