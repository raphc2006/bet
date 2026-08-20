import { useState } from 'react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import type { Stats } from '../../lib/stats'
import { betLabel, betProfit } from '../../lib/stats'
import type { Bet } from '../../types/domain'
import { formatPercent, formatSignedCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'

type Props = {
  weekStart: Date
  weekEnd: Date
  stats: Stats
  currency: string
  bestBet: Bet | null
  worstBet: Bet | null
  onClose: () => void
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' | 'neutral' }) {
  const toneClass = tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : 'text-slate-100'
  return (
    <div className="rounded-lg border border-border bg-charcoal-lighter p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 font-mono text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function BetRow({ label, bet, currency, tone }: { label: string; bet: Bet; currency: string; tone: 'win' | 'loss' }) {
  const profit = betProfit(bet)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-charcoal-lighter px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm text-slate-200">{betLabel(bet)}</p>
      </div>
      <p className={`shrink-0 font-mono text-sm font-semibold ${tone === 'win' ? 'text-win' : 'text-loss'}`}>
        {formatSignedCurrency(profit, currency)}
      </p>
    </div>
  )
}

export function WeeklyReviewModal({ weekStart, weekEnd, stats, currency, bestBet, worstBet, onClose }: Props) {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const positive = stats.totalProfit >= 0
  const weekLabel = `${format(weekStart, 'd MMM', { locale: dateFnsLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateFnsLocale })}`
  const [copied, setCopied] = useState(false)

  function buildShareText() {
    const lines = [
      `📊 ${t('weeklyReview.title')} — ${weekLabel}`,
      `${t('weeklyReview.netProfit')}: ${formatSignedCurrency(stats.totalProfit, currency)}`,
      `${t('stats.winRate')}: ${stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`}`,
      `${t('stats.roi')}: ${stats.roi === null ? '—' : formatPercent(stats.roi)}`,
      `${t('weeklyReview.record')}: ${stats.wins}-${stats.losses}`,
    ]
    if (stats.avgClv !== null) lines.push(`${t('stats.avgClv')}: ${formatPercent(stats.avgClv)}`)
    if (bestBet) lines.push(`${t('weeklyReview.bestBet')}: ${betLabel(bestBet)} (${formatSignedCurrency(betProfit(bestBet), currency)})`)
    if (worstBet && worstBet.id !== bestBet?.id) {
      lines.push(`${t('weeklyReview.worstBet')}: ${betLabel(worstBet)} (${formatSignedCurrency(betProfit(worstBet), currency)})`)
    }
    lines.push('', 'BetTracker')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: t('weeklyReview.title'), text })
      } catch {
        // Partage annulé par l'utilisateur : rien à faire.
      }
      return
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className={`w-full max-w-md overflow-hidden rounded-xl border border-border bg-charcoal-light shadow-xl border-t-4 ${
          positive ? 'border-t-win' : 'border-t-loss'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-slate-50">{t('weeklyReview.title')}</h2>
              <p className="mt-0.5 font-mono text-xs text-slate-500">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="text-xs font-medium text-slate-400 hover:text-slate-100"
                aria-label={t('weeklyReview.share')}
              >
                {copied ? t('weeklyReview.copied') : t('weeklyReview.share')}
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-100" aria-label="Fermer">
                ✕
              </button>
            </div>
          </div>

          <div className={`rounded-xl border p-5 text-center ${positive ? 'border-win/30 bg-win/10' : 'border-loss/30 bg-loss/10'}`}>
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('weeklyReview.netProfit')}</p>
            <p className={`mt-1 font-mono text-4xl font-bold ${positive ? 'text-win' : 'text-loss'}`}>
              {formatSignedCurrency(stats.totalProfit, currency)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={t('stats.winRate')} value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`} />
            <Tile label={t('stats.roi')} value={stats.roi === null ? '—' : formatPercent(stats.roi)} />
            <Tile label={t('weeklyReview.record')} value={`${stats.wins}-${stats.losses}`} />
            <Tile label={t('stats.avgClv')} value={stats.avgClv === null ? '—' : formatPercent(stats.avgClv)} />
          </div>

          {(bestBet || worstBet) && (
            <div className="mt-4 space-y-2">
              {bestBet && <BetRow label={t('weeklyReview.bestBet')} bet={bestBet} currency={currency} tone="win" />}
              {worstBet && worstBet.id !== bestBet?.id && (
                <BetRow label={t('weeklyReview.worstBet')} bet={worstBet} currency={currency} tone="loss" />
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-slate-300">
            {positive ? t('weeklyReview.messagePositive') : t('weeklyReview.messageNegative')}
          </p>

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110"
          >
            {t('weeklyReview.gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}
