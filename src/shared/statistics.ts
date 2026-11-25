import { InputError, isDateString } from './tasks'

/** Inclusive range of local calendar dates. */
export interface DateRange {
  from: string
  to: string
}

export const MAX_RANGE_DAYS = 3660

export interface DayStat {
  date: string
  focusSeconds: number
  /** Completed focus sessions (Pomodoros). */
  sessions: number
  tasksCompleted: number
  goalMet: boolean
}

export interface SubjectStat {
  /** null = sessions without a subject. */
  subjectId: string | null
  name: string
  color: string | null
  focusSeconds: number
  /** Fraction of total focus time in the range, 0–1. */
  share: number
  tasksCompleted: number
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning (5–12)',
  afternoon: 'Afternoon (12–17)',
  evening: 'Evening (17–22)',
  night: 'Night (22–5)'
}

export interface RatingGroup {
  key: string
  label: string
  average: number
  count: number
}

export interface Statistics {
  range: DateRange
  /** Days from `from` up to today (or `to` if earlier); used for averages. */
  elapsedDays: number
  goalMinutes: number
  totals: {
    focusSeconds: number
    sessions: number
    tasksCompleted: number
    /** Every recorded focus session, completed or stopped early. */
    recordedSessions: number
    averageDailyFocusSeconds: number
    averageSessionSeconds: number
    goalDaysMet: number
    /** goalDaysMet / elapsedDays, 0–1. */
    goalRate: number
  }
  days: DayStat[]
  /** Average focus seconds per weekday over the elapsed range, Monday first. */
  weekdays: number[]
  /** 0 = Monday … 6 = Sunday, or null with no focus time. */
  bestWeekday: number | null
  /** Focus seconds by the hour sessions started, 0–23. */
  hours: number[]
  subjects: SubjectStat[]
  streak: { current: number; longest: number; minimumMinutes: number }
  quality: {
    average: number | null
    ratedSessions: number
    overTime: { date: string; average: number; count: number }[]
    bySubject: RatingGroup[]
    byTimeOfDay: RatingGroup[]
  }
}

export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

export function parseDateRange(raw: unknown): DateRange {
  if (typeof raw !== 'object' || raw === null) throw new InputError('Invalid date range.')
  const { from, to } = raw as Record<string, unknown>
  if (!isDateString(from) || !isDateString(to)) throw new InputError('Choose valid dates.')
  if (from > to) throw new InputError('The start date must be on or before the end date.')
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1
  if (days > MAX_RANGE_DAYS) throw new InputError('Choose a range of ten years or less.')
  return { from, to }
}

export const MAX_NOTE = 1000

export function parseRating(rating: unknown, note: unknown): { rating: number | null; note: string | null } {
  if (rating !== null && (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new InputError('Rating must be a whole number from 1 to 5.')
  }
  if (note !== null && note !== undefined && typeof note !== 'string') throw new InputError('Invalid note.')
  const n = typeof note === 'string' ? note.trim() : ''
  if (n.length > MAX_NOTE) throw new InputError(`Keep the note under ${MAX_NOTE} characters.`)
  return { rating: rating as number | null, note: n || null }
}
