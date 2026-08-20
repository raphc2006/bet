const EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉',
  '😍', '😅', '👏', '💯', '🤝', '😎', '🙌', '🤔',
  '🏀', '⚽', '🏈', '⚾', '🎾', '🏒', '💰', '📈',
]

export function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 z-50 mb-2 grid grid-cols-8 gap-1 rounded-xl border border-border bg-charcoal-light p-2 shadow-xl">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-charcoal-lighter"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  )
}
