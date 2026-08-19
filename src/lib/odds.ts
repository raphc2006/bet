export type OddsFormat = 'decimal' | 'american'

export function americanToDecimal(american: number): number {
  if (american > 0) return 1 + american / 100
  return 1 + 100 / Math.abs(american)
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

export function formatAmerican(american: number): string {
  return american > 0 ? `+${american}` : `${american}`
}

export function combinedDecimalOdds(legOdds: number[]): number {
  return legOdds.reduce((acc, odds) => acc * odds, 1)
}

/** Parse une saisie utilisateur (décimal ou américain) vers une cote décimale, ou null si invalide. */
export function parseOddsInput(raw: string, format: OddsFormat): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (Number.isNaN(num) || num === 0) return null
  if (format === 'decimal') return num > 1 ? num : null
  return americanToDecimal(num)
}

/** Formate une cote décimale pour l'affichage dans le format choisi. */
export function formatOdds(decimal: number, format: OddsFormat): string {
  if (format === 'decimal') return decimal.toFixed(2)
  return formatAmerican(decimalToAmerican(decimal))
}
