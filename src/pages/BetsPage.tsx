import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { addDays, format, isToday, isValid, parseISO, subDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { useLocale } from '../hooks/useLocale'
import { betsOnDay, filterBets } from '../lib/stats'
import type { BetFilters } from '../lib/stats'
import { betsToCsv, downloadCsv } from '../lib/csv'
import { LEAGUES, MARKET_TYPES } from '../lib/constants'
import type { OddsFormat } from '../lib/odds'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { BetForm } from '../components/dashboard/BetForm'
import { BetList } from '../components/dashboard/BetList'
import { BetShareModal } from '../components/dashboard/BetShareModal'
import { DateNav } from '../components/ui/DateNav'
import { SportIcon } from '../components/ui/SportIcon'
import type { Bet } from '../types/domain'

export function BetsPage() {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const profileState = useProfile()
  const bankrollState = useBankroll()
  const betsState = useBets()

  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(() => {
    const param = searchParams.get('date')
    if (param) {
      const parsed = parseISO(param)
      if (isValid(parsed)) return parsed
    }
    return new Date()
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingBet, setEditingBet] = useState<Bet | null>(null)
  const [sharingBet, setSharingBet] = useState<Bet | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<BetFilters>({})

  useEffect(() => {
    const param = searchParams.get('date')
    if (!param) return
    const parsed = parseISO(param)
    if (isValid(parsed)) {
      setSelectedDate(parsed)
      setFilters({})
    }
    setSearchParams((prev) => {
      prev.delete('date')
      return prev
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const oddsFormat = (profileState.profile?.odds_format as OddsFormat | undefined) ?? 'decimal'
  const currency = bankrollState.bankroll?.currency ?? 'EUR'

  const hasActiveFilters = Boolean(
    filters.league || filters.marketType || filters.text || filters.dateFrom || filters.dateTo,
  )

  const dayBets = useMemo(() => betsOnDay(betsState.bets, selectedDate), [betsState.bets, selectedDate])
  const filteredBets = useMemo(() => filterBets(betsState.bets, filters), [betsState.bets, filters])
  const visibleBets = hasActiveFilters ? filteredBets : dayBets

  function updateFilter<K extends keyof BetFilters>(key: K, value: BetFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  function resetFilters() {
    setFilters({})
  }

  const dayLabel = isToday(selectedDate)
    ? `${t('bets.today')} · ${format(selectedDate, 'd MMMM yyyy', { locale: dateFnsLocale })}`
    : format(selectedDate, 'EEEE d MMMM yyyy', { locale: dateFnsLocale })

  function openCreateForm() {
    setEditingBet(null)
    setFormOpen(true)
  }

  function openEditForm(bet: Bet) {
    setEditingBet(bet)
    setFormOpen(true)
  }

  async function handleDelete(betId: string) {
    await betsState.deleteBet(betId)
  }

  function handleExportCsv() {
    downloadCsv(`paris-${new Date().toISOString().slice(0, 10)}.csv`, betsToCsv(betsState.bets))
  }

  const loading = betsState.loading && betsState.bets.length === 0

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-slate-50">{t('bets.pageTitle')}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              disabled={betsState.bets.length === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-400 disabled:opacity-40"
            >
              {t('dashboard.exportCsv')}
            </button>
            <button
              onClick={openCreateForm}
              className="rounded-lg bg-win px-3 py-1.5 text-sm font-semibold text-charcoal transition hover:brightness-110"
            >
              {t('dashboard.newBet')}
            </button>
          </div>
        </div>

        <div className={`space-y-2 ${hasActiveFilters ? 'pointer-events-none opacity-40' : ''}`}>
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
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs text-win hover:underline"
            >
              {t('bets.today')}
            </button>
          )}
        </div>

        <div className="space-y-3">
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
        </div>

        {loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : (
          <BetList
            bets={visibleBets}
            currency={currency}
            oddsFormat={oddsFormat}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onSettle={betsState.settleBet}
            onShare={setSharingBet}
            emptyMessage={hasActiveFilters ? t('bets.noFilterResults') : t('bets.noBetsForDay')}
          />
        )}
      </main>

      {formOpen && (
        <BetForm
          bet={editingBet ?? undefined}
          defaultOddsFormat={oddsFormat}
          defaultDate={selectedDate}
          onClose={() => setFormOpen(false)}
          onSubmit={editingBet ? (input) => betsState.updateBet(editingBet.id, input) : betsState.createBet}
        />
      )}

      {sharingBet && (
        <BetShareModal bet={sharingBet} currency={currency} oddsFormat={oddsFormat} onClose={() => setSharingBet(null)} />
      )}
    </div>
  )
}
