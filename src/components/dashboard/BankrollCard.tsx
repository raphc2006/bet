import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Bankroll } from '../../types/domain'
import { formatCurrency } from '../../lib/format'
import { Modal } from '../ui/Modal'
import { FormField } from '../auth/AuthCard'

type Props = {
  bankroll: Bankroll
  balance: number
  onUpdateConfig: (startingAmount: number, unitPercentage: number) => Promise<{ error: string | null }>
  onAddAdjustment: (amount: number, note: string) => Promise<{ error: string | null }>
}

export function BankrollCard({ bankroll, balance, onUpdateConfig, onAddAdjustment }: Props) {
  const [editing, setEditing] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  const unitAmount = balance * (bankroll.unit_percentage / 100)

  return (
    <div className="rounded-xl border border-border bg-charcoal-light p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Bankroll actuelle</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-slate-50">
            {formatCurrency(balance, bankroll.currency)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            1 unité = {bankroll.unit_percentage}% = {formatCurrency(unitAmount, bankroll.currency)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setAdjusting(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-win hover:text-win"
          >
            Dépôt / retrait
          </button>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-400"
          >
            Configurer
          </button>
        </div>
      </div>

      {editing && (
        <ConfigModal bankroll={bankroll} onClose={() => setEditing(false)} onSubmit={onUpdateConfig} />
      )}
      {adjusting && (
        <AdjustmentModal onClose={() => setAdjusting(false)} onSubmit={onAddAdjustment} />
      )}
    </div>
  )
}

function ConfigModal({
  bankroll,
  onClose,
  onSubmit,
}: {
  bankroll: Bankroll
  onClose: () => void
  onSubmit: Props['onUpdateConfig']
}) {
  const [startingAmount, setStartingAmount] = useState(String(bankroll.starting_amount))
  const [unitPercentage, setUnitPercentage] = useState(String(bankroll.unit_percentage))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const starting = Number(startingAmount)
    const unit = Number(unitPercentage)
    if (Number.isNaN(starting) || starting < 0) return setError('Montant de départ invalide.')
    if (Number.isNaN(unit) || unit <= 0) return setError('Unité de mise invalide.')

    setSubmitting(true)
    const { error } = await onSubmit(starting, unit)
    setSubmitting(false)
    if (error) return setError(error)
    onClose()
  }

  return (
    <Modal title="Configurer la bankroll" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-loss">{error}</p>}
        <FormField
          label="Montant de départ"
          type="number"
          step="0.01"
          min="0"
          value={startingAmount}
          onChange={(e) => setStartingAmount(e.target.value)}
        />
        <FormField
          label="Unité de mise (%)"
          type="number"
          step="0.1"
          min="0.1"
          value={unitPercentage}
          onChange={(e) => setUnitPercentage(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  )
}

function AdjustmentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: Props['onAddAdjustment'] }) {
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const value = Number(amount)
    if (Number.isNaN(value) || value <= 0) return setError('Montant invalide.')

    setSubmitting(true)
    const { error } = await onSubmit(type === 'deposit' ? value : -value, note)
    setSubmitting(false)
    if (error) return setError(error)
    onClose()
  }

  return (
    <Modal title="Dépôt / retrait" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-loss">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('deposit')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              type === 'deposit' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            Dépôt
          </button>
          <button
            type="button"
            onClick={() => setType('withdraw')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              type === 'withdraw' ? 'border-loss bg-loss/10 text-loss' : 'border-border text-slate-400'
            }`}
          >
            Retrait
          </button>
        </div>
        <FormField
          label="Montant"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <FormField label="Note (optionnel)" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : 'Confirmer'}
        </button>
      </form>
    </Modal>
  )
}
