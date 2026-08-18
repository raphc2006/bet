import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useBankroll } from '../hooks/useBankroll'
import { useLocale } from '../hooks/useLocale'
import { CURRENCIES, type Locale } from '../lib/i18n'
import type { OddsFormat } from '../lib/odds'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'
import { FormField } from '../components/auth/AuthCard'

export function SettingsPage() {
  const { signOut } = useAuth()
  const { t } = useLocale()
  const profileState = useProfile()
  const bankrollState = useBankroll()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState('')
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal')
  const [locale, setLocaleField] = useState<Locale>('fr')
  const [currency, setCurrency] = useState('EUR')
  const [initialized, setInitialized] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  if (!initialized && profileState.profile && bankrollState.bankroll) {
    setUsername(profileState.profile.username)
    setOddsFormat(profileState.profile.odds_format as OddsFormat)
    setLocaleField(profileState.profile.locale as Locale)
    setCurrency(bankrollState.bankroll.currency)
    setInitialized(true)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setAvatarError(null)
    setAvatarUploading(true)
    const { error } = await profileState.uploadAvatar(file)
    setAvatarUploading(false)

    if (error === 'size') return setAvatarError(t('settings.avatarSizeError'))
    if (error === 'type') return setAvatarError(t('settings.avatarTypeError'))
    if (error) return setAvatarError(error)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(t('settings.usernameError'))
      return
    }

    setSaving(true)

    if (profileState.profile && username !== profileState.profile.username) {
      const { error } = await profileState.updateUsername(username)
      if (error) {
        setSaving(false)
        return setError(error)
      }
    }

    if (profileState.profile && oddsFormat !== profileState.profile.odds_format) {
      const { error } = await profileState.updateOddsFormat(oddsFormat)
      if (error) {
        setSaving(false)
        return setError(error)
      }
    }

    if (profileState.profile && locale !== profileState.profile.locale) {
      const { error } = await profileState.updateLocale(locale)
      if (error) {
        setSaving(false)
        return setError(error)
      }
    }

    if (bankrollState.bankroll && currency !== bankrollState.bankroll.currency) {
      const { error } = await bankrollState.updateCurrency(currency)
      if (error) {
        setSaving(false)
        return setError(error)
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const loading = (profileState.loading && !profileState.profile) || (bankrollState.loading && !bankrollState.bankroll)

  return (
    <div className="min-h-screen bg-charcoal">
      <Header>
        <Link to="/" className="text-sm text-slate-400 transition hover:text-slate-100">
          ← {t('nav.back')}
        </Link>
      </Header>

      <main className="mx-auto max-w-lg space-y-6 px-6 py-8">
        <h1 className="font-display text-2xl font-semibold text-slate-50">{t('settings.title')}</h1>

        {loading ? (
          <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
        ) : (
          <>
            {(profileState.error || bankrollState.error) && (
              <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
                {profileState.error || bankrollState.error}
              </p>
            )}

            <section className="rounded-xl border border-border bg-charcoal-light p-5">
              <h2 className="mb-4 text-xs uppercase tracking-wide text-slate-400">{t('settings.profile')}</h2>
              <div className="flex items-center gap-4">
                <Avatar url={profileState.profile?.avatar_url ?? null} username={username || '?'} size={64} />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-300 transition hover:border-win hover:text-win disabled:opacity-50"
                  >
                    {avatarUploading ? t('settings.saving') : t('settings.avatarChange')}
                  </button>
                  <p className="mt-1 text-xs text-slate-500">{t('settings.avatarHint')}</p>
                  {avatarError && <p className="mt-1 text-xs text-loss">{avatarError}</p>}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-4 rounded-xl border border-border bg-charcoal-light p-5">
                <FormField
                  label={t('settings.username')}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('settings.oddsFormat')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOddsFormat('decimal')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        oddsFormat === 'decimal' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
                      }`}
                    >
                      {t('settings.oddsDecimal')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOddsFormat('american')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        oddsFormat === 'american' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
                      }`}
                    >
                      {t('settings.oddsAmerican')}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('settings.language')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLocaleField('fr')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        locale === 'fr' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
                      }`}
                    >
                      {t('settings.languageFr')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocaleField('en')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        locale === 'en' ? 'border-win bg-win/10 text-win' : 'border-border text-slate-400'
                      }`}
                    >
                      {t('settings.languageEn')}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t('settings.currency')}
                  </span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                {error && <p className="text-sm text-loss">{error}</p>}
                {saved && !error && <p className="text-sm text-win">{t('settings.saved')}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? t('settings.saving') : t('settings.save')}
                </button>
              </section>
            </form>

            <button
              onClick={() => signOut()}
              className="w-full rounded-lg border border-loss/40 px-4 py-2 text-sm font-medium text-loss transition hover:bg-loss/10"
            >
              {t('settings.logout')}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
