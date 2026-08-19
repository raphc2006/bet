import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Bet, BetType } from '../../types/domain'
import type { BetInput, LegInput } from '../../hooks/useBets'
import { combinedDecimalOdds, formatOdds, parseOddsInput, type OddsFormat } from '../../lib/odds'
import { useLocale } from '../../hooks/useLocale'
import { Modal } from '../ui/Modal'
import { FormField } from '../auth/AuthCard'
import { SportIcon } from '../ui/SportIcon'
import { LEAGUES, MARKET_OPTIONS } from '../../lib/constants'

type LegFormState = {
  event_description: string
  market: string
  marketOther: string
  league: string
  oddsInput: string
  closingOddsInput: string
}

function emptyLeg(): LegFormState {
  return { event_description: '', market: '', marketOther: '', league: '', oddsInput: '', closingOddsInput: '' }
}

function legsFromBet(bet: Bet, format: OddsFormat): LegFormState[] {
  return bet.bet_legs.map((leg) => {
    const isKnownOption = (MARKET_OPTIONS as readonly string[]).includes(leg.market ?? '')
    return {
      event_description: leg.event_description,
      market: leg.market ? (isKnownOption ? leg.market : 'Autre') : '',
      marketOther: leg.market && !isKnownOption ? leg.market : '',
      league: leg.league ?? '',
      oddsInput: formatOdds(leg.odds_decimal, format),
      closingOddsInput: leg.closing_odds_decimal ? formatOdds(leg.closing_odds_decimal, format) : '',
    }
  })
}

type Props = {
  bet?: Bet
  defaultOddsFormat?: OddsFormat
  defaultDate?: Date
  onClose: () => void
  onSubmit: (input: BetInput) => Promise<{ error: string | null }>
}

export function BetForm({ bet, defaultOddsFormat = 'decimal', defaultDate, onClose, onSubmit }: Props) {
  const { t } = useLocale()
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>(defaultOddsFormat)
  const [betType, setBetType] = useState<BetType>((bet?.bet_type as BetType) ?? 'single')
  const [stake, setStake] = useState(bet ? String(bet.stake) : '')
  const [confidence, setConfidence] = useState(bet?.confidence ? String(bet.confidence) : '')
  const [notes, setNotes] = useState(bet?.notes ?? '')
  const [placedAt, setPlacedAt] = useState(() => {
    if (bet) return bet.placed_at.slice(0, 16)
    if (defaultDate) {
      const now = new Date()
      const combined = new Date(defaultDate)
      combined.setHours(now.getHours(), now.getMinutes())
      return combined.toISOString().slice(0, 16)
    }
    return new Date().toISOString().slice(0, 16)
  })
  const [legs, setLegs] = useState<LegFormState[]>(bet ? legsFromBet(bet, defaultOddsFormat) : [emptyLeg()])
  const [finalOddsOverride, setFinalOddsOverride] = useState(Boolean(bet?.final_odds_decimal))
  const [finalOddsInput, setFinalOddsInput] = useState(() =>
    bet?.final_odds_decimal ? formatOdds(bet.final_odds_decimal, defaultOddsFormat) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function computedParlayOdds(): number | null {
    const decimals = legs
      .map((leg) => parseOddsInput(leg.oddsInput, oddsFormat))
      .filter((d): d is number => d !== null)
    if (decimals.length === 0) return null
    return combinedDecimalOdds(decimals)
  }

  function handleToggleFinalOdds(checked: boolean) {
    setFinalOddsOverride(checked)
    if (checked) {
      const computed = computedParlayOdds()
      setFinalOddsInput(computed ? formatOdds(computed, oddsFormat) : '')
    } else {
      setFinalOddsInput('')
    }
  }

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
    if (finalOddsOverride) {
      const decimal = parseOddsInput(finalOddsInput, oddsFormat)
      setFinalOddsInput(decimal ? formatOdds(decimal, next) : finalOddsInput)
    }
    setOddsFormat(next)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const stakeValue = Number(stake)
    if (Number.isNaN(stakeValue) || stakeValue <= 0) return setError(t('betform.stakeError'))

    if (betType === 'single' && legs.length !== 1) return setError(t('betform.singleError'))
    if (betType === 'parlay' && legs.length < 2) return setError(t('betform.parlayError'))

    let finalOddsDecimal: number | null = null
    if (betType === 'parlay' && finalOddsOverride) {
      finalOddsDecimal = parseOddsInput(finalOddsInput, oddsFormat)
      if (!finalOddsDecimal) return setError(t('betform.finalOddsError'))
    }

    const parsedLegs: LegInput[] = []
    for (const leg of legs) {
      if (!leg.event_description.trim()) return setError(t('betform.legDescError'))
      const decimal = parseOddsInput(leg.oddsInput, oddsFormat)
      if (!decimal) return setError(t('betform.oddsError', { event: leg.event_description }))
      const closingDecimal = leg.closingOddsInput ? parseOddsInput(leg.closingOddsInput, oddsFormat) : null
      const market = leg.market === 'Autre' ? leg.marketOther.trim() || 'Autre' : leg.market
      parsedLegs.push({
        event_description: leg.event_description.trim(),
        market,
        league: leg.league || null,
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
      final_odds_decimal: finalOddsDecimal,
      legs: parsedLegs,
    })
    setSubmitting(false)
    if (error) return setError(error)
    onClose()
  }

  return (
    <Modal title={bet ? t('betform.editTitle') : t('betform.newTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-loss">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setBetType('single')
              handleToggleFinalOdds(false)
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              betType === 'single' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            {t('betform.single')}
          </button>
          <button
            type="button"
            onClick={() => setBetType('parlay')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              betType === 'parlay' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            {t('betform.parlay')}
          </button>
          <button
            type="button"
            onClick={() => toggleOddsFormat(oddsFormat === 'decimal' ? 'american' : 'decimal')}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-slate-100"
          >
            {oddsFormat === 'decimal' ? t('betform.oddsToggleDecimal') : t('betform.oddsToggleAmerican')}
          </button>
        </div>

        <div className="space-y-3">
          {legs.map((leg, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {betType === 'parlay' ? t('betform.leg', { n: i + 1 }) : t('betform.event')}
                </span>
                {betType === 'parlay' && legs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeLeg(i)}
                    className="text-xs text-loss hover:underline"
                  >
                    {t('betform.remove')}
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-2">
                <FormField
                  label={t('betform.description')}
                  type="text"
                  placeholder={t('betform.descriptionPlaceholder')}
                  value={leg.event_description}
                  onChange={(e) => updateLeg(i, { event_description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                      <SportIcon league={leg.league} size={12} />
                      {t('betform.league')}
                    </span>
                    <select
                      value={leg.league}
                      onChange={(e) => updateLeg(i, { league: e.target.value })}
                      className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
                    >
                      <option value="">{t('betform.leagueNone')}</option>
                      {LEAGUES.map((league) => (
                        <option key={league} value={league}>
                          {league}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                      {t('betform.market')}
                    </span>
                    <select
                      value={leg.market}
                      onChange={(e) => updateLeg(i, { market: e.target.value, marketOther: '' })}
                      className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
                    >
                      <option value="">{t('betform.marketNone')}</option>
                      {MARKET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {leg.market === 'Autre' && (
                  <FormField
                    label={t('betform.marketOther')}
                    type="text"
                    placeholder="1X2"
                    value={leg.marketOther}
                    onChange={(e) => updateLeg(i, { marketOther: e.target.value })}
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label={t('betform.odds')}
                    type="text"
                    inputMode="decimal"
                    placeholder={oddsFormat === 'decimal' ? '1.85' : '-118'}
                    value={leg.oddsInput}
                    onChange={(e) => updateLeg(i, { oddsInput: e.target.value })}
                  />
                  <FormField
                    label={t('betform.closingOdds')}
                    type="text"
                    inputMode="decimal"
                    placeholder={t('betform.optional')}
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
              {t('betform.addLeg')}
            </button>
          )}
        </div>

        {betType === 'parlay' && (
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={finalOddsOverride}
                onChange={(e) => handleToggleFinalOdds(e.target.checked)}
                className="accent-win"
              />
              {t('betform.finalOddsToggle')}
            </label>
            {finalOddsOverride && (
              <div className="mt-2">
                <FormField
                  label={t('betform.finalOdds')}
                  type="text"
                  inputMode="decimal"
                  placeholder={oddsFormat === 'decimal' ? '4.50' : '+350'}
                  value={finalOddsInput}
                  onChange={(e) => setFinalOddsInput(e.target.value)}
                />
                {(() => {
                  const computed = computedParlayOdds()
                  return computed ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {t('betform.finalOddsComputed', { odds: formatOdds(computed, oddsFormat) })}
                    </p>
                  ) : null
                })()}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <FormField
            label={t('betform.stake')}
            type="number"
            step="0.01"
            min="0.01"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
          <FormField
            label={t('betform.confidence')}
            type="number"
            min="1"
            max="5"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          />
        </div>
        <FormField
          label={t('betform.date')}
          type="datetime-local"
          value={placedAt}
          onChange={(e) => setPlacedAt(e.target.value)}
        />
        <FormField label={t('betform.notes')} type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? t('betform.saving') : bet ? t('betform.update') : t('betform.submit')}
        </button>
      </form>
    </Modal>
  )
}
