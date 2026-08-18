import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthCard, ErrorBanner, FormField } from '../components/auth/AuthCard'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <AuthCard title="Connexion" subtitle="Accède à ton suivi de paris.">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-win px-4 py-2 font-display text-lg font-semibold tracking-wide text-charcoal transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Pas encore de compte ?{' '}
        <Link to="/signup" className="font-medium text-win hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthCard>
  )
}
