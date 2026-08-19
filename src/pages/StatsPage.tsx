import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subWeeks } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { useLocale } from '../hooks/useLocale'
import { betsInRange, computeStats, computeDailyNet } from '../lib/stats'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { PnlCalendar } from '../components/dashboard/PnlCalendar'
import { DateNav } from '../components/ui/DateNav'

export function StatsPage() {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const profileState = useProfile()
  const bankrollState = useBankroll()
  const betsState = useBets()

  const [month, setMonth] = useState(() => new Date())
  const [week, setWeek] = useState(() => new Date())

  const currency = bankrollState.bankroll?.currency ?? 'EUR'

  const dailyNet = useMemo(
    () => computeDailyNet(betsState.bets, bankrollState.adjustments),
    [betsState.bets, bankrollState.adjustments],
  )

  const monthStats = useMemo(
    () => computeStats(betsInRange(betsState.bets, startOfMonth(month), endOfMonth(month))),
    [betsState.bets, month],
  )

  const weekStart = startOfWeek(week, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
  const weekStats = useMemo(
    () => computeStats(betsInRange(betsState.bets, weekStart, weekEnd)),
    [betsState.bets, weekStart, weekEnd],
  )
  const weekLabel = `${format(weekStart, 'd MMM', { locale: dateFnsLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateFnsLocale })}`

  const loading = bankrollState.loading && !bankrollState.bankroll

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <h1 className="font-display text-2xl font-semibold text-slate-50">{t('stats.pageTitle')}</h1>

        {loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-100">{t('stats.thisMonth')}</h2>
              <PnlCalendar dailyNet={dailyNet} currency={currency} month={month} onMonthChange={setMonth} />
              <StatsGrid stats={monthStats} currency={currency} />
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-100">{t('stats.thisWeek')}</h2>
              <DateNav label={weekLabel} onPrev={() => setWeek((w) => subWeeks(w, 1))} onNext={() => setWeek((w) => addWeeks(w, 1))} />
              <StatsGrid stats={weekStats} currency={currency} />
            </section>
          </>
        )}
      </main>
    </div>
  )
}
