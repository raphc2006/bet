export function Avatar({ url, username, size = 36 }: { url: string | null; username: string; size?: number }) {
  const initial = username ? username[0]!.toUpperCase() : '?'

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className="rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border border-border bg-win/15 font-display font-semibold text-win"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  )
}
