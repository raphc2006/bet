import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Bankroll, BankrollAdjustment } from '../types/domain'

export function useBankroll() {
  const { user } = useAuth()
  const [bankroll, setBankroll] = useState<Bankroll | null>(null)
  const [adjustments, setAdjustments] = useState<BankrollAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data: existing, error: fetchError } = await supabase
      .from('bankrolls')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    let bankrollRow = existing
    if (!bankrollRow) {
      const { data: created, error: createError } = await supabase
        .from('bankrolls')
        .insert({ user_id: user.id })
        .select('*')
        .single()
      if (createError) {
        setError(createError.message)
        setLoading(false)
        return
      }
      bankrollRow = created
    }

    const { data: adjustmentsData, error: adjustmentsError } = await supabase
      .from('bankroll_adjustments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (adjustmentsError) {
      setError(adjustmentsError.message)
      setLoading(false)
      return
    }

    setBankroll(bankrollRow)
    setAdjustments(adjustmentsData ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function updateConfig(startingAmount: number, unitPercentage: number) {
    if (!user) return { error: 'Non connecté.' }
    const { data, error } = await supabase
      .from('bankrolls')
      .update({ starting_amount: startingAmount, unit_percentage: unitPercentage })
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error) return { error: error.message }
    setBankroll(data)
    return { error: null }
  }

  async function updateCurrency(currency: string) {
    if (!user) return { error: 'Non connecté.' }
    const { data, error } = await supabase
      .from('bankrolls')
      .update({ currency })
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error) return { error: error.message }
    setBankroll(data)
    return { error: null }
  }

  async function addAdjustment(amount: number, note: string) {
    if (!user) return { error: 'Non connecté.' }
    const { data, error } = await supabase
      .from('bankroll_adjustments')
      .insert({ user_id: user.id, amount, note: note || null })
      .select('*')
      .single()
    if (error) return { error: error.message }
    setAdjustments((prev) => [data, ...prev])
    return { error: null }
  }

  async function deleteAdjustment(id: string) {
    const { error } = await supabase.from('bankroll_adjustments').delete().eq('id', id)
    if (error) return { error: error.message }
    setAdjustments((prev) => prev.filter((a) => a.id !== id))
    return { error: null }
  }

  return {
    bankroll,
    adjustments,
    loading,
    error,
    updateConfig,
    updateCurrency,
    addAdjustment,
    deleteAdjustment,
    reload: load,
  }
}
