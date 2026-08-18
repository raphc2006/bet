import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useBets } from '../hooks/useBets'
import { useLocale } from '../hooks/useLocale'
import { computeStats, computeBalanceSeries, currentBalance } from '../lib/stats'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { BankrollCard } from '../components/dashboard/BankrollCard'
import { StatsGrid } from '../components/dashboard/StatsGrid'
import { PnlChart } from '../components/dashboard/PnlChart'

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

  const stats = useMemo(() => computeStats(betsState.bets), [betsState.bets])
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
            </>
          )
        )}
      </main>
    </div>
  )
}
