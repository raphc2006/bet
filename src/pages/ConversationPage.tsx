import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useMessages } from '../hooks/useMessages'
import { useLocale } from '../hooks/useLocale'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { t, locale } = useLocale()
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'
  const profileState = useProfile()
  const { conversation, messages, loading, error, sendMessage } = useMessages(conversationId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const currentUserId = profileState.profile?.id ?? ''
  const other = conversation?.members.find((m) => m.user_id !== currentUserId)
  const title = conversation?.type === 'group' ? (conversation.name ?? '') : (other?.username ?? '…')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    await sendMessage(draft)
    setSending(false)
    setDraft('')
  }

  return (
    <div className="flex min-h-screen flex-col bg-charcoal">
      <Header>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-6">
        <Link to="/messages" className="mb-3 text-sm text-slate-400 hover:text-slate-100">
          {t('messages.back')}
        </Link>

        {loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : error || !conversation ? (
          <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
            {error ?? t('friends.viewError')}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              {conversation.type === 'group' ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-charcoal-lighter text-lg">
                  👥
                </div>
              ) : (
                <Avatar url={other?.avatar_url ?? null} username={other?.username ?? '?'} size={40} />
              )}
              <div>
                <p className="font-display text-lg font-semibold text-slate-50">{title}</p>
                {conversation.type === 'group' && (
                  <p className="text-xs text-slate-500">
                    {t('messages.groupMembersCount', { n: conversation.members.length })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">{t('messages.noMessages')}</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === currentUserId
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      {conversation.type === 'group' && !mine && (
                        <span className="mb-0.5 text-xs text-slate-500">{m.sender?.username ?? '?'}</span>
                      )}
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          mine ? 'bg-win/15 text-slate-100' : 'bg-charcoal-lighter text-slate-100'
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="mt-0.5 font-mono text-[10px] text-slate-600">
                        {new Date(m.created_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2 border-t border-border pt-4">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('messages.typePlaceholder')}
                maxLength={2000}
                className="flex-1 rounded-lg border border-border bg-charcoal-lighter px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-lg bg-win px-4 py-2 text-sm font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
              >
                {t('messages.send')}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
