import { useState } from 'react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useConversations } from '../../hooks/useConversations'
import type { Stats } from '../../lib/stats'
import { betLabel, betProfit } from '../../lib/stats'
import type { Bet } from '../../types/domain'
import { formatPercent, formatSignedCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'
import { renderReviewCardImage } from '../../lib/shareImage'

type Props = {
  username: string
  weekStart: Date
  weekEnd: Date
  stats: Stats
  currency: string
  bestBet: Bet | null
  worstBet: Bet | null
  onClose: () => void
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'win' | 'loss' | 'neutral' }) {
  const toneClass = tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : 'text-slate-100'
  return (
    <div className="rounded-lg border border-border bg-charcoal-lighter p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 font-mono text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function BetRow({ label, bet, currency, tone }: { label: string; bet: Bet; currency: string; tone: 'win' | 'loss' }) {
  const profit = betProfit(bet)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-charcoal-lighter px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm text-slate-200">{betLabel(bet)}</p>
      </div>
      <p className={`shrink-0 font-mono text-sm font-semibold ${tone === 'win' ? 'text-win' : 'text-loss'}`}>
        {formatSignedCurrency(profit, currency)}
      </p>
    </div>
  )
}

export function WeeklyReviewModal({ username, weekStart, weekEnd, stats, currency, bestBet, worstBet, onClose }: Props) {
  const { t, locale } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const { user } = useAuth()
  const conversationsState = useConversations()
  const positive = stats.totalProfit >= 0
  const weekLabel = `${format(weekStart, 'd MMM', { locale: dateFnsLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateFnsLocale })}`
  const [copied, setCopied] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())

  function buildShareText() {
    const lines = [
      `📊 ${t('weeklyReview.title')} — ${weekLabel}`,
      `${t('weeklyReview.netProfit')}: ${formatSignedCurrency(stats.totalProfit, currency)}`,
      `${t('stats.winRate')}: ${stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`}`,
      `${t('stats.roi')}: ${stats.roi === null ? '—' : formatPercent(stats.roi)}`,
      `${t('weeklyReview.record')}: ${stats.wins}-${stats.losses}`,
    ]
    if (stats.avgClv !== null) lines.push(`${t('stats.avgClv')}: ${formatPercent(stats.avgClv)}`)
    if (bestBet) lines.push(`${t('weeklyReview.bestBet')}: ${betLabel(bestBet)} (${formatSignedCurrency(betProfit(bestBet), currency)})`)
    if (worstBet && worstBet.id !== bestBet?.id) {
      lines.push(`${t('weeklyReview.worstBet')}: ${betLabel(worstBet)} (${formatSignedCurrency(betProfit(worstBet), currency)})`)
    }
    lines.push('', 'BetTracker')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: t('weeklyReview.title'), text })
      } catch {
        // Partage annulé par l'utilisateur : rien à faire.
      }
      return
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildCardOptions() {
    const tiles = [
      { label: t('stats.winRate'), value: stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%` },
      { label: t('stats.roi'), value: stats.roi === null ? '—' : formatPercent(stats.roi) },
      { label: t('weeklyReview.record'), value: `${stats.wins}-${stats.losses}` },
      { label: t('stats.avgClv'), value: stats.avgClv === null ? '—' : formatPercent(stats.avgClv) },
    ]
    const rows = []
    if (bestBet) {
      rows.push({
        label: t('weeklyReview.bestBet'),
        text: betLabel(bestBet),
        amount: formatSignedCurrency(betProfit(bestBet), currency),
        positive: true,
      })
    }
    if (worstBet && worstBet.id !== bestBet?.id) {
      rows.push({
        label: t('weeklyReview.worstBet'),
        text: betLabel(worstBet),
        amount: formatSignedCurrency(betProfit(worstBet), currency),
        positive: false,
      })
    }
    return {
      username,
      title: t('weeklyReview.title'),
      subtitle: weekLabel,
      positive,
      heroLabel: t('weeklyReview.netProfit'),
      heroValue: formatSignedCurrency(stats.totalProfit, currency),
      tiles,
      rows,
      message: positive ? t('weeklyReview.messagePositive') : t('weeklyReview.messageNegative'),
      footer: 'BetTracker',
    }
  }

  async function handleSendToConversation(conversationId: string) {
    if (!user) return
    setSendingTo(conversationId)
    const blob = await renderReviewCardImage(buildCardOptions())
    const path = `${conversationId}/${crypto.randomUUID()}.png`
    const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, blob, {
      contentType: 'image/png',
    })
    if (uploadError) {
      setSendingTo(null)
      return
    }
    const imageUrl = supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content: '', image_url: imageUrl })
    setSendingTo(null)
    if (!error) setSentTo((prev) => new Set(prev).add(conversationId))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className={`w-full max-w-md overflow-hidden rounded-xl border border-border bg-charcoal-light shadow-xl border-t-4 ${
          positive ? 'border-t-win' : 'border-t-loss'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-slate-50">{t('weeklyReview.title')}</h2>
              <p className="mt-0.5 font-mono text-xs text-slate-500">{weekLabel}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100" aria-label="Fermer">
              ✕
            </button>
          </div>

          <div className={`rounded-xl border p-5 text-center ${positive ? 'border-win/30 bg-win/10' : 'border-loss/30 bg-loss/10'}`}>
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('weeklyReview.netProfit')}</p>
            <p className={`mt-1 font-mono text-4xl font-bold ${positive ? 'text-win' : 'text-loss'}`}>
              {formatSignedCurrency(stats.totalProfit, currency)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={t('stats.winRate')} value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`} />
            <Tile label={t('stats.roi')} value={stats.roi === null ? '—' : formatPercent(stats.roi)} />
            <Tile label={t('weeklyReview.record')} value={`${stats.wins}-${stats.losses}`} />
            <Tile label={t('stats.avgClv')} value={stats.avgClv === null ? '—' : formatPercent(stats.avgClv)} />
          </div>

          {(bestBet || worstBet) && (
            <div className="mt-4 space-y-2">
              {bestBet && <BetRow label={t('weeklyReview.bestBet')} bet={bestBet} currency={currency} tone="win" />}
              {worstBet && worstBet.id !== bestBet?.id && (
                <BetRow label={t('weeklyReview.worstBet')} bet={worstBet} currency={currency} tone="loss" />
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-slate-300">
            {positive ? t('weeklyReview.messagePositive') : t('weeklyReview.messageNegative')}
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-win hover:text-win"
            >
              {copied ? t('weeklyReview.copied') : t('weeklyReview.share')}
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

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110"
          >
            {t('weeklyReview.gotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}
