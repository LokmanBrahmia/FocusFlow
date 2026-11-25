import { differenceInCalendarDays, format, parse } from 'date-fns'

/** Today's local calendar date as YYYY-MM-DD. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function parseDay(day: string): Date {
  return parse(day, 'yyyy-MM-dd', new Date())
}

/** "Today", "Tomorrow", "Yesterday", or "28 Nov" (with year when not this year). */
export function formatDay(day: string): string {
  const d = parseDay(day)
  const diff = differenceInCalendarDays(d, new Date())
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'd MMM' : 'd MMM yyyy')
}

export function isPast(day: string): boolean {
  return day < todayISO()
}
