import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useConversations } from '../../hooks/useConversations'
import { useLocale } from '../../hooks/useLocale'
import { betDecimalOdds, betProfit, isSettled } from '../../lib/stats'
import { formatCurrency, formatSignedCurrency } from '../../lib/format'
import { formatOdds, type OddsFormat } from '../../lib/odds'
import type { Bet, BetStatus } from '../../types/domain'
import type { TranslationKey } from '../../lib/i18n'
import { SportIcon } from '../ui/SportIcon'

const STATUS_KEY: Record<BetStatus, TranslationKey> = {
  pending: 'betlist.statusPending',
  won: 'betlist.statusWon',
  lost: 'betlist.statusLost',
  push: 'betlist.statusPush',
}

type Props = {
  bet: Bet
  currency: string
  oddsFormat: OddsFormat
  onClose: () => void
}

export function BetShareModal({ bet, currency, oddsFormat, onClose }: Props) {
  const { t } = useLocale()
  const { user } = useAuth()
  const conversationsState = useConversations()
  const [copied, setCopied] = useState(false)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)

  const settled = isSettled(bet)
  const profit = betProfit(bet)
  const positive = settled ? profit >= 0 : null
  const status = bet.status as BetStatus
  const odds = betDecimalOdds(bet)
  const league = bet.bet_legs[0]?.league ?? null

  function buildShareText() {
    const lines = [
      `🎟️ ${bet.bet_type === 'single' ? t('betlist.single') : t('betlist.parlay', { n: bet.bet_legs.length })}`,
      ...bet.bet_legs.map((leg) => `${leg.league ? `[${leg.league}] ` : ''}${leg.event_description}${leg.market ? ` · ${leg.market}` : ''}`),
      `${t('betshare.stake')}: ${formatCurrency(bet.stake, currency)}`,
      `${t('betshare.odds')}: ${formatOdds(odds, oddsFormat)}`,
      `${t('betshare.result')}: ${t(STATUS_KEY[status])}`,
    ]
    if (settled) lines.push(`${t('betshare.profit')}: ${formatSignedCurrency(profit, currency)}`)
    lines.push('', 'BetTracker')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: t('betshare.title'), text })
      } catch {
        // Partage annulé par l'utilisateur : rien à faire.
      }
      return
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSendToConversation(conversationId: string) {
    if (!user) return
    setSendingTo(conversationId)
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content: buildShareText() })
    setSendingTo(null)
    if (!error) setSentTo((prev) => new Set(prev).add(conversationId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className={`w-full max-w-md overflow-hidden rounded-xl border border-border bg-charcoal-light shadow-xl border-t-4 ${
          positive === null ? 'border-t-pending' : positive ? 'border-t-win' : 'border-t-loss'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-50">{t('betshare.title')}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100" aria-label="Fermer">
              ✕
            </button>
          </div>

          <div className="rounded-xl border border-border bg-charcoal-lighter p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
              <SportIcon league={league} size={14} />
              {bet.bet_type === 'single' ? t('betlist.single') : t('betlist.parlay', { n: bet.bet_legs.length })}
            </div>

            <div className="mt-2 space-y-1">
              {bet.bet_legs.map((leg) => (
                <p key={leg.id} className="text-sm text-slate-100">
                  {leg.event_description}
                  {leg.market && <span className="text-slate-500"> · {leg.market}</span>}
                </p>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{t('betshare.stake')}</p>
                <p className="font-mono text-sm text-slate-100">{formatCurrency(bet.stake, currency)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{t('betshare.odds')}</p>
                <p className="font-mono text-sm text-slate-100">{formatOdds(odds, oddsFormat)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{t('betshare.result')}</p>
                <p className="font-mono text-sm text-slate-100">{t(STATUS_KEY[status])}</p>
              </div>
            </div>

            {settled && (
              <p className={`mt-4 text-center font-mono text-3xl font-bold ${positive ? 'text-win' : 'text-loss'}`}>
                {formatSignedCurrency(profit, currency)}
              </p>
            )}

            <p className="mt-4 text-center font-display text-xs uppercase tracking-widest text-slate-600">BetTracker</p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-win hover:text-win"
            >
              {copied ? t('betshare.copied') : t('betshare.share')}
            </button>
            <button
              onClick={() => setPickerOpen((open) => !open)}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-win hover:text-win"
            >
              {t('betshare.sendToChat')}
            </button>
          </div>

          {pickerOpen && (
            <div className="mt-3 space-y-2">
              {conversationsState.loading ? (
                <p className="text-xs text-slate-500">{t('dashboard.loading')}</p>
              ) : conversationsState.conversations.length === 0 ? (
                <p className="text-xs text-slate-500">{t('betshare.noConversations')}</p>
              ) : (
                conversationsState.conversations.map((c) => {
                  const other = conversationsState.otherMember(c)
                  const label = c.type === 'group' ? (c.name ?? '') : (other?.username ?? '?')
                  const sent = sentTo.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSendToConversation(c.id)}
                      disabled={sendingTo === c.id || sent}
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-charcoal-lighter px-3 py-2 text-sm text-slate-200 transition hover:border-win disabled:opacity-60"
                    >
                      <span>{c.type === 'group' ? `👥 ${label}` : label}</span>
                      <span className="text-xs text-slate-500">{sent ? t('betshare.sent') : ''}</span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
