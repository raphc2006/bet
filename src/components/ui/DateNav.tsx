import type { ReactNode } from 'react'

export function DateNav({ label, onPrev, onNext, children }: { label: string; onPrev: () => void; onNext: () => void; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={onPrev}
        className="rounded-lg border border-border px-3 py-1.5 text-slate-400 transition hover:border-slate-400 hover:text-slate-100"
        aria-label="Précédent"
      >
        ‹
      </button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="font-display text-lg capitalize text-slate-100">{label}</span>
        {children}
      </div>
      <button
        onClick={onNext}
        className="rounded-lg border border-border px-3 py-1.5 text-slate-400 transition hover:border-slate-400 hover:text-slate-100"
        aria-label="Suivant"
      >
        ›
      </button>
    </div>
  )
}
