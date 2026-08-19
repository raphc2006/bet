import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLocale } from '../hooks/useLocale'
import { AuthCard, ErrorBanner, FormField } from '../components/auth/AuthCard'

export function SignupPage() {
  const { signUp } = useAuth()
  const { t } = useLocale()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError(t('signup.usernameError'))
      return
    }

    setSubmitting(true)
    const { error } = await signUp(email, password, username)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <AuthCard title={t('signup.confirmTitle')} subtitle={t('signup.confirmSubtitle')}>
        <p className="mt-6 text-sm text-slate-300">
          {t('signup.confirmBody')}{' '}
          <Link to="/login" className="font-medium text-win hover:underline">
            {t('signup.confirmLink')}
          </Link>
          .
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('signup.title')} subtitle={t('signup.subtitle')}>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <FormField
          label={t('signup.username')}
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <FormField
          label={t('signup.email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label={t('signup.password')}
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold tracking-wide text-charcoal transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? t('signup.submitting') : t('signup.submit')}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        {t('signup.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-win hover:underline">
          {t('signup.login')}
        </Link>
      </p>
    </AuthCard>
  )
}
