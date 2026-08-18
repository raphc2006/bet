import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthCard, ErrorBanner, FormField } from '../components/auth/AuthCard'

export function SignupPage() {
  const { signUp } = useAuth()
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
      setError('Le pseudo doit contenir 3 à 20 caractères (lettres, chiffres, underscore).')
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
      <AuthCard title="Vérifie ta boîte mail" subtitle="Un email de confirmation vient de t'être envoyé.">
        <p className="mt-6 text-sm text-slate-300">
          Clique sur le lien reçu par email pour activer ton compte, puis reviens{' '}
          <Link to="/login" className="font-medium text-win hover:underline">
            te connecter
          </Link>
          .
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Créer un compte" subtitle="Commence à suivre tes paris sportifs.">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <ErrorBanner message={error} />}
        <FormField
          label="Pseudo"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
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
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-medium text-win hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  )
}
