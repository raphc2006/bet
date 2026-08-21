import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subWeeks } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { useLocale } from '../hooks/useLocale'
import { useWeeklyReview } from '../hooks/useWeeklyReview'
import { betsInRange, computeStats, computeDailyNet, filterBets } from '../lib/stats'
import type { BetFilters } from '../lib/stats'
import { LEAGUES, MARKET_TYPES } from '../lib/constants'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { PnlCalendar } from '../components/dashboard/PnlCalendar'
import { WeeklyReviewModal } from '../components/dashboard/WeeklyReviewModal'
import { DateNav } from '../components/ui/DateNav'
import { SportIcon } from '../components/ui/SportIcon'

export function StatsPage() {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const navigate = useNavigate()
  const profileState = useProfile()
  const bankrollState = useBankroll()
  const betsState = useBets()
  const weeklyReview = useWeeklyReview(betsState.bets, profileState.profile, profileState.updateLastWeekReviewShown, {
    autoShow: false,
  })

  const [month, setMonth] = useState(() => new Date())
  const [week, setWeek] = useState(() => new Date())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<BetFilters>({})

  const currency = bankrollState.bankroll?.currency ?? 'EUR'

  const hasActiveFilters = Boolean(
    filters.league || filters.marketType || filters.text || filters.dateFrom || filters.dateTo,
  )

  const filteredBets = useMemo(() => filterBets(betsState.bets, filters), [betsState.bets, filters])

  function updateFilter<K extends keyof BetFilters>(key: K, value: BetFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  function resetFilters() {
    setFilters({})
  }

  const dailyNet = useMemo(
    () => computeDailyNet(filteredBets, bankrollState.adjustments),
    [filteredBets, bankrollState.adjustments],
  )

  const monthStats = useMemo(
    () => computeStats(betsInRange(filteredBets, startOfMonth(month), endOfMonth(month))),
    [filteredBets, month],
  )

  const weekStart = startOfWeek(week, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
  const weekStats = useMemo(
    () => computeStats(betsInRange(filteredBets, weekStart, weekEnd)),
    [filteredBets, weekStart, weekEnd],
  )
  const weekLabel = `${format(weekStart, 'd MMM', { locale: dateFnsLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateFnsLocale })}`

  function goToDay(day: Date) {
    navigate(`/bets?date=${format(day, 'yyyy-MM-dd')}`)
  }

  const loading = bankrollState.loading && !bankrollState.bankroll

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-slate-50">{t('stats.pageTitle')}</h1>
          {weeklyReview.hasData && (
            <button
              onClick={weeklyReview.open}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-400"
            >
              {t('weeklyReview.viewButton')}
            </button>
          )}
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltersOpen((open) => !open)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                filtersOpen || hasActiveFilters
                  ? 'border-win bg-win/10 text-win'
                  : 'border-border text-slate-300 hover:border-slate-400'
              }`}
            >
              {t('stats.filters')}
            </button>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-slate-100">
                {t('stats.filtersReset')}
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-charcoal-light p-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <SportIcon league={filters.league} size={12} />
                  {t('stats.filterLeague')}
                </span>
                <select
                  value={filters.league ?? ''}
                  onChange={(e) => updateFilter('league', e.target.value)}
                  className="w-full rounded-lg border border-border bg-charcoal-lighter px-2 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-win"
                >
                  <option value="">{t('stats.filterAll')}</option>
                  {LEAGUES.map((league) => (
                    <option key={league} value={league}>
                      {league}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('stats.filterMarketType')}
                </span>
                <select
                  value={filters.marketType ?? ''}
                  onChange={(e) => updateFilter('marketType', e.target.value)}
                  className="w-full rounded-lg border border-border bg-charcoal-lighter px-2 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-win"
                >
                  <option value="">{t('stats.filterAll')}</option>
                  {MARKET_TYPES.map((mt) => (
                    <option key={mt.value} value={mt.value}>
                      {mt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('stats.filterDateFrom')}
                </span>
                <input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="w-full rounded-lg border border-border bg-charcoal-lighter px-2 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-win"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('stats.filterDateTo')}
                </span>
                <input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="w-full rounded-lg border border-border bg-charcoal-lighter px-2 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-win"
                />
              </label>
              <label className="col-span-2 block sm:col-span-4">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t('stats.filterText')}
                </span>
                <input
                  type="text"
                  value={filters.text ?? ''}
                  onChange={(e) => updateFilter('text', e.target.value)}
                  placeholder={t('stats.filterTextPlaceholder')}
                  className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-win"
                />
              </label>
            </div>
          )}

          {hasActiveFilters && (
            <p className="font-mono text-xs text-slate-500">{t('stats.filterResults', { n: filteredBets.length })}</p>
          )}
        </section>

        {loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-slate-100">{t('stats.thisMonth')}</h2>
              <PnlCalendar
                dailyNet={dailyNet}
                currency={currency}
                month={month}
                onMonthChange={setMonth}
                onDayClick={goToDay}
              />
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

      {weeklyReview.isOpen && (
        <WeeklyReviewModal
          username={profileState.profile?.username ?? ''}
          weekStart={weeklyReview.weekStart}
          weekEnd={weeklyReview.weekEnd}
          stats={weeklyReview.weekStats}
          currency={currency}
          bestBet={weeklyReview.bestBet}
          worstBet={weeklyReview.worstBet}
          onClose={weeklyReview.close}
        />
      )}
    </div>
  )
}
