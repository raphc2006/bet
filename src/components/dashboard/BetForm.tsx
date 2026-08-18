import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Bet, BetType } from '../../types/domain'
import type { BetInput, LegInput } from '../../hooks/useBets'
import { formatOdds, parseOddsInput, type OddsFormat } from '../../lib/odds'
import { Modal } from '../ui/Modal'
import { FormField } from '../auth/AuthCard'

type LegFormState = {
  event_description: string
  market: string
  oddsInput: string
  closingOddsInput: string
}

function emptyLeg(): LegFormState {
  return { event_description: '', market: '', oddsInput: '', closingOddsInput: '' }
}

function legsFromBet(bet: Bet, format: OddsFormat): LegFormState[] {
  return bet.bet_legs.map((leg) => ({
    event_description: leg.event_description,
    market: leg.market ?? '',
    oddsInput: formatOdds(leg.odds_decimal, format),
    closingOddsInput: leg.closing_odds_decimal ? formatOdds(leg.closing_odds_decimal, format) : '',
  }))
}

type Props = {
  bet?: Bet
  onClose: () => void
  onSubmit: (input: BetInput) => Promise<{ error: string | null }>
}

export function BetForm({ bet, onClose, onSubmit }: Props) {
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal')
  const [betType, setBetType] = useState<BetType>((bet?.bet_type as BetType) ?? 'single')
  const [stake, setStake] = useState(bet ? String(bet.stake) : '')
  const [confidence, setConfidence] = useState(bet?.confidence ? String(bet.confidence) : '')
  const [notes, setNotes] = useState(bet?.notes ?? '')
  const [placedAt, setPlacedAt] = useState(
    bet ? bet.placed_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
  )
  const [legs, setLegs] = useState<LegFormState[]>(bet ? legsFromBet(bet, oddsFormat) : [emptyLeg()])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateLeg(index: number, patch: Partial<LegFormState>) {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)))
  }

  function addLeg() {
    setLegs((prev) => [...prev, emptyLeg()])
  }

  function removeLeg(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleOddsFormat(next: OddsFormat) {
    if (next === oddsFormat) return
    // Reconvertit les cotes déjà saisies pour ne pas perdre la valeur en changeant de format.
    setLegs((prev) =>
      prev.map((leg) => {
        const decimal = parseOddsInput(leg.oddsInput, oddsFormat)
        const closingDecimal = parseOddsInput(leg.closingOddsInput, oddsFormat)
        return {
          ...leg,
          oddsInput: decimal ? formatOdds(decimal, next) : leg.oddsInput,
          closingOddsInput: closingDecimal ? formatOdds(closingDecimal, next) : leg.closingOddsInput,
        }
      }),
    )
    setOddsFormat(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const stakeValue = Number(stake)
    if (Number.isNaN(stakeValue) || stakeValue <= 0) return setError('Mise invalide.')

    if (betType === 'single' && legs.length !== 1) return setError('Un pari simple a un seul événement.')
    if (betType === 'parlay' && legs.length < 2) return setError('Un parlay nécessite au moins 2 légs.')

    const parsedLegs: LegInput[] = []
    for (const leg of legs) {
      if (!leg.event_description.trim()) return setError('Chaque leg doit avoir une description.')
      const decimal = parseOddsInput(leg.oddsInput, oddsFormat)
      if (!decimal) return setError(`Cote invalide pour "${leg.event_description}".`)
      const closingDecimal = leg.closingOddsInput ? parseOddsInput(leg.closingOddsInput, oddsFormat) : null
      parsedLegs.push({
        event_description: leg.event_description.trim(),
        market: leg.market.trim(),
        odds_decimal: decimal,
        closing_odds_decimal: closingDecimal,
      })
    }

    setSubmitting(true)
    const { error } = await onSubmit({
      bet_type: betType,
      stake: stakeValue,
      confidence: confidence ? Number(confidence) : null,
      notes,
      placed_at: new Date(placedAt).toISOString(),
      legs: parsedLegs,
    })
    setSubmitting(false)
    if (error) return setError(error)
    onClose()
  }

  return (
    <Modal title={bet ? 'Modifier le pari' : 'Nouveau pari'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-loss">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBetType('single')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              betType === 'single' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setBetType('parlay')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              betType === 'parlay' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            Parlay
          </button>
          <button
            type="button"
            onClick={() => toggleOddsFormat(oddsFormat === 'decimal' ? 'american' : 'decimal')}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-100"
          >
            Cotes: {oddsFormat === 'decimal' ? 'Décimal' : 'Américain'}
          </button>
        </div>

        <div className="space-y-3">
          {legs.map((leg, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {betType === 'parlay' ? `Leg ${i + 1}` : 'Événement'}
                </span>
                {betType === 'parlay' && legs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLeg(i)}
                    className="text-xs text-loss hover:underline"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-2">
                <FormField
                  label="Description"
                  type="text"
                  placeholder="ex: PSG - OM, vainqueur PSG"
                  value={leg.event_description}
                  onChange={(e) => updateLeg(i, { event_description: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    label="Marché"
                    type="text"
                    placeholder="1X2"
                    value={leg.market}
                    onChange={(e) => updateLeg(i, { market: e.target.value })}
                  />
                  <FormField
                    label="Cote"
                    type="text"
                    inputMode="decimal"
                    placeholder={oddsFormat === 'decimal' ? '1.85' : '-118'}
                    value={leg.oddsInput}
                    onChange={(e) => updateLeg(i, { oddsInput: e.target.value })}
                  />
                  <FormField
                    label="Cote clôture"
                    type="text"
                    inputMode="decimal"
                    placeholder="optionnel"
                    value={leg.closingOddsInput}
                    onChange={(e) => updateLeg(i, { closingOddsInput: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          {betType === 'parlay' && (
            <button
              type="button"
              onClick={addLeg}
              className="w-full rounded-lg border border-dashed border-border py-2 text-sm text-slate-400 transition hover:border-win hover:text-win"
            >
              + Ajouter un leg
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Mise" type="number" step="0.01" min="0.01" value={stake} onChange={(e) => setStake(e.target.value)} />
          <FormField
            label="Confiance (1-5)"
            type="number"
            min="1"
            max="5"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          />
        </div>
        <FormField
          label="Date"
          type="datetime-local"
          value={placedAt}
          onChange={(e) => setPlacedAt(e.target.value)}
        />
        <FormField label="Notes (optionnel)" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : bet ? 'Mettre à jour' : 'Ajouter le pari'}
        </button>
      </form>
    </Modal>
  )
}
