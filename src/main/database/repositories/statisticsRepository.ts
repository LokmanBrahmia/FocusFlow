import { addDays, differenceInCalendarDays, format, getISODay, parse, startOfDay } from 'date-fns'
import type { DB } from '../database'
import {
  TIME_OF_DAY_LABELS,
  timeOfDay,
  type DateRange,
  type DayStat,
  type RatingGroup,
  type Statistics,
  type SubjectStat,
  type TimeOfDay
} from '@shared/statistics'

interface SessionRow {
  secs: number
  status: string
  rating: number | null
  day: string
  hour: number
  subject_id: string | null
}

const parseDay = (s: string): Date => parse(s, 'yyyy-MM-dd', new Date())
const dayKey = (d: Date): string => format(d, 'yyyy-MM-dd')
const round1 = (n: number): number => Math.round(n * 10) / 10

/**
 * Every figure is derived from focus_sessions and tasks on each request;
 * nothing derived is stored. Days are local calendar days: SQLite's
 * 'localtime' uses the same timezone as the app.
 */
export class StatisticsRepository {
  constructor(
    private readonly db: DB,
    private readonly now: () => Date = () => new Date()
  ) {}

  get(range: DateRange, settings: { goalMinutes: number; streakMinimumMinutes: number }): Statistics {
    const fromDate = parseDay(range.from)
    const toDate = parseDay(range.to)
    const fromIso = startOfDay(fromDate).toISOString()
    const toIso = addDays(startOfDay(toDate), 1).toISOString()
    const today = startOfDay(this.now())
    const goalSeconds = settings.goalMinutes * 60

    const sessions = this.db
      .prepare(
        `SELECT f.actual_duration_seconds AS secs, f.status, f.focus_rating AS rating,
                date(f.started_at, 'localtime') AS day,
                CAST(strftime('%H', f.started_at, 'localtime') AS INTEGER) AS hour,
                COALESCE(t.subject_id, f.subject_id) AS subject_id
           FROM focus_sessions f LEFT JOIN tasks t ON t.id = f.task_id
          WHERE f.session_type = 'focus' AND f.started_at >= ? AND f.started_at < ?`
      )
      .all(fromIso, toIso) as SessionRow[]

    const completedTasks = this.db
      .prepare(
        `SELECT date(completed_at, 'localtime') AS day, subject_id
           FROM tasks WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?`
      )
      .all(fromIso, toIso) as { day: string; subject_id: string | null }[]

    const subjectRows = this.db.prepare('SELECT id, name, color FROM subjects').all() as {
      id: string
      name: string
      color: string | null
    }[]
    const subjectInfo = new Map(subjectRows.map((s) => [s.id, s]))

    // ── per day ─────────────────────────────────────────────────────────────
    const totalDays = differenceInCalendarDays(toDate, fromDate) + 1
    const days: DayStat[] = Array.from({ length: totalDays }, (_, i) => ({
      date: dayKey(addDays(fromDate, i)),
      focusSeconds: 0,
      sessions: 0,
      tasksCompleted: 0,
      goalMet: false
    }))
    const byDate = new Map(days.map((d) => [d.date, d]))
    const hours = new Array<number>(24).fill(0)

    for (const s of sessions) {
      const d = byDate.get(s.day)
      if (!d) continue
      d.focusSeconds += s.secs
      if (s.status === 'completed') d.sessions += 1
      hours[s.hour] += s.secs
    }
    for (const t of completedTasks) {
      const d = byDate.get(t.day)
      if (d) d.tasksCompleted += 1
    }
    for (const d of days) d.goalMet = d.focusSeconds >= goalSeconds && goalSeconds > 0

    // Averages only consider days that have happened.
    const elapsed = days.filter((d) => parseDay(d.date) <= today)
    const elapsedDays = elapsed.length
    const focusSeconds = days.reduce((s, d) => s + d.focusSeconds, 0)
    const recorded = sessions.filter((s) => s.secs > 0)
    const goalDaysMet = elapsed.filter((d) => d.goalMet).length

    // ── weekdays (Monday first) ─────────────────────────────────────────────
    const weekdayTotals = new Array<number>(7).fill(0)
    const weekdayCounts = new Array<number>(7).fill(0)
    for (const d of elapsed) {
      const i = getISODay(parseDay(d.date)) - 1
      weekdayTotals[i] += d.focusSeconds
      weekdayCounts[i] += 1
    }
    const weekdays = weekdayTotals.map((t, i) => (weekdayCounts[i] ? Math.round(t / weekdayCounts[i]) : 0))
    const bestValue = Math.max(...weekdays)
    const bestWeekday = bestValue > 0 ? weekdays.indexOf(bestValue) : null

    // ── subjects ────────────────────────────────────────────────────────────
    const subjectFocus = new Map<string | null, number>()
    for (const s of sessions) {
      const key = s.subject_id && subjectInfo.has(s.subject_id) ? s.subject_id : null
      subjectFocus.set(key, (subjectFocus.get(key) ?? 0) + s.secs)
    }
    const subjectTasks = new Map<string | null, number>()
    for (const t of completedTasks) {
      const key = t.subject_id && subjectInfo.has(t.subject_id) ? t.subject_id : null
      subjectTasks.set(key, (subjectTasks.get(key) ?? 0) + 1)
    }
    const subjectKeys = new Set([...subjectFocus.keys(), ...subjectTasks.keys()])
    const subjects: SubjectStat[] = [...subjectKeys]
      .map((id) => {
        const info = id ? subjectInfo.get(id) : undefined
        const secs = subjectFocus.get(id) ?? 0
        return {
          subjectId: id,
          name: info?.name ?? 'No subject',
          color: info?.color ?? null,
          focusSeconds: secs,
          share: focusSeconds > 0 ? secs / focusSeconds : 0,
          tasksCompleted: subjectTasks.get(id) ?? 0
        }
      })
      .sort((a, b) => b.focusSeconds - a.focusSeconds || b.tasksCompleted - a.tasksCompleted)

    // ── focus quality ───────────────────────────────────────────────────────
    const rated = sessions.filter((s): s is SessionRow & { rating: number } => s.rating !== null)
    const avg = (xs: number[]): number => round1(xs.reduce((a, b) => a + b, 0) / xs.length)
    const group = <K extends string>(keyOf: (s: SessionRow) => K) => {
      const m = new Map<K, number[]>()
      for (const s of rated) {
        const k = keyOf(s)
        m.set(k, [...(m.get(k) ?? []), s.rating])
      }
      return m
    }

    const overTime = [...group((s) => s.day).entries()]
      .map(([date, rs]) => ({ date, average: avg(rs), count: rs.length }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const bySubject: RatingGroup[] = [...group((s) => (s.subject_id && subjectInfo.has(s.subject_id) ? s.subject_id : 'none')).entries()]
      .map(([key, rs]) => ({
        key,
        label: key === 'none' ? 'No subject' : (subjectInfo.get(key)?.name ?? 'No subject'),
        average: avg(rs),
        count: rs.length
      }))
      .sort((a, b) => b.count - a.count)

    const todGroups = group((s) => timeOfDay(s.hour))
    const byTimeOfDay: RatingGroup[] = (Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[])
      .filter((k) => todGroups.has(k))
      .map((k) => {
        const rs = todGroups.get(k)!
        return { key: k, label: TIME_OF_DAY_LABELS[k], average: avg(rs), count: rs.length }
      })

    return {
      range,
      elapsedDays,
      goalMinutes: settings.goalMinutes,
      totals: {
        focusSeconds,
        sessions: days.reduce((s, d) => s + d.sessions, 0),
        tasksCompleted: completedTasks.length,
        recordedSessions: recorded.length,
        averageDailyFocusSeconds: elapsedDays ? Math.round(elapsed.reduce((s, d) => s + d.focusSeconds, 0) / elapsedDays) : 0,
        averageSessionSeconds: recorded.length ? Math.round(recorded.reduce((s, r) => s + r.secs, 0) / recorded.length) : 0,
        goalDaysMet,
        goalRate: elapsedDays ? goalDaysMet / elapsedDays : 0
      },
      days,
      weekdays,
      bestWeekday,
      hours,
      subjects,
      streak: { ...this.streaks(settings.streakMinimumMinutes), minimumMinutes: settings.streakMinimumMinutes },
      quality: {
        average: rated.length ? avg(rated.map((s) => s.rating)) : null,
        ratedSessions: rated.length,
        overTime,
        bySubject,
        byTimeOfDay
      }
    }
  }

  /**
   * A day counts toward a streak when its focus time reaches the minimum.
   * The current streak stays alive through today until today is over, so
   * it counts back from yesterday when today has not qualified yet.
   */
  streaks(minimumMinutes: number): { current: number; longest: number } {
    const rows = this.db
      .prepare(
        `SELECT date(started_at, 'localtime') AS day, SUM(actual_duration_seconds) AS secs
           FROM focus_sessions WHERE session_type = 'focus'
          GROUP BY day HAVING secs >= ? ORDER BY day`
      )
      .all(minimumMinutes * 60) as { day: string }[]
    const qualifying = new Set(rows.map((r) => r.day))

    let longest = 0
    let run = 0
    let prev: Date | null = null
    for (const { day } of rows) {
      const d = parseDay(day)
      run = prev && differenceInCalendarDays(d, prev) === 1 ? run + 1 : 1
      longest = Math.max(longest, run)
      prev = d
    }

    let cursor = startOfDay(this.now())
    if (!qualifying.has(dayKey(cursor))) cursor = addDays(cursor, -1)
    let current = 0
    while (qualifying.has(dayKey(cursor))) {
      current += 1
      cursor = addDays(cursor, -1)
    }
    return { current, longest }
  }
}
