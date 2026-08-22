import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useConversations } from '../../hooks/useConversations'
import { computeStats, betLabel, betProfit, isSettled } from '../../lib/stats'
import type { Bet } from '../../types/domain'
import { formatPercent, formatSignedCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'
import { renderReviewCardImage, type ReviewCardRow } from '../../lib/shareImage'

type Props = {
  username: string
  dateLabel: string
  bets: Bet[]
  currency: string
  onClose: () => void
}

export function DayShareModal({ username, dateLabel, bets, currency, onClose }: Props) {
  const { t } = useLocale()
  const { user } = useAuth()
  const conversationsState = useConversations()
  const stats = useMemo(() => computeStats(bets), [bets])
  const positive = stats.totalProfit >= 0
  const [copied, setCopied] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  function buildShareText() {
    const lines = [
      `📅 ${dateLabel}`,
      `${t('weeklyReview.netProfit')}: ${formatSignedCurrency(stats.totalProfit, currency)}`,
      `${t('weeklyReview.record')}: ${stats.wins}-${stats.losses}`,
      '',
      ...bets.map((bet) => {
        const label = betLabel(bet)
        const value = isSettled(bet) ? formatSignedCurrency(betProfit(bet), currency) : t('betlist.statusPending')
        return `${label}: ${value}`
      }),
    ]
    lines.push('', 'BetTracker')
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: t('dayshare.title'), text })
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
    const rows: ReviewCardRow[] = bets.map((bet) => ({
      label: bet.bet_type === 'single' ? t('betlist.single') : t('betlist.parlay', { n: bet.bet_legs.length }),
      text: betLabel(bet),
      amount: isSettled(bet) ? formatSignedCurrency(betProfit(bet), currency) : '—',
      positive: isSettled(bet) ? betProfit(bet) >= 0 : null,
    }))
    return {
      username,
      title: t('dayshare.title'),
      subtitle: dateLabel,
      positive,
      heroLabel: t('weeklyReview.netProfit'),
      heroValue: formatSignedCurrency(stats.totalProfit, currency),
      tiles,
      rows,
      message: positive ? t('dayshare.messagePositive') : t('dayshare.messageNegative'),
      footer: 'BetTracker',
    }
  }

  async function handleDownload() {
    setDownloading(true)
    const blob = await renderReviewCardImage(buildCardOptions())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bettracker-journee-${dateLabel}.png`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
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
              <h2 className="font-display text-2xl font-semibold text-slate-50">{t('dayshare.title')}</h2>
              <p className="mt-0.5 font-mono text-xs capitalize text-slate-500">{dateLabel}</p>
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

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {bets.map((bet) => {
              const settled = isSettled(bet)
              const profit = betProfit(bet)
              return (
                <div
                  key={bet.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-charcoal-lighter px-3 py-2"
                >
                  <p className="min-w-0 truncate text-sm text-slate-200">{betLabel(bet)}</p>
                  <p
                    className={`shrink-0 font-mono text-sm font-semibold ${
                      !settled ? 'text-pending' : profit >= 0 ? 'text-win' : 'text-loss'
                    }`}
                  >
                    {settled ? formatSignedCurrency(profit, currency) : t('betlist.statusPending')}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleShare}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-win hover:text-win"
            >
              {copied ? t('weeklyReview.copied') : t('weeklyReview.share')}
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-win hover:text-win disabled:opacity-50"
            >
              {t('weeklyReview.download')}
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
