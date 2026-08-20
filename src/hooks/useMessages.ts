import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Conversation } from '../types/domain'

const POLL_INTERVAL_MS = 4000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

type MemberProfile = { user_id: string; username: string; avatar_url: string | null }
export type ConversationDetail = Conversation & { members: MemberProfile[] }
export type MessageReaction = { user_id: string; emoji: string }
export type MessageWithSender = {
  id: string
  sender_id: string
  content: string
  image_url: string | null
  reply_to_id: string | null
  created_at: string
  sender: { username: string; avatar_url: string | null } | null
  reply_to: { id: string; content: string; image_url: string | null; sender: { username: string } | null } | null
  reactions: MessageReaction[]
}

const MESSAGE_SELECT = `
  id, sender_id, content, image_url, reply_to_id, created_at,
  sender:profiles!messages_sender_id_fkey(username, avatar_url),
  reply_to:messages!reply_to_id(id, content, image_url, sender:profiles!messages_sender_id_fkey(username)),
  reactions:message_reactions(user_id, emoji)
`

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
      .select(MESSAGE_SELECT)
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

  async function sendMessage(
    content: string,
    options: { replyToId?: string | null; imageFile?: File | null } = {},
  ): Promise<{ error: string | null }> {
    if (!user || !conversationId) return { error: 'Non connecté.' }
    const trimmed = content.trim()
    if (!trimmed && !options.imageFile) return { error: null }

    let imageUrl: string | null = null
    if (options.imageFile) {
      if (options.imageFile.size > MAX_IMAGE_BYTES) return { error: 'size' }
      if (!ACCEPTED_IMAGE_TYPES.includes(options.imageFile.type)) return { error: 'type' }
      const extension = options.imageFile.name.split('.').pop() ?? 'jpg'
      const path = `${conversationId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, options.imageFile)
      if (uploadError) return { error: uploadError.message }
      imageUrl = supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
      image_url: imageUrl,
      reply_to_id: options.replyToId ?? null,
    })
    if (error) return { error: error.message }
    await loadMessages()
    return { error: null }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!user) return
    const message = messages.find((m) => m.id === messageId)
    const alreadyReacted = message?.reactions.some((r) => r.user_id === user.id && r.emoji === emoji)
    if (alreadyReacted) {
      await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji)
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji })
    }
    await loadMessages()
  }

  return { conversation, messages, loading, error, sendMessage, toggleReaction }
}
