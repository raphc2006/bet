import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { computeStats, computeDailyNet, computeBalanceSeries, currentBalance } from '../lib/stats'
import { betsToCsv, downloadCsv } from '../lib/csv'
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
  return (
    <div className="flex justify-center py-10">
      <p className="font-mono text-sm text-slate-500">Chargement…</p>
    </div>
  )
}

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email

  const bankrollState = useBankroll()
  const betsState = useBets()
  const [formOpen, setFormOpen] = useState(false)
  const [editingBet, setEditingBet] = useState<Bet | null>(null)

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
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-slate-50">BetTracker</h1>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-slate-400">{username}</span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-300 transition hover:border-loss hover:text-loss"
          >
            Déconnexion
          </button>
        </div>
      </header>

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
                <h2 className="font-display text-xl font-semibold text-slate-100">Journal de paris</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCsv}
                    disabled={betsState.bets.length === 0}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-400 disabled:opacity-40"
                  >
                    Exporter CSV
                  </button>
                  <button
                    onClick={openCreateForm}
                    className="rounded-lg bg-win px-3 py-1.5 text-sm font-semibold text-charcoal transition hover:brightness-110"
                  >
                    + Nouveau pari
                  </button>
                </div>
              </div>

              {betsState.loading ? (
                <Spinner />
              ) : (
                <BetList
                  bets={betsState.bets}
                  currency={bankrollState.bankroll.currency}
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
          onClose={() => setFormOpen(false)}
          onSubmit={editingBet ? (input) => betsState.updateBet(editingBet.id, input) : betsState.createBet}
        />
      )}
    </div>
  )
}
