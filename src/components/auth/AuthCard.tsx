import type { ReactNode } from 'react'

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-charcoal-light p-8 shadow-xl">
        <h1 className="font-display text-3xl font-semibold tracking-wide text-slate-50">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

export function FormField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-border bg-charcoal-lighter px-3 py-2 font-mono text-sm text-slate-100 outline-none transition focus:border-win focus:ring-1 focus:ring-win"
      />
    </label>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">{message}</div>
  )
}
