import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { useLocale } from '../hooks/useLocale'
import { computeStats, computeDailyNet, computeBalanceSeries, currentBalance } from '../lib/stats'
import { betsToCsv, downloadCsv } from '../lib/csv'
import type { OddsFormat } from '../lib/odds'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { BankrollCard } from '../components/dashboard/BankrollCard'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { BetForm } from '../components/dashboard/BetForm'
import { BetList } from '../components/dashboard/BetList'
import { PnlChart } from '../components/dashboard/PnlChart'
import { PnlCalendar } from '../components/dashboard/PnlCalendar'
import type { Bet } from '../types/domain'

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{message}</div>
  )
}

function Spinner() {
  const { t } = useLocale()
  return (
    <div className="flex justify-center py-10">
      <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
    </div>
  )
}

export function DashboardPage() {
  const { t } = useLocale()
  const profileState = useProfile()
  const bankrollState = useBankroll()
  const betsState = useBets()
  const [formOpen, setFormOpen] = useState(false)
  const [editingBet, setEditingBet] = useState<Bet | null>(null)

  const oddsFormat = (profileState.profile?.odds_format as OddsFormat | undefined) ?? 'decimal'

  const stats = useMemo(() => computeStats(betsState.bets), [betsState.bets])
  const dailyNet = useMemo(
    () => computeDailyNet(betsState.bets, bankrollState.adjustments),
    [betsState.bets, bankrollState.adjustments],
  )
  const balanceSeries = useMemo(
    () =>
      bankrollState.bankroll
        ? computeBalanceSeries(bankrollState.bankroll.starting_amount, betsState.bets, bankrollState.adjustments)
        : [],
    [bankrollState.bankroll, betsState.bets, bankrollState.adjustments],
  )
  const balance = bankrollState.bankroll
    ? currentBalance(bankrollState.bankroll.starting_amount, betsState.bets, bankrollState.adjustments)
    : 0

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

  const loading = bankrollState.loading || betsState.loading
  const error = bankrollState.error ?? betsState.error

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {error && <ErrorBanner message={error} />}

        {loading && !bankrollState.bankroll ? (
          <Spinner />
        ) : (
          bankrollState.bankroll && (
            <>
              <BankrollCard
                bankroll={bankrollState.bankroll}
                balance={balance}
                onUpdateConfig={bankrollState.updateConfig}
                onAddAdjustment={bankrollState.addAdjustment}
              />
              <StatsGrid stats={stats} currency={bankrollState.bankroll.currency} />
              <PnlChart data={balanceSeries} currency={bankrollState.bankroll.currency} />
              <PnlCalendar dailyNet={dailyNet} currency={bankrollState.bankroll.currency} />

              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-slate-100">{t('dashboard.journal')}</h2>
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

              {betsState.loading ? (
                <Spinner />
              ) : (
                <BetList
                  bets={betsState.bets}
                  currency={bankrollState.bankroll.currency}
                  oddsFormat={oddsFormat}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                  onSettle={betsState.settleBet}
                />
              )}
            </>
          )
        )}
      </main>

      {formOpen && (
        <BetForm
          bet={editingBet ?? undefined}
          defaultOddsFormat={oddsFormat}
          onClose={() => setFormOpen(false)}
          onSubmit={editingBet ? (input) => betsState.updateBet(editingBet.id, input) : betsState.createBet}
        />
      )}
    </div>
  )
}
