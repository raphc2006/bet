import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Bankroll, BankrollAdjustment, Bet, Profile } from '../types/domain'

/** Vue en lecture seule des données d'un autre utilisateur (protégée par les policies RLS "friend"). */
export function useFriendView(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bankroll, setBankroll] = useState<Bankroll | null>(null)
  const [adjustments, setAdjustments] = useState<BankrollAdjustment[]>([])
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const [profileRes, bankrollRes, adjustmentsRes, betsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId as string).single(),
        supabase.from('bankrolls').select('*').eq('user_id', userId as string).maybeSingle(),
        supabase
          .from('bankroll_adjustments')
          .select('*')
          .eq('user_id', userId as string)
          .order('created_at', { ascending: false }),
        supabase
          .from('bets')
          .select('*, bet_legs(*)')
          .eq('user_id', userId as string)
          .order('placed_at', { ascending: false }),
      ])
      if (cancelled) return

      const firstError = profileRes.error ?? bankrollRes.error ?? adjustmentsRes.error ?? betsRes.error
      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }

      setProfile(profileRes.data)
      setBankroll(bankrollRes.data)
      setAdjustments(adjustmentsRes.data ?? [])
      setBets((betsRes.data ?? []) as Bet[])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { profile, bankroll, adjustments, bets, loading, error }
}
