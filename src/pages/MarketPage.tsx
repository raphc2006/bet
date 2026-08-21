import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfile } from '../hooks/useProfile'
import { useLocale } from '../hooks/useLocale'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { SportIcon } from '../components/ui/SportIcon'
import { formatOdds, type OddsFormat } from '../lib/odds'
import {
  fetchMarketOdds,
  bestPrice,
  MARKET_SPORTS,
  type MarketError,
  type MarketEvent,
  type MarketMarketKey,
  type QuotaInfo,
  type MarketSportKey,
} from '../lib/marketOdds'
import type { TranslationKey } from '../lib/i18n'

const MARKET_TABS: { key: MarketMarketKey; labelKey: TranslationKey }[] = [
  { key: 'h2h', labelKey: 'market.marketH2h' },
  { key: 'spreads', labelKey: 'market.marketSpreads' },
  { key: 'totals', labelKey: 'market.marketTotals' },
]

const ERROR_KEY: Record<MarketError, TranslationKey> = {
  auth: 'market.errorAuth',
  plan: 'market.errorPlan',
  quota: 'market.errorQuota',
  network: 'market.errorNetwork',
  unknown: 'market.errorUnknown',
}

function outcomeOrder(event: MarketEvent, marketKey: MarketMarketKey): string[] {
  if (marketKey === 'totals') return ['Over', 'Under']
  return [event.away_team, event.home_team]
}

function OddsTable({ event, marketKey, oddsFormat }: { event: MarketEvent; marketKey: MarketMarketKey; oddsFormat: OddsFormat }) {
  const { t } = useLocale()
  const books = event.bookmakers.filter((b) => b.markets.some((m) => m.key === marketKey))
  if (books.length === 0) {
    return <p className="py-3 text-center text-xs text-slate-500">—</p>
  }
  const outcomes = outcomeOrder(event, marketKey)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-32 pb-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{t('market.outcome')}</th>
            {books.map((b) => (
              <th key={b.key} className="pb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                {b.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outcomes.map((name) => {
            const best = bestPrice(event.bookmakers, marketKey, name)
            return (
              <tr key={name} className="border-t border-border">
                <td className="py-2 pr-2 text-slate-200">{name}</td>
                {books.map((b) => {
                  const outcome = b.markets.find((m) => m.key === marketKey)?.outcomes.find((o) => o.name === name)
                  const isBest = outcome && best !== null && outcome.price === best
                  return (
                    <td key={b.key} className="py-2 text-center">
                      {outcome ? (
                        <div
                          className={`mx-auto inline-flex flex-col items-center rounded-lg px-2 py-1 ${
                            isBest ? 'bg-win/15 text-win' : 'text-slate-200'
                          }`}
                        >
                          {outcome.point !== undefined && (
                            <span className="font-mono text-[10px] text-slate-500">
                              {outcome.point > 0 ? `+${outcome.point}` : outcome.point}
                            </span>
                          )}
                          <span className="font-mono text-sm font-semibold">{formatOdds(outcome.price, oddsFormat)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function MarketPage() {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const profileState = useProfile()
  const oddsFormat = (profileState.profile?.odds_format as OddsFormat | undefined) ?? 'decimal'

  const [sport, setSport] = useState<MarketSportKey>('basketball_nba')
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [marketKey, setMarketKey] = useState<MarketMarketKey>('h2h')
  const [events, setEvents] = useState<MarketEvent[]>([])
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [error, setError] = useState<MarketError | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const commenceTimeFrom = `${dateFrom}T00:00:00Z`
    const commenceTimeTo = `${dateTo}T23:59:59Z`
    fetchMarketOdds(sport, commenceTimeFrom, commenceTimeTo).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.error) {
        setError(res.error)
        setEvents([])
        return
      }
      setEvents(res.events ?? [])
      setQuota(res.quota)
    })
    return () => {
      cancelled = true
    }
  }, [sport, dateFrom, dateTo])

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <h1 className="font-display text-2xl font-semibold text-slate-50">{t('market.pageTitle')}</h1>

        <div className="flex flex-wrap gap-2">
          {MARKET_SPORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSport(s.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                sport === s.key ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400 hover:text-slate-100'
              }`}
            >
              <SportIcon league={s.league} size={14} />
              {s.league}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{t('market.dateFrom')}</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{t('market.dateTo')}</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
            />
          </label>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-border">
          {MARKET_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMarketKey(tab.key)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition ${
                marketKey === tab.key ? 'bg-win/10 text-win' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {quota && quota.remaining !== null && quota.remaining < 20 && (
          <p className="rounded-lg border border-push/40 bg-push/10 px-3 py-2 text-xs text-push">
            {t('market.quotaLow', { n: quota.remaining })}
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{t(ERROR_KEY[error])}</div>
        )}

        {!error && loading && <p className="font-mono text-sm text-slate-500">{t('market.loading')}</p>}

        {!error && !loading && events.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-500">
            {t('market.noEvents')}
          </div>
        )}

        {!error && !loading && events.length > 0 && (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-charcoal-light p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-slate-100">
                    {event.away_team} @ {event.home_team}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {format(new Date(event.commence_time), 'EEE d MMM · HH:mm', { locale: dateFnsLocale })}
                  </p>
                </div>
                <OddsTable event={event} marketKey={marketKey} oddsFormat={oddsFormat} />
                <p className="mt-3 text-center text-xs text-slate-600">{t('market.addBetSoon')}</p>
              </div>
            ))}
          </div>
        )}

        {quota && quota.remaining !== null && !error && (
          <p className="text-center text-xs text-slate-600">{t('market.quotaRemaining', { n: quota.remaining })}</p>
        )}
      </main>
    </div>
  )
}
