import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useFriends } from '../hooks/useFriends'
import { useConversations } from '../hooks/useConversations'
import type { ConversationSummary } from '../hooks/useConversations'
import { useLocale } from '../hooks/useLocale'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { Modal } from '../components/ui/Modal'

function GroupAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full border border-border bg-charcoal-lighter text-slate-400"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      👥
    </div>
  )
}

function ConversationRow({ conversation, currentUserId }: { conversation: ConversationSummary; currentUserId: string }) {
  const { t } = useLocale()
  const other = conversation.members.find((m) => m.user_id !== currentUserId)
  const title = conversation.type === 'group' ? (conversation.name ?? '') : (other?.username ?? '?')
  const preview = conversation.lastMessage
    ? `${conversation.lastMessage.senderId === currentUserId ? `${t('messages.you')}: ` : ''}${conversation.lastMessage.content}`
    : t('messages.noMessages')

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-charcoal-light p-3 transition hover:border-slate-500"
    >
      {conversation.type === 'group' ? (
        <GroupAvatar />
      ) : (
        <Avatar url={other?.avatar_url ?? null} username={other?.username ?? '?'} size={40} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium text-slate-100">{title}</p>
          {conversation.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-loss px-1.5 font-mono text-[11px] font-semibold text-white">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>
        <p className="truncate text-sm text-slate-500">{preview}</p>
      </div>
    </Link>
  )
}

export function MessagesPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const profileState = useProfile()
  const friends = useFriends()
  const conversationsState = useConversations()
  const [modalOpen, setModalOpen] = useState(false)

  const currentUserId = profileState.profile?.id ?? ''
  const totalUnread = conversationsState.conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="min-h-screen bg-charcoal">
      <Header unreadMessagesCount={totalUnread}>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-slate-50">{t('messages.pageTitle')}</h1>
          <button
            onClick={() => setModalOpen(true)}
            disabled={friends.accepted.length === 0}
            className="rounded-lg bg-win px-3 py-1.5 text-sm font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-40"
          >
            {t('messages.newMessage')}
          </button>
        </div>

        {friends.accepted.length === 0 && !friends.loading && (
          <p className="text-sm text-slate-500">{t('messages.noFriendsHint')}</p>
        )}

        {conversationsState.loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : conversationsState.conversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-500">
            {t('messages.noConversations')}
          </div>
        ) : (
          <div className="space-y-2">
            {conversationsState.conversations.map((c) => (
              <ConversationRow key={c.id} conversation={c} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <NewConversationModal
          friends={friends.accepted.map((f) => ({ id: friends.otherUserId(f), ...friends.otherProfile(f) }))}
          onClose={() => setModalOpen(false)}
          onCreateDirect={conversationsState.createDirectConversation}
          onCreateGroup={conversationsState.createGroupConversation}
          onNavigate={(id) => navigate(`/messages/${id}`)}
        />
      )}
    </div>
  )
}

function NewConversationModal({
  friends,
  onClose,
  onCreateDirect,
  onCreateGroup,
  onNavigate,
}: {
  friends: { id: string; username: string; avatar_url: string | null }[]
  onClose: () => void
  onCreateDirect: (friendId: string) => Promise<{ error: string | null; conversationId: string | null }>
  onCreateGroup: (name: string, memberIds: string[]) => Promise<{ error: string | null; conversationId: string | null }>
  onNavigate: (conversationId: string) => void
}) {
  const { t } = useLocale()
  const [mode, setMode] = useState<'dm' | 'group'>('dm')
  const [groupName, setGroupName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSelectFriend(friendId: string) {
    setError(null)
    setSubmitting(true)
    const { error, conversationId } = await onCreateDirect(friendId)
    setSubmitting(false)
    if (error) return setError(error)
    if (conversationId) onNavigate(conversationId)
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!groupName.trim()) return setError(t('messages.groupNameError'))
    if (selectedIds.size === 0) return setError(t('messages.selectMembersError'))

    setSubmitting(true)
    const { error, conversationId } = await onCreateGroup(groupName, Array.from(selectedIds))
    setSubmitting(false)
    if (error) return setError(error)
    if (conversationId) onNavigate(conversationId)
  }

  return (
    <Modal title={t('messages.newMessage')} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('dm')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              mode === 'dm' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            {t('messages.newDm')}
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              mode === 'group' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
            }`}
          >
            {t('messages.newGroup')}
          </button>
        </div>

        {error && <p className="text-sm text-loss">{error}</p>}

        {mode === 'dm' ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('messages.selectFriend')}</p>
            {friends.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={submitting}
                onClick={() => handleSelectFriend(f.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-charcoal-lighter p-3 text-left transition hover:border-win disabled:opacity-50"
              >
                <Avatar url={f.avatar_url} username={f.username} size={32} />
                <span className="font-medium text-slate-100">{f.username}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('messages.groupName')}
              </span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('messages.groupNamePlaceholder')}
                className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('messages.selectMembers')}</p>
              {friends.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-charcoal-lighter p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(f.id)}
                    onChange={() => toggleMember(f.id)}
                    className="h-4 w-4 accent-win"
                  />
                  <Avatar url={f.avatar_url} username={f.username} size={32} />
                  <span className="font-medium text-slate-100">{f.username}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
            >
              {t('messages.createGroup')}
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}
