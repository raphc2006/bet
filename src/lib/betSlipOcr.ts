import { supabase } from './supabase'

export type ParsedBetSlipLeg = {
  event_description: string
  market: string | null
  league: string | null
  odds_decimal: number
}

export type ParsedBetSlip = {
  bet_type: 'single' | 'parlay'
  stake: number | null
  legs: ParsedBetSlipLeg[]
}

export const BET_SLIP_MAX_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function isValidLeg(leg: unknown): leg is ParsedBetSlipLeg {
  if (!leg || typeof leg !== 'object') return false
  const l = leg as Record<string, unknown>
  return (
    typeof l.event_description === 'string' &&
    l.event_description.trim().length > 0 &&
    typeof l.odds_decimal === 'number' &&
    l.odds_decimal > 1 &&
    (l.market === null || typeof l.market === 'string') &&
    (l.league === null || typeof l.league === 'string')
  )
}

/** Envoie une capture d'écran de ticket de pari à la fonction d'OCR (Claude vision) et renvoie les infos extraites. */
export async function parseBetSlipImage(file: File): Promise<{ data: ParsedBetSlip | null; error: string | null }> {
  if (!ACCEPTED_TYPES.includes(file.type)) return { data: null, error: 'type' }
  if (file.size > BET_SLIP_MAX_SIZE_BYTES) return { data: null, error: 'size' }

  const image = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke('parse-bet-slip', {
    body: { image, mediaType: file.type },
  })
  if (error) return { data: null, error: 'request' }
  if (!data || typeof data !== 'object' || 'error' in data) return { data: null, error: 'unreadable' }

  const legs = Array.isArray(data.legs) ? data.legs.filter(isValidLeg) : []
  if (legs.length === 0) return { data: null, error: 'unreadable' }

  return {
    data: {
      bet_type: legs.length > 1 ? 'parlay' : 'single',
      stake: typeof data.stake === 'number' && data.stake > 0 ? data.stake : null,
      legs,
    },
    error: null,
  }
}
