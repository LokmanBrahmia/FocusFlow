import { InputError, isDateString, type Task } from './tasks'

/**
 * Planner types. Planned time (time blocks, estimates) and actual time
 * (recorded focus sessions) are always kept apart.
 */

export interface TimeBlock {
  id: string
  taskId: string
  taskTitle: string
  subjectId: string | null
  /** Local date, YYYY-MM-DD. */
  date: string
  /** Local time, HH:MM (24h). */
  start: string
  end: string
  createdAt: string
}

export interface TimeBlockInput {
  taskId: string
  date: string
  start: string
  end: string
}

/** A recorded focus session, as shown on the planner's "actual" lane. */
export interface ActualSession {
  id: string
  taskTitle: string | null
  /** ISO UTC timestamps. */
  startedAt: string
  endedAt: string
  seconds: number
}

export interface DayPlan {
  date: string
  /** Tasks planned for the day: scheduled for it, or with a time block on it. */
  tasks: Task[]
  /** Open tasks due this day. */
  deadlines: Task[]
  blocks: TimeBlock[]
  sessions: ActualSession[]
  /** Time blocks plus estimates of planned tasks that have no block that day. */
  plannedMinutes: number
  /** Recorded focus time (completed or stopped early), breaks excluded. */
  focusSeconds: number
  completedCount: number
  /** Planned tasks, cancelled ones excluded. */
  totalCount: number
}

export const MAX_PLAN_DAYS = 42

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isTimeString(v: unknown): v is string {
  return typeof v === 'string' && TIME_RE.test(v)
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function blockMinutes(b: Pick<TimeBlock, 'start' | 'end'>): number {
  return minutesOf(b.end) - minutesOf(b.start)
}

export function parseTimeBlockInput(raw: unknown, partial: boolean): Partial<TimeBlockInput> {
  if (typeof raw !== 'object' || raw === null) throw new InputError('Invalid study block.')
  const r = raw as Record<string, unknown>
  const out: Partial<TimeBlockInput> = {}
  if (!partial || 'taskId' in r) {
    if (typeof r.taskId !== 'string' || !r.taskId || r.taskId.length > 64) throw new InputError('Choose a task.')
    out.taskId = r.taskId
  }
  if (!partial || 'date' in r) {
    if (!isDateString(r.date)) throw new InputError('Choose a valid date.')
    out.date = r.date
  }
  if (!partial || 'start' in r) {
    if (!isTimeString(r.start)) throw new InputError('Start time must be HH:MM.')
    out.start = r.start
  }
  if (!partial || 'end' in r) {
    if (!isTimeString(r.end)) throw new InputError('End time must be HH:MM.')
    out.end = r.end
  }
  if (out.start && out.end && minutesOf(out.end) <= minutesOf(out.start)) {
    throw new InputError('The block must end after it starts.')
  }
  return out
}
