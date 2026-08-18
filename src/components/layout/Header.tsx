import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../hooks/useLocale'

export function Header({ children }: { children?: ReactNode }) {
  const { t } = useLocale()
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-slate-50">
        {t('dashboard.title')}
      </Link>
      <div className="flex items-center gap-4">{children}</div>
    </header>
  )
}
