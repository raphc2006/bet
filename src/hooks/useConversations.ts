import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

type MemberProfile = { user_id: string; username: string; avatar_url: string | null }

export type ConversationSummary = {
  id: string
  type: 'dm' | 'group'
  name: string | null
  createdBy: string
  members: MemberProfile[]
  lastMessage: { content: string; createdAt: string; senderId: string } | null
  unreadCount: number
}

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data: memberRows, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)
    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const conversationIds = (memberRows ?? []).map((m) => m.conversation_id)
    if (conversationIds.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }
    const lastReadByConversation = new Map((memberRows ?? []).map((m) => [m.conversation_id, m.last_read_at]))

    const [convRes, membersRes, messagesRes] = await Promise.all([
      supabase.from('conversations').select('*').in('id', conversationIds),
      supabase
        .from('conversation_members')
        .select('conversation_id, user_id, profile:profiles(username, avatar_url)')
        .in('conversation_id', conversationIds),
      supabase
        .from('messages')
        .select('conversation_id, sender_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false }),
    ])

    const firstError = convRes.error ?? membersRes.error ?? messagesRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const membersByConversation = new Map<string, MemberProfile[]>()
    for (const row of membersRes.data ?? []) {
      const profile = row.profile as unknown as { username: string; avatar_url: string | null } | null
      if (!profile) continue
      const list = membersByConversation.get(row.conversation_id) ?? []
      list.push({ user_id: row.user_id, username: profile.username, avatar_url: profile.avatar_url })
      membersByConversation.set(row.conversation_id, list)
    }

    const lastMessageByConversation = new Map<string, { content: string; createdAt: string; senderId: string }>()
    const unreadByConversation = new Map<string, number>()
    for (const msg of messagesRes.data ?? []) {
      if (!lastMessageByConversation.has(msg.conversation_id)) {
        lastMessageByConversation.set(msg.conversation_id, {
          content: msg.content,
          createdAt: msg.created_at,
          senderId: msg.sender_id,
        })
      }
      const lastReadAt = lastReadByConversation.get(msg.conversation_id)
      if (msg.sender_id !== user.id && lastReadAt && msg.created_at > lastReadAt) {
        unreadByConversation.set(msg.conversation_id, (unreadByConversation.get(msg.conversation_id) ?? 0) + 1)
      }
    }

    const summaries: ConversationSummary[] = (convRes.data ?? []).map((c) => ({
      id: c.id,
      type: c.type as 'dm' | 'group',
      name: c.name,
      createdBy: c.created_by,
      members: membersByConversation.get(c.id) ?? [],
      lastMessage: lastMessageByConversation.get(c.id) ?? null,
      unreadCount: unreadByConversation.get(c.id) ?? 0,
    }))
    summaries.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? ''
      const bTime = b.lastMessage?.createdAt ?? ''
      return bTime.localeCompare(aTime)
    })

    setConversations(summaries)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  function otherMember(c: ConversationSummary): MemberProfile | null {
    return c.members.find((m) => m.user_id !== user?.id) ?? null
  }

  async function createDirectConversation(friendId: string): Promise<{ error: string | null; conversationId: string | null }> {
    if (!user) return { error: 'Non connecté.', conversationId: null }

    const existing = conversations.find((c) => c.type === 'dm' && c.members.some((m) => m.user_id === friendId))
    if (existing) return { error: null, conversationId: existing.id }

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'dm', created_by: user.id })
      .select('*')
      .single()
    if (convError) return { error: convError.message, conversationId: null }

    const { error: membersError } = await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: friendId },
    ])
    if (membersError) return { error: membersError.message, conversationId: null }

    await load()
    return { error: null, conversationId: conv.id }
  }

  async function createGroupConversation(
    name: string,
    memberIds: string[],
  ): Promise<{ error: string | null; conversationId: string | null }> {
    if (!user) return { error: 'Non connecté.', conversationId: null }

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'group', name: name.trim(), created_by: user.id })
      .select('*')
      .single()
    if (convError) return { error: convError.message, conversationId: null }

    const rows = [user.id, ...memberIds].map((id) => ({ conversation_id: conv.id, user_id: id }))
    const { error: membersError } = await supabase.from('conversation_members').insert(rows)
    if (membersError) return { error: membersError.message, conversationId: null }

    await load()
    return { error: null, conversationId: conv.id }
  }

  return {
    conversations,
    loading,
    error,
    otherMember,
    createDirectConversation,
    createGroupConversation,
    reload: load,
  }
}

/** Nombre total de messages non lus (pour le badge de navigation). */
export function useUnreadMessagesCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase.rpc('unread_message_count')
    if (!error) setCount(data ?? 0)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return { count, reload: load }
}
