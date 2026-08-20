import { useEffect, useMemo, useState } from 'react'
import { betsInRange, bestAndWorstBet, computeStats, previousIsoWeekRange } from '../lib/stats'
import type { Bet, Profile } from '../types/domain'

export function useWeeklyReview(
  bets: Bet[],
  profile: Profile | null,
  markSeen: (weekKey: string) => Promise<{ error: string | null }>,
  options: { autoShow?: boolean } = {},
) {
  const autoShow = options.autoShow ?? true
  const [isOpen, setIsOpen] = useState(false)
  const [autoTriggered, setAutoTriggered] = useState(false)

  const { start, end, key } = useMemo(() => previousIsoWeekRange(), [])
  const weekBets = useMemo(() => betsInRange(bets, start, end), [bets, start, end])
  const weekStats = useMemo(() => computeStats(weekBets), [weekBets])
  const { best, worst } = useMemo(() => bestAndWorstBet(weekBets), [weekBets])
  const hasData = weekStats.settledBets > 0

  useEffect(() => {
    if (!autoShow || autoTriggered || !profile || !hasData) return
    if (profile.last_week_review_shown === key) return
    setIsOpen(true)
    setAutoTriggered(true)
  }, [autoShow, autoTriggered, profile, hasData, key])

  async function close() {
    setIsOpen(false)
    if (profile && profile.last_week_review_shown !== key) {
      await markSeen(key)
    }
  }

  function open() {
    setIsOpen(true)
  }

  return { isOpen, open, close, weekStart: start, weekEnd: end, weekKey: key, weekStats, hasData, bestBet: best, worstBet: worst }
}
