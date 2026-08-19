import type { Bet } from '../types/domain'
import { betDecimalOdds, betProfit } from './stats'

export function betsToCsv(bets: Bet[]): string {
  const header = ['Date', 'Type', 'Événement(s)', 'Mise', 'Cote', 'Statut', 'Profit/Perte', 'Confiance']
  const rows = bets.map((bet) => {
    const events = bet.bet_legs.map((l) => l.event_description).join(' | ')
    return [
      bet.placed_at.slice(0, 10),
      bet.bet_type === 'single' ? 'Simple' : 'Parlay',
      events,
      bet.stake.toFixed(2),
      betDecimalOdds(bet).toFixed(2),
      bet.status,
      betProfit(bet).toFixed(2),
      bet.confidence ?? '',
    ]
  })

  const escape = (value: string | number) => {
    const str = String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
