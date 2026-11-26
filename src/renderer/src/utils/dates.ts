import { format, parse } from 'date-fns'

/** Today's local calendar date as YYYY-MM-DD. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function parseDay(day: string): Date {
  return parse(day, 'yyyy-MM-dd', new Date())
}

export function isPast(day: string): boolean {
  return day < todayISO()
}
