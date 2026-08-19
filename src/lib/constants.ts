export const LEAGUES = ['MLB', 'NBA', 'NFL', 'NHL', 'Soccer', 'Tennis'] as const

export const MARKET_TYPES = [
  { value: 'spread', label: 'Spread', keywords: ['spread'] },
  { value: 'total', label: 'Total', keywords: ['total', 'over/under', 'o/u'] },
  { value: 'moneyline', label: 'Moneyline (ML)', keywords: ['moneyline', 'money line', 'ml'] },
  { value: 'prop', label: 'Prop', keywords: ['prop'] },
] as const
