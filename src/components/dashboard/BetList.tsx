import { useState } from 'react'
import type { Bet, BetStatus } from '../../types/domain'
import { betDecimalOdds, betProfit } from '../../lib/stats'
import { formatCurrency, formatSignedCurrency } from '../../lib/format'
import { formatOdds } from '../../lib/odds'

const STATUS_LABEL: Record<BetStatus, string> = {
  pending: 'En attente',
  won: 'Gagné',
  lost: 'Perdu',
  push: 'Push',
}

function StatusBadge({ status }: { status: BetStatus }) {
  const tone =
    status === 'won'
      ? 'bg-win/10 text-win border-win/30'
      : status === 'lost'
        ? 'bg-loss/10 text-loss border-loss/30'
        : status === 'push'
          ? 'bg-push/10 text-push border-push/30'
          : 'bg-pending/10 text-pending border-pending/30'
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>{STATUS_LABEL[status]}</span>
}

type Props = {
  bets: Bet[]
  currency: string
  onEdit: (bet: Bet) => void
  onDelete: (betId: string) => void
  onSettle: (betId: string, status: BetStatus) => void
}

export function BetList({ bets, currency, onEdit, onDelete, onSettle }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (bets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-500">
        Aucun pari enregistré pour le moment.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bets.map((bet) => {
        const odds = betDecimalOdds(bet)
        const profit = betProfit(bet)
        return (
          <div key={bet.id} className="rounded-xl border border-border bg-charcoal-light p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    {bet.bet_type === 'single' ? 'Simple' : `Parlay (${bet.bet_legs.length})`}
                  </span>
                  <StatusBadge status={bet.status as BetStatus} />
                </div>
                <div className="mt-1 space-y-0.5">
                  {bet.bet_legs.map((leg) => (
                    <p key={leg.id} className="text-sm text-slate-200">
                      {leg.event_description}
                      {leg.market && <span className="text-slate-500"> · {leg.market}</span>}
                    </p>
                  ))}
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {formatCurrency(bet.stake, currency)} @ {formatOdds(odds, 'decimal')} ·{' '}
                  {new Date(bet.placed_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-lg font-semibold ${
                    bet.status === 'won' ? 'text-win' : bet.status === 'lost' ? 'text-loss' : 'text-slate-400'
                  }`}
                >
                  {bet.status === 'pending' ? '—' : formatSignedCurrency(profit, currency)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {bet.status === 'pending' ? (
                <>
                  <button
                    onClick={() => onSettle(bet.id, 'won')}
                    className="rounded-lg border border-win/40 px-2.5 py-1 text-xs font-medium text-win hover:bg-win/10"
                  >
                    Gagné
                  </button>
                  <button
                    onClick={() => onSettle(bet.id, 'lost')}
                    className="rounded-lg border border-loss/40 px-2.5 py-1 text-xs font-medium text-loss hover:bg-loss/10"
                  >
                    Perdu
                  </button>
                  <button
                    onClick={() => onSettle(bet.id, 'push')}
                    className="rounded-lg border border-push/40 px-2.5 py-1 text-xs font-medium text-push hover:bg-push/10"
                  >
                    Push
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSettle(bet.id, 'pending')}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-100"
                >
                  Remettre en attente
                </button>
              )}
              <button
                onClick={() => onEdit(bet)}
                className="ml-auto rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-100"
              >
                Modifier
              </button>
              {confirmDeleteId === bet.id ? (
                <button
                  onClick={() => onDelete(bet.id)}
                  className="rounded-lg border border-loss bg-loss/10 px-2.5 py-1 text-xs font-medium text-loss"
                >
                  Confirmer ?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(bet.id)}
                  onBlur={() => setConfirmDeleteId(null)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-slate-400 hover:border-loss hover:text-loss"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
