import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Bet, BetStatus, BetType } from '../types/domain'

export type LegInput = {
  event_description: string
  market: string
  league: string | null
  odds_decimal: number
  closing_odds_decimal: number | null
}

export type BetInput = {
  bet_type: BetType
  stake: number
  confidence: number | null
  notes: string
  placed_at: string
  legs: LegInput[]
}

export function useBets() {
  const { user } = useAuth()
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('bets')
      .select('*, bet_legs(*)')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setBets((data ?? []) as Bet[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  function legsPayload(betId: string, legs: LegInput[]) {
    return legs.map((leg, i) => ({
      bet_id: betId,
      sort_order: i,
      event_description: leg.event_description,
      market: leg.market || null,
      league: leg.league,
      odds_decimal: leg.odds_decimal,
      closing_odds_decimal: leg.closing_odds_decimal,
    }))
  }

  async function createBet(input: BetInput) {
    if (!user) return { error: 'Non connecté.' }
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        user_id: user.id,
        bet_type: input.bet_type,
        stake: input.stake,
        confidence: input.confidence,
        notes: input.notes || null,
        placed_at: input.placed_at,
      })
      .select('*')
      .single()
    if (betError || !bet) return { error: betError?.message ?? 'Erreur lors de la création du pari.' }

    const { error: legsError } = await supabase.from('bet_legs').insert(legsPayload(bet.id, input.legs))
    if (legsError) return { error: legsError.message }

    await load()
    return { error: null }
  }

  async function updateBet(betId: string, input: BetInput) {
    const { error: betError } = await supabase
      .from('bets')
      .update({
        bet_type: input.bet_type,
        stake: input.stake,
        confidence: input.confidence,
        notes: input.notes || null,
        placed_at: input.placed_at,
      })
      .eq('id', betId)
    if (betError) return { error: betError.message }

    // Remplace entièrement les légs : plus simple et suffisant vu le faible nombre de légs par pari.
    const { error: deleteError } = await supabase.from('bet_legs').delete().eq('bet_id', betId)
    if (deleteError) return { error: deleteError.message }

    const { error: legsError } = await supabase.from('bet_legs').insert(legsPayload(betId, input.legs))
    if (legsError) return { error: legsError.message }

    await load()
    return { error: null }
  }

  async function settleBet(betId: string, status: BetStatus) {
    const { error } = await supabase
      .from('bets')
      .update({ status, settled_at: status === 'pending' ? null : new Date().toISOString() })
      .eq('id', betId)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  async function deleteBet(betId: string) {
    const { error } = await supabase.from('bets').delete().eq('id', betId)
    if (error) return { error: error.message }
    setBets((prev) => prev.filter((b) => b.id !== betId))
    return { error: null }
  }

  return { bets, loading, error, createBet, updateBet, settleBet, deleteBet, reload: load }
}
