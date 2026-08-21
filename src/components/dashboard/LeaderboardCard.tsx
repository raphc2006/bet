import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LeaderboardEntry } from '../../hooks/useLeaderboard'
import type { Stats } from '../../lib/stats'
import { formatPercent, formatSignedCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'
import { Avatar } from '../layout/Avatar'

type Period = 'week' | 'month'
type Metric = 'profit' | 'roi' | 'winRate'

function statsForPeriod(entry: LeaderboardEntry, period: Period): Stats {
  return period === 'week' ? entry.weekStats : entry.monthStats
}

function metricValue(stats: Stats, metric: Metric): number | null {
  if (metric === 'profit') return stats.totalProfit
  if (metric === 'roi') return stats.roi
  return stats.winRate
}

function formatMetric(stats: Stats, metric: Metric, currency: string): string {
  const value = metricValue(stats, metric)
  if (value === null) return '—'
  if (metric === 'profit') return formatSignedCurrency(value, currency)
  if (metric === 'roi') return formatPercent(value)
  return `${value.toFixed(1)}%`
}

export function LeaderboardCard({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId: string }) {
  const { t } = useLocale()
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('profit')

  const sorted = [...entries].sort((a, b) => {
    const va = metricValue(statsForPeriod(a, period), metric)
    const vb = metricValue(statsForPeriod(b, period), metric)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    return vb - va
  })

  return (
    <div className="space-y-3 rounded-xl border border-border bg-charcoal-light p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-100">{t('leaderboard.title')}</h2>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  period === p ? 'bg-win/10 text-win' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t(p === 'week' ? 'leaderboard.week' : 'leaderboard.month')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-border">
        {(['profit', 'roi', 'winRate'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition ${
              metric === m ? 'bg-win/10 text-win' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {t(
              m === 'profit'
                ? 'leaderboard.metricProfit'
                : m === 'roi'
                  ? 'leaderboard.metricRoi'
                  : 'leaderboard.metricWinRate',
            )}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {sorted.map((entry, i) => {
          const isMe = entry.userId === currentUserId
          const stats = statsForPeriod(entry, period)
          const value = metricValue(stats, metric)
          const tone = value === null ? 'text-slate-500' : value > 0 ? 'text-win' : value < 0 ? 'text-loss' : 'text-slate-300'
          const row = (
            <div
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                isMe ? 'border-win/30 bg-win/5' : 'border-border bg-charcoal-lighter'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-5 shrink-0 text-center font-mono text-xs text-slate-500">{i + 1}</span>
                <Avatar url={entry.avatarUrl} username={entry.username} size={28} />
                <span className="truncate text-sm font-medium text-slate-100">
                  {entry.username}
                  {isMe && <span className="ml-1 text-xs text-slate-500">({t('leaderboard.you')})</span>}
                </span>
              </div>
              <span className={`shrink-0 font-mono text-sm font-semibold ${tone}`}>
                {formatMetric(stats, metric, entry.currency)}
              </span>
            </div>
          )
          return isMe ? (
            <div key={entry.userId}>{row}</div>
          ) : (
            <Link key={entry.userId} to={`/friends/${entry.userId}`}>
              {row}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
