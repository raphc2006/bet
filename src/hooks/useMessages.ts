import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Conversation } from '../types/domain'

const POLL_INTERVAL_MS = 4000

type MemberProfile = { user_id: string; username: string; avatar_url: string | null }
export type ConversationDetail = Conversation & { members: MemberProfile[] }
export type MessageWithSender = {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender: { username: string; avatar_url: string | null } | null
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConversation = useCallback(async () => {
    if (!conversationId) return
    const [convRes, membersRes] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', conversationId).single(),
      supabase.from('conversation_members').select('user_id, profile:profiles(username, avatar_url)').eq('conversation_id', conversationId),
    ])
    if (convRes.error || membersRes.error) {
      setError(convRes.error?.message ?? membersRes.error?.message ?? 'Erreur.')
      return
    }
    const members: MemberProfile[] = (membersRes.data ?? []).flatMap((row) => {
      const profile = row.profile as unknown as { username: string; avatar_url: string | null } | null
      return profile ? [{ user_id: row.user_id, username: profile.username, avatar_url: profile.avatar_url }] : []
    })
    setConversation({ ...(convRes.data as Conversation), members })
  }, [conversationId])

  const loadMessages = useCallback(async () => {
    if (!conversationId || !user) return
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, sender:profiles(username, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
      return
    }
    setMessages((data ?? []) as unknown as MessageWithSender[])
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
  }, [conversationId, user])

  useEffect(() => {
    if (!conversationId || !user) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([loadConversation(), loadMessages()]).then(() => {
      if (!cancelled) setLoading(false)
    })
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [conversationId, user, loadConversation, loadMessages])

  async function sendMessage(content: string): Promise<{ error: string | null }> {
    if (!user || !conversationId) return { error: 'Non connecté.' }
    const trimmed = content.trim()
    if (!trimmed) return { error: null }
    const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content: trimmed })
    if (error) return { error: error.message }
    await loadMessages()
    return { error: null }
  }

  return { conversation, messages, loading, error, sendMessage }
}
