import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useLocale } from './useLocale'
import type { Profile } from '../types/domain'
import type { OddsFormat } from '../lib/odds'
import type { Locale } from '../lib/i18n'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function useProfile() {
  const { user } = useAuth()
  const { locale, setLocale } = useLocale()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setProfile(data)
    setLoading(false)
    // Le profil est la source de vérité pour la langue une fois connecté :
    // on synchronise le contexte local si besoin (ex: connexion sur un nouvel appareil).
    if (data.locale && data.locale !== locale) {
      setLocale(data.locale as Locale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  async function updateUsername(username: string) {
    if (!user) return { error: 'Non connecté.' }
    const { data, error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) return { error: error.message }
    setProfile(data)
    return { error: null }
  }

  async function updateOddsFormat(oddsFormat: OddsFormat) {
    if (!user) return { error: 'Non connecté.' }
    const { data, error } = await supabase
      .from('profiles')
      .update({ odds_format: oddsFormat })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) return { error: error.message }
    setProfile(data)
    return { error: null }
  }

  async function updateLocale(newLocale: Locale) {
    if (!user) return { error: 'Non connecté.' }
    const { data, error } = await supabase
      .from('profiles')
      .update({ locale: newLocale })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) return { error: error.message }
    setProfile(data)
    setLocale(newLocale)
    return { error: null }
  }

  async function uploadAvatar(file: File) {
    if (!user) return { error: 'Non connecté.' }
    if (file.size > MAX_AVATAR_BYTES) return { error: 'size' }
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) return { error: 'type' }

    const extension = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (uploadError) return { error: uploadError.message }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust pour que l'UI reflète immédiatement la nouvelle photo.
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) return { error: error.message }
    setProfile(data)
    return { error: null }
  }

  return { profile, loading, error, updateUsername, updateOddsFormat, updateLocale, uploadAvatar, reload: load }
}
