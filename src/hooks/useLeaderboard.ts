import { useCallback, useEffect, useState } from 'react'
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { betsInRange, computeStats, type Stats } from '../lib/stats'
import type { Bet } from '../types/domain'

export type LeaderboardEntry = {
  userId: string
  username: string
  avatarUrl: string | null
  currency: string
  weekStats: Stats
  monthStats: Stats
}

const BETS_SELECT = 'id, user_id, stake, status, placed_at, final_odds_decimal, bet_legs(odds_decimal, closing_odds_decimal, status)'

/** Classement (soi + amis acceptés) sur la semaine et le mois en cours. */
export function useLeaderboard() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    if (friendshipsError) {
      setError(friendshipsError.message)
      setLoading(false)
      return
    }

    const friendIds = (friendships ?? []).map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
    const ids = [user.id, ...friendIds]

    const [profilesRes, bankrollsRes, betsRes] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').in('id', ids),
      supabase.from('bankrolls').select('user_id, currency').in('user_id', ids),
      supabase.from('bets').select(BETS_SELECT).in('user_id', ids),
    ])
    const firstError = profilesRes.error ?? bankrollsRes.error ?? betsRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))
    const currencyById = new Map((bankrollsRes.data ?? []).map((b) => [b.user_id, b.currency]))
    const betsByUser = new Map<string, Bet[]>()
    for (const bet of (betsRes.data ?? []) as unknown as Bet[]) {
      const list = betsByUser.get(bet.user_id) ?? []
      list.push(bet)
      betsByUser.set(bet.user_id, list)
    }

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const built: LeaderboardEntry[] = ids.flatMap((id) => {
      const profile = profileById.get(id)
      if (!profile) return []
      const bets = betsByUser.get(id) ?? []
      return [
        {
          userId: id,
          username: profile.username,
          avatarUrl: profile.avatar_url,
          currency: currencyById.get(id) ?? 'EUR',
          weekStats: computeStats(betsInRange(bets, weekStart, weekEnd)),
          monthStats: computeStats(betsInRange(bets, monthStart, monthEnd)),
        },
      ]
    })

    setEntries(built)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { entries, loading, error, reload: load }
}
