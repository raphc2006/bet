import type { Stats } from '../../lib/stats'
import { formatPercent, formatSignedCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' | 'neutral' }) {
  const toneClass = tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : 'text-slate-100'
  return (
    <div className="rounded-xl border border-border bg-charcoal-light p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

export function StatsGrid({ stats, currency }: { stats: Stats; currency: string }) {
  const { t } = useLocale()
  const profitTone = stats.totalProfit > 0 ? 'win' : stats.totalProfit < 0 ? 'loss' : 'neutral'
  const roiTone = stats.roi === null ? 'neutral' : stats.roi > 0 ? 'win' : stats.roi < 0 ? 'loss' : 'neutral'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label={t('stats.winRate')} value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`} />
      <Tile label={t('stats.roi')} value={stats.roi === null ? '—' : formatPercent(stats.roi)} tone={roiTone} />
      <Tile label={t('stats.totalProfit')} value={formatSignedCurrency(stats.totalProfit, currency)} tone={profitTone} />
      <Tile label={t('stats.avgClv')} value={stats.avgClv === null ? '—' : formatPercent(stats.avgClv)} />
    </div>
  )
}
