import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatSignedCurrency } from '../../lib/format'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function PnlCalendar({ dailyNet, currency }: { dailyNet: Map<string, number>; currency: string }) {
  const [month, setMonth] = useState(() => new Date())

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
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="px-2 text-slate-400 hover:text-slate-100">
          ‹
        </button>
        <p className="font-display text-lg capitalize text-slate-100">{format(month, 'MMMM yyyy', { locale: fr })}</p>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="px-2 text-slate-400 hover:text-slate-100">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
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
            <div
              key={key}
              title={net !== undefined ? formatSignedCurrency(net, currency) : undefined}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-[11px] ${
                inMonth ? 'text-slate-300' : 'text-slate-700'
              }`}
              style={{ backgroundColor: bg }}
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}
