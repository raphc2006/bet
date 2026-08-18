import { useAuth } from '../hooks/useAuth'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email

  return (
    <div className="min-h-screen bg-charcoal">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-slate-50">BetTracker</h1>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-slate-400">{username}</span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-slate-300 transition hover:border-loss hover:text-loss"
          >
            Déconnexion
          </button>
        </div>
      </header>
      <main className="px-6 py-10">
        <p className="font-mono text-sm text-slate-500">
          Le dashboard (bankroll, journal de paris, stats, graphiques) arrive à l'étape 3.
        </p>
      </main>
    </div>
  )
}
