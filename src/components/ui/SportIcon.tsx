import type { ReactElement } from 'react'

type Props = {
  league: string | null | undefined
  size?: number
  className?: string
}

const ICONS: Record<string, (props: { size: number }) => ReactElement> = {
  MLB: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4 5.5c2 1.5 2 8 0 9M16 5.5c-2 1.5-2 8 0 9"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
  NBA: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 1.5v17M1.5 10h17M3.4 4.4c3.6 3.6 3.6 7.6 0 11.2M16.6 4.4c-3.6 3.6-3.6 7.6 0 11.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
WNBA: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 1.5v17M1.5 10h17M3.4 4.4c3.6 3.6 3.6 7.6 0 11.2M16.6 4.4c-3.6 3.6-3.6 7.6 0 11.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
NCAAB: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 1.5v17M1.5 10h17M3.4 4.4c3.6 3.6 3.6 7.6 0 11.2M16.6 4.4c-3.6 3.6-3.6 7.6 0 11.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
  NFL: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 10c0-3.5 3.5-7 8-7s8 3.5 8 7-3.5 7-8 7-8-3.5-8-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 10h8M8.5 8.3v3.4M10 8v4M11.5 8.3v3.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
NCAAF: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 10c0-3.5 3.5-7 8-7s8 3.5 8 7-3.5 7-8 7-8-3.5-8-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 10h8M8.5 8.3v3.4M10 8v4M11.5 8.3v3.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  NHL: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5.5" y="8" width="9" height="4" rx="1" fill="currentColor" />
    </svg>
  ),
  Soccer: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6.3 12.6 8.2 11.6 11.3H8.4L7.4 8.2Z" fill="currentColor" />
    </svg>
  ),
  Tennis: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 6.5c4 1.5 4 9.5 0 7M17.5 6.5c-4 1.5-4 9.5 0 7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  ),
}

export function SportIcon({ league, size = 16, className }: Props) {
  const Icon = league ? ICONS[league] : undefined
  if (!Icon) return null
  return (
    <span className={className} aria-hidden="true">
      <Icon size={size} />
    </span>
  )
}
