import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useMessages } from '../hooks/useMessages'
import type { MessageWithSender } from '../hooks/useMessages'
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
  const [sendError, setSendError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentUserId = profileState.profile?.id ?? ''
  const other = conversation?.members.find((m) => m.user_id !== currentUserId)
  const title = conversation?.type === 'group' ? (conversation.name ?? '') : (other?.username ?? '…')

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
  }

  function clearPendingImage() {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
    setPendingImage(null)
    setPendingImagePreview(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if ((!draft.trim() && !pendingImage) || sending) return
    setSending(true)
    setSendError(null)
    const { error } = await sendMessage(draft, { replyToId: replyingTo?.id ?? null, imageFile: pendingImage })
    setSending(false)
    if (error === 'size') return setSendError(t('messages.imageSizeError'))
    if (error === 'type') return setSendError(t('messages.imageTypeError'))
    if (error) return setSendError(error)
    setDraft('')
    setReplyingTo(null)
    clearPendingImage()
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

            <div className="flex-1 space-y-4 overflow-y-auto">
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

                      <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        {m.reply_to && (
                          <div className="rounded-lg border-l-2 border-slate-600 bg-charcoal-lighter/60 px-2 py-1 text-xs text-slate-400">
                            <span className="font-medium">{m.reply_to.sender?.username ?? '?'}</span>{' '}
                            {m.reply_to.image_url && !m.reply_to.content ? '📷' : m.reply_to.content}
                          </div>
                        )}

                        <div className={`rounded-xl px-3 py-2 text-sm ${mine ? 'bg-win/15 text-slate-100' : 'bg-charcoal-lighter text-slate-100'}`}>
                          {m.image_url && (
                            <a href={m.image_url} target="_blank" rel="noreferrer">
                              <img src={m.image_url} alt="" className="mb-1 max-h-64 rounded-lg object-cover" />
                            </a>
                          )}
                          {m.content && <p>{m.content}</p>}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-600">
                          <span className="font-mono">
                            {new Date(m.created_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button onClick={() => setReplyingTo(m)} className="hover:text-slate-300">
                            {t('messages.reply')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t border-border pt-4">
              {sendError && <p className="text-xs text-loss">{sendError}</p>}

              {replyingTo && (
                <div className="flex items-center justify-between rounded-lg border-l-2 border-win bg-charcoal-lighter/60 px-2 py-1 text-xs text-slate-300">
                  <span>
                    {t('messages.replyingTo')} <span className="font-medium">{replyingTo.sender?.username ?? '?'}</span>
                  </span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-slate-200">
                    ✕
                  </button>
                </div>
              )}

              {pendingImagePreview && (
                <div className="flex items-center gap-2">
                  <img src={pendingImagePreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button type="button" onClick={clearPendingImage} className="text-xs text-slate-500 hover:text-loss">
                    {t('messages.removeImage')}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImagePick}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('messages.addImage')}
                  className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-slate-300 hover:border-slate-400"
                >
                  📷
                </button>
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
                  disabled={sending || (!draft.trim() && !pendingImage)}
                  className="rounded-lg bg-win px-4 py-2 text-sm font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
                >
                  {t('messages.send')}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
