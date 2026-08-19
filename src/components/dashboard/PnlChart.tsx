import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BalancePoint } from '../../lib/stats'
import { formatCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'

export function PnlChart({ data, currency }: { data: BalancePoint[]; currency: string }) {
  const { t } = useLocale()

  if (data.length <= 1) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-charcoal-light">
        <p className="font-mono text-sm text-slate-500">{t('dashboard.noChartData')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-charcoal-light p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">{t('dashboard.evolution')}</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis
            width={70}
            tick={{ fill: '#7b8794', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            tickFormatter={(v: number) => formatCurrency(v, currency)}
          />
          <Tooltip
            contentStyle={{ background: '#1a2029', border: '1px solid #2a3240', borderRadius: 8 }}
            labelStyle={{ color: '#7b8794' }}
            formatter={(value) => [formatCurrency(Number(value), currency), t('dashboard.balance')]}
          />
          <Line type="monotone" dataKey="balance" stroke="#3ecf6e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
