export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatSignedCurrency(amount: number, currency = 'EUR'): string {
  const formatted = formatCurrency(Math.abs(amount), currency)
  return amount >= 0 ? `+${formatted}` : `-${formatted}`
}

export function formatSignedCompact(amount: number, currency = 'EUR'): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(amount))
  return amount >= 0 ? `+${formatted}` : `-${formatted}`
}

/** Comme formatSignedCompact mais sans le symbole de devise, pour les espaces très étroits (ex: calendrier mobile). */
export function formatSignedCompactNumber(amount: number): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(amount))
  return amount >= 0 ? `+${formatted}` : `-${formatted}`
}
