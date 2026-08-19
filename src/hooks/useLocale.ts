import { useContext } from 'react'
import { LocaleContext } from '../lib/LocaleContext'

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale doit être utilisé dans un <LocaleProvider>')
  return ctx
}
