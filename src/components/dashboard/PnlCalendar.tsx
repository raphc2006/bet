import { useMemo } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { formatSignedCompactNumber, formatSignedCurrency } from '../../lib/format'
import { useLocale } from '../../hooks/useLocale'

type Props = {
  dailyNet: Map<string, number>
  currency: string
  month: Date
  onMonthChange: (month: Date) => void
  onDayClick?: (day: Date) => void
}

export function PnlCalendar({ dailyNet, currency, month, onMonthChange, onDayClick }: Props) {
  const { locale, t } = useLocale()
  const dateFnsLocale = locale === 'fr' ? fr : enUS
  const weekdays = [
    t('calendar.weekday.mon'),
    t('calendar.weekday.tue'),
    t('calendar.weekday.wed'),
    t('calendar.weekday.thu'),
    t('calendar.weekday.fri'),
    t('calendar.weekday.sat'),
    t('calendar.weekday.sun'),
  ]

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const maxAbs = useMemo(() => {
    let max = 0
    for (const [day, net] of dailyNet) {
      if (day.startsWith(format(month, 'yyyy-MM'))) max = Math.max(max, Math.abs(net))
    }
    return max || 1
  }, [dailyNet, month])

  return (
    <div className="rounded-xl border border-border bg-charcoal-light p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => onMonthChange(subMonths(month, 1))} className="px-2 text-slate-400 hover:text-slate-100">
          ‹
        </button>
        <p className="font-display text-lg capitalize text-slate-100">
          {format(month, 'MMMM yyyy', { locale: dateFnsLocale })}
        </p>
        <button onClick={() => onMonthChange(addMonths(month, 1))} className="px-2 text-slate-400 hover:text-slate-100">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((d, i) => (
          <span key={i} className="text-[10px] uppercase text-slate-500">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const net = dailyNet.get(key)
          const inMonth = isSameMonth(day, month)
          const opacity = net ? Math.min(1, Math.abs(net) / maxAbs) * 0.7 + 0.15 : 0
          const bg = net === undefined ? 'transparent' : net > 0 ? `rgba(62,207,110,${opacity})` : net < 0 ? `rgba(224,85,79,${opacity})` : 'transparent'

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick?.(day)}
              title={net !== undefined ? formatSignedCurrency(net, currency) : undefined}
              className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-md text-xs transition ${
                inMonth ? 'text-slate-300' : 'text-slate-700'
              } ${onDayClick ? 'cursor-pointer hover:ring-1 hover:ring-slate-500' : ''}`}
              style={{ backgroundColor: bg }}
            >
              <span>{format(day, 'd')}</span>
              {net !== undefined && net !== 0 && (
                <span
                  className={`whitespace-nowrap font-mono text-[11px] font-semibold leading-none ${
                    net > 0 ? 'text-win' : 'text-loss'
                  } ${inMonth ? '' : 'opacity-50'}`}
                >
                  {formatSignedCompactNumber(net)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
