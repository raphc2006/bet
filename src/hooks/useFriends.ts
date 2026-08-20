import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Friendship } from '../types/domain'

type FriendProfile = { username: string; avatar_url: string | null }
export type FriendshipRow = Friendship & { requester: FriendProfile; addressee: FriendProfile }
export type SearchResult = { id: string; username: string; avatar_url: string | null }

export function useFriends() {
  const { user } = useAuth()
  const [friendships, setFriendships] = useState<FriendshipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('friendships')
      .select(
        '*, requester:profiles!friendships_requester_id_fkey(username, avatar_url), addressee:profiles!friendships_addressee_id_fkey(username, avatar_url)',
      )
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setFriendships((data ?? []) as unknown as FriendshipRow[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const accepted = friendships.filter((f) => f.status === 'accepted')
  const received = friendships.filter((f) => f.status === 'pending' && f.addressee_id === user?.id)
  const sent = friendships.filter((f) => f.status === 'pending' && f.requester_id === user?.id)

  function otherProfile(f: FriendshipRow): FriendProfile {
    return f.requester_id === user?.id ? f.addressee : f.requester
  }

  function otherUserId(f: FriendshipRow): string {
    return f.requester_id === user?.id ? f.addressee_id : f.requester_id
  }

  async function searchUsers(query: string): Promise<{ data: SearchResult[]; error: string | null }> {
    const trimmed = query.trim()
    if (!trimmed || !user) return { data: [], error: null }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${trimmed}%`)
      .neq('id', user.id)
      .limit(10)
    if (error) return { data: [], error: error.message }
    return { data: data ?? [], error: null }
  }

  async function sendRequest(addresseeId: string) {
    if (!user) return { error: 'Non connecté.' }
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId })
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  async function respond(friendshipId: string, status: 'accepted' | 'declined') {
    const { error } = await supabase
      .from('friendships')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', friendshipId)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }

  async function remove(friendshipId: string) {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    if (error) return { error: error.message }
    setFriendships((prev) => prev.filter((f) => f.id !== friendshipId))
    return { error: null }
  }

  return {
    friendships,
    accepted,
    received,
    sent,
    otherProfile,
    otherUserId,
    loading,
    error,
    searchUsers,
    sendRequest,
    respond,
    remove,
    reload: load,
  }
}

/** Nombre de demandes d'ami reçues et en attente (pour le badge de notification). */
export function usePendingFriendRequestsCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    const { count: pendingCount, error } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
    if (!error) setCount(pendingCount ?? 0)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { count, reload: load }
}
