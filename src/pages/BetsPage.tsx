import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format, isToday, subDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { useLocale } from '../hooks/useLocale'
import { betsOnDay } from '../lib/stats'
import { betsToCsv, downloadCsv } from '../lib/csv'
import type { OddsFormat } from '../lib/odds'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { BetForm } from '../components/dashboard/BetForm'
import { BetList } from '../components/dashboard/BetList'
import { DateNav } from '../components/ui/DateNav'
import type { Bet } from '../types/domain'

export function BetsPage() {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const profileState = useProfile()
  const bankrollState = useBankroll()
  const betsState = useBets()

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingBet, setEditingBet] = useState<Bet | null>(null)

  const oddsFormat = (profileState.profile?.odds_format as OddsFormat | undefined) ?? 'decimal'
  const currency = bankrollState.bankroll?.currency ?? 'EUR'

  const dayBets = useMemo(() => betsOnDay(betsState.bets, selectedDate), [betsState.bets, selectedDate])

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
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs text-win hover:underline"
            >
              {t('bets.today')}
            </button>
          )}
        </div>

        {loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : (
          <BetList
            bets={dayBets}
            currency={currency}
            oddsFormat={oddsFormat}
            onEdit={openEditForm}
            onDelete={handleDelete}
            onSettle={betsState.settleBet}
            emptyMessage={t('bets.noBetsForDay')}
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
    </div>
  )
}
