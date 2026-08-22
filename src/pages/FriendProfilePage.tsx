import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addDays, format, isToday, subDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfile } from '../hooks/useProfile'
import { useFriendView } from '../hooks/useFriendView'
import { useLocale } from '../hooks/useLocale'
import { computeStats, computeDailyNet, computeBalanceSeries, currentBalance, betsOnDay } from '../lib/stats'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { PnlChart } from '../components/dashboard/PnlChart'
import { PnlCalendar } from '../components/dashboard/PnlCalendar'
import { BetList } from '../components/dashboard/BetList'
import { DateNav } from '../components/ui/DateNav'

export function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const profileState = useProfile()
  const friendView = useFriendView(userId)
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const stats = useMemo(() => computeStats(friendView.bets), [friendView.bets])
  const dayBets = useMemo(() => betsOnDay(friendView.bets, selectedDate), [friendView.bets, selectedDate])
  const dayLabel = isToday(selectedDate)
    ? `${t('bets.today')} · ${format(selectedDate, 'd MMMM yyyy', { locale: dateFnsLocale })}`
    : format(selectedDate, 'EEEE d MMMM yyyy', { locale: dateFnsLocale })
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
              <PnlCalendar
                dailyNet={dailyNet}
                currency={currency}
                month={month}
                onMonthChange={setMonth}
                onDayClick={friendView.profile.private_journal ? undefined : setSelectedDate}
              />
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-100">{t('friends.journal')}</h2>
              {friendView.profile.private_journal ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-500">
                  {t('friends.privateJournal')}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <DateNav
                      label={dayLabel}
                      onPrev={() => setSelectedDate((d) => subDays(d, 1))}
                      onNext={() => setSelectedDate((d) => addDays(d, 1))}
                    >
                      <input
                        type="date"
                        aria-label={t('bets.pickDate')}
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={(e) => e.target.value && setSelectedDate(new Date(`${e.target.value}T12:00:00`))}
                        className="rounded-lg border border-border bg-charcoal-lighter px-2 py-1 font-mono text-xs text-slate-300 outline-none focus:border-win"
                      />
                    </DateNav>
                    {!isToday(selectedDate) && (
                      <button onClick={() => setSelectedDate(new Date())} className="text-xs text-win hover:underline">
                        {t('bets.today')}
                      </button>
                    )}
                  </div>
                  <BetList bets={dayBets} currency={currency} oddsFormat="decimal" readOnly emptyMessage={t('bets.noBetsForDay')} />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
