import { supabase } from './supabase'

export type MarketSportKey = 'americanfootball_nfl' | 'baseball_mlb' | 'basketball_nba' | 'icehockey_nhl'

export const MARKET_SPORTS: { key: MarketSportKey; league: string }[] = [
  { key: 'basketball_nba', league: 'NBA' },
  { key: 'baseball_mlb', league: 'MLB' },
  { key: 'americanfootball_nfl', league: 'NFL' },
  { key: 'icehockey_nhl', league: 'NHL' },
]

export type MarketOutcome = { name: string; price: number; point?: number }
export type MarketMarketKey = 'h2h' | 'spreads' | 'totals'
export type MarketMarket = { key: MarketMarketKey; outcomes: MarketOutcome[] }
export type MarketBookmaker = { key: string; title: string; last_update: string; markets: MarketMarket[] }
export type MarketEvent = {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: MarketBookmaker[]
}

export type QuotaInfo = { remaining: number | null; used: number | null; last: number | null }
export type MarketError = 'auth' | 'plan' | 'quota' | 'network' | 'unknown'

type CacheEntry = { events: MarketEvent[]; quota: QuotaInfo; expiresAt: number }
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

function cacheKey(sport: string, dateFrom?: string, dateTo?: string) {
  return `${sport}|${dateFrom ?? ''}|${dateTo ?? ''}`
}

/** Récupère les cotes d'un sport depuis The Odds API (via l'Edge Function proxy), avec cache client de quelques minutes. */
export async function fetchMarketOdds(
  sport: MarketSportKey,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ events: MarketEvent[] | null; quota: QuotaInfo | null; error: MarketError | null }> {
  const key = cacheKey(sport, dateFrom, dateTo)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return { events: cached.events, quota: cached.quota, error: null }
  }

  const { data: result, error } = await supabase.functions.invoke('market-odds', {
    body: { resource: 'odds', sport, dateFrom, dateTo },
  })
  if (error) return { events: null, quota: null, error: 'network' }
  if (!result?.ok) {
    const known: MarketError[] = ['auth', 'plan', 'quota', 'network', 'unknown']
    const err = known.includes(result?.error) ? (result.error as MarketError) : 'unknown'
    return { events: null, quota: null, error: err }
  }

  const events = (result.data ?? []) as MarketEvent[]
  const quota = (result.quota ?? { remaining: null, used: null, last: null }) as QuotaInfo
  cache.set(key, { events, quota, expiresAt: Date.now() + CACHE_TTL_MS })
  return { events, quota, error: null }
}

/** Meilleure cote (la plus élevée en décimal) pour un nom de résultat donné, tous books confondus. */
export function bestPrice(bookmakers: MarketBookmaker[], marketKey: MarketMarketKey, outcomeName: string): number | null {
  let best: number | null = null
  for (const b of bookmakers) {
    const market = b.markets.find((m) => m.key === marketKey)
    const outcome = market?.outcomes.find((o) => o.name === outcomeName)
    if (outcome && (best === null || outcome.price > best)) best = outcome.price
  }
  return best
}
