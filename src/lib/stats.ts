import { format } from 'date-fns'
import type { Bet, BankrollAdjustment } from '../types/domain'
import { combinedDecimalOdds } from './odds'
import { MARKET_TYPES } from './constants'

export function betDecimalOdds(bet: Bet): number {
  return combinedDecimalOdds(bet.bet_legs.map((leg) => leg.odds_decimal))
}

export function isSettled(bet: Bet): boolean {
  return bet.status === 'won' || bet.status === 'lost' || bet.status === 'push'
}

/** Profit/perte du pari : positif si gagné, -stake si perdu, 0 si push ou en attente. */
export function betProfit(bet: Bet): number {
  if (bet.status === 'won') return bet.stake * (betDecimalOdds(bet) - 1)
  if (bet.status === 'lost') return -bet.stake
  return 0
}

export type Stats = {
  totalBets: number
  settledBets: number
  wins: number
  losses: number
  pushes: number
  pending: number
  winRate: number | null
  totalStaked: number
  totalProfit: number
  roi: number | null
  avgClv: number | null
}

export function computeStats(bets: Bet[]): Stats {
  const settled = bets.filter(isSettled)
  const wins = settled.filter((b) => b.status === 'won').length
  const losses = settled.filter((b) => b.status === 'lost').length
  const pushes = settled.filter((b) => b.status === 'push').length
  const decisiveCount = wins + losses
  const totalStaked = settled.reduce((sum, b) => sum + b.stake, 0)
  const totalProfit = settled.reduce((sum, b) => sum + betProfit(b), 0)

  const clvValues: number[] = []
  for (const bet of bets) {
    for (const leg of bet.bet_legs) {
      if (leg.closing_odds_decimal) {
        clvValues.push((leg.odds_decimal / leg.closing_odds_decimal - 1) * 100)
      }
    }
  }

  return {
    totalBets: bets.length,
    settledBets: settled.length,
    wins,
    losses,
    pushes,
    pending: bets.length - settled.length,
    winRate: decisiveCount > 0 ? (wins / decisiveCount) * 100 : null,
    totalStaked,
    totalProfit,
    roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : null,
    avgClv: clvValues.length > 0 ? clvValues.reduce((a, b) => a + b, 0) / clvValues.length : null,
  }
}

export type DailyNet = { date: string; net: number }

/** Regroupe paris réglés (par date du pari) + ajustements par jour (clé YYYY-MM-DD) pour le calendrier et le graphique. */
export function computeDailyNet(bets: Bet[], adjustments: BankrollAdjustment[]): Map<string, number> {
  const byDay = new Map<string, number>()

  for (const bet of bets) {
    if (!isSettled(bet)) continue
    const day = format(new Date(bet.placed_at), 'yyyy-MM-dd')
    byDay.set(day, (byDay.get(day) ?? 0) + betProfit(bet))
  }

  for (const adjustment of adjustments) {
    const day = format(new Date(adjustment.created_at), 'yyyy-MM-dd')
    byDay.set(day, (byDay.get(day) ?? 0) + adjustment.amount)
  }

  return byDay
}

export type BalancePoint = { date: string; balance: number }

/** Série temporelle du solde cumulé (utilisée pour le graphique d'évolution). */
export function computeBalanceSeries(startingAmount: number, bets: Bet[], adjustments: BankrollAdjustment[]): BalancePoint[] {
  const dailyNet = computeDailyNet(bets, adjustments)
  const sortedDays = Array.from(dailyNet.keys()).sort()

  let balance = startingAmount
  const points: BalancePoint[] = [{ date: 'Départ', balance }]
  for (const day of sortedDays) {
    balance += dailyNet.get(day) ?? 0
    points.push({ date: day, balance })
  }
  return points
}

export function currentBalance(startingAmount: number, bets: Bet[], adjustments: BankrollAdjustment[]): number {
  const settledProfit = bets.filter(isSettled).reduce((sum, b) => sum + betProfit(b), 0)
  const adjustmentsTotal = adjustments.reduce((sum, a) => sum + a.amount, 0)
  return startingAmount + settledProfit + adjustmentsTotal
}

/** Paris placés entre start et end (inclus), utilisé pour les stats par mois/semaine. */
export function betsInRange(bets: Bet[], start: Date, end: Date): Bet[] {
  return bets.filter((bet) => {
    const placedAt = new Date(bet.placed_at)
    return placedAt >= start && placedAt <= end
  })
}

/** Paris placés le même jour calendaire que `day`. */
export function betsOnDay(bets: Bet[], day: Date): Bet[] {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)
  return betsInRange(bets, start, end)
}

export type BetFilters = {
  league?: string
  marketType?: string
  text?: string
  dateFrom?: string
  dateTo?: string
}

/** Filtre le journal par ligue, type de marché, texte libre et plage de dates (dateFrom/dateTo au format YYYY-MM-DD). */
export function filterBets(bets: Bet[], filters: BetFilters): Bet[] {
  const text = filters.text?.trim().toLowerCase()
  const marketKeywords = MARKET_TYPES.find((m) => m.value === filters.marketType)?.keywords

  return bets.filter((bet) => {
    if (filters.league && !bet.bet_legs.some((leg) => leg.league === filters.league)) return false

    if (marketKeywords) {
      const matchesMarket = bet.bet_legs.some((leg) => {
        const market = leg.market?.toLowerCase() ?? ''
        return marketKeywords.some((kw) => market.includes(kw))
      })
      if (!matchesMarket) return false
    }

    if (filters.dateFrom || filters.dateTo) {
      const betDay = format(new Date(bet.placed_at), 'yyyy-MM-dd')
      if (filters.dateFrom && betDay < filters.dateFrom) return false
      if (filters.dateTo && betDay > filters.dateTo) return false
    }

    if (text) {
      const haystack = [bet.notes ?? '', ...bet.bet_legs.map((leg) => `${leg.event_description} ${leg.market ?? ''}`)]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(text)) return false
    }

    return true
  })
}
