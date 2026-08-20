import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useFriends } from '../hooks/useFriends'
import type { SearchResult } from '../hooks/useFriends'
import { useLocale } from '../hooks/useLocale'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/layout/Avatar'

export function FriendsPage() {
  const { t } = useLocale()
  const profileState = useProfile()
  const friends = useFriends()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())

  const pendingUserIds = new Set(friends.friendships.map((f) => friends.otherUserId(f)))

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    setSearching(true)
    setSearchError(null)
    const { data, error } = await friends.searchUsers(query)
    if (error) setSearchError(error)
    setResults(data)
    setSearching(false)
  }

  async function handleSendRequest(userId: string) {
    const { error } = await friends.sendRequest(userId)
    if (!error) setSentTo((prev) => new Set(prev).add(userId))
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Header friendRequestCount={friends.received.length}>
        <Link to="/settings" aria-label={t('nav.settings')}>
          <Avatar url={profileState.profile?.avatar_url ?? null} username={profileState.profile?.username ?? '?'} />
        </Link>
      </Header>

      <main className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        <h1 className="font-display text-2xl font-semibold text-slate-50">{t('friends.pageTitle')}</h1>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-slate-100">{t('friends.search')}</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('friends.searchPlaceholder')}
              className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="shrink-0 rounded-lg bg-win px-4 py-2 text-sm font-semibold text-charcoal transition hover:brightness-110 disabled:opacity-50"
            >
              {t('friends.searchButton')}
            </button>
          </form>
          {searchError && <p className="text-sm text-loss">{searchError}</p>}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => {
                const alreadyLinked = pendingUserIds.has(result.id)
                const justSent = sentTo.has(result.id)
                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-charcoal-light p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar url={result.avatar_url} username={result.username} size={32} />
                      <span className="font-medium text-slate-100">{result.username}</span>
                    </div>
                    <button
                      onClick={() => handleSendRequest(result.id)}
                      disabled={alreadyLinked || justSent}
                      className="rounded-lg border border-win/40 px-3 py-1.5 text-xs font-medium text-win transition hover:bg-win/10 disabled:opacity-40"
                    >
                      {alreadyLinked || justSent ? t('friends.requestSent') : t('friends.addFriend')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {friends.received.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-100">{t('friends.received')}</h2>
            <div className="space-y-2">
              {friends.received.map((f) => {
                const other = friends.otherProfile(f)
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-charcoal-light p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar url={other.avatar_url} username={other.username} size={32} />
                      <span className="font-medium text-slate-100">{other.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => friends.respond(f.id, 'accepted')}
                        className="rounded-lg border border-win/40 px-3 py-1.5 text-xs font-medium text-win transition hover:bg-win/10"
                      >
                        {t('friends.accept')}
                      </button>
                      <button
                        onClick={() => friends.respond(f.id, 'declined')}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-loss hover:text-loss"
                      >
                        {t('friends.decline')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {friends.sent.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-100">{t('friends.sent')}</h2>
            <div className="space-y-2">
              {friends.sent.map((f) => {
                const other = friends.otherProfile(f)
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-charcoal-light p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar url={other.avatar_url} username={other.username} size={32} />
                      <span className="font-medium text-slate-100">{other.username}</span>
                      <span className="text-xs text-slate-500">{t('friends.pending')}</span>
                    </div>
                    <button
                      onClick={() => friends.remove(f.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-loss hover:text-loss"
                    >
                      {t('friends.cancel')}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-slate-100">{t('friends.myFriends')}</h2>
          {friends.loading ? (
            <p className="font-mono text-sm text-slate-500">{t('dashboard.loading')}</p>
          ) : friends.accepted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-slate-500">
              {t('friends.noFriends')}
            </div>
          ) : (
            <div className="space-y-2">
              {friends.accepted.map((f) => {
                const other = friends.otherProfile(f)
                const otherId = friends.otherUserId(f)
                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-charcoal-light p-3"
                  >
                    <Link to={`/friends/${otherId}`} className="flex items-center gap-3">
                      <Avatar url={other.avatar_url} username={other.username} size={32} />
                      <span className="font-medium text-slate-100">{other.username}</span>
                    </Link>
                    <button
                      onClick={() => friends.remove(f.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-loss hover:text-loss"
                    >
                      {t('friends.remove')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
