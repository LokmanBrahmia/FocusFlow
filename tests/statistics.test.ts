import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { openDatabase, type DB } from '../src/main/database/database'
import { MIGRATIONS, runMigrations } from '../src/main/database/migrations'
import { TaskRepository } from '../src/main/database/repositories/taskRepository'
import { SubjectRepository } from '../src/main/database/repositories/subjectRepository'
import { FocusSessionRepository } from '../src/main/database/repositories/focusSessionRepository'
import { StatisticsRepository } from '../src/main/database/repositories/statisticsRepository'
import { parseDateRange, parseRating, timeOfDay } from '@shared/statistics'
import { InputError } from '@shared/tasks'

let db: DB
let tasks: TaskRepository
let subjects: SubjectRepository
let sessions: FocusSessionRepository
let stats: StatisticsRepository
/** "Now" is Friday 4 December 2026, 18:00 local time. */
const NOW = new Date(2026, 11, 4, 18, 0)
const SETTINGS = { goalMinutes: 60, streakMinimumMinutes: 25 }
let n = 0

beforeEach(() => {
  db = openDatabase(':memory:')
  tasks = new TaskRepository(db, () => NOW)
  subjects = new SubjectRepository(db)
  sessions = new FocusSessionRepository(db)
  stats = new StatisticsRepository(db, () => NOW)
})
afterEach(() => db.close())

/** Records a focus session at a local date/time. */
function focus(
  day: string,
  hour: number,
  minutes: number,
  opts: { taskId?: string; status?: 'completed' | 'stopped' | 'skipped'; type?: 'focus' | 'short_break' } = {}
): string {
  const [y, m, d] = day.split('-').map(Number)
  const start = new Date(y, m - 1, d, hour, 0)
  const id = `s${++n}`
  sessions.record({
    id,
    taskId: opts.taskId ?? null,
    taskTitle: null,
    sessionType: opts.type ?? 'focus',
    startedAt: start,
    endedAt: new Date(start.getTime() + minutes * 60_000),
    plannedDurationSeconds: 1500,
    actualDurationSeconds: minutes * 60,
    status: opts.status ?? 'completed'
  })
  return id
}

describe('StatisticsRepository', () => {
  it('reports an empty range without errors', () => {
    const s = stats.get({ from: '2026-11-28', to: '2026-12-04' }, SETTINGS)
    expect(s.totals).toMatchObject({ focusSeconds: 0, sessions: 0, tasksCompleted: 0, goalRate: 0 })
    expect(s.days).toHaveLength(7)
    expect(s.bestWeekday).toBeNull()
    expect(s.quality.average).toBeNull()
  })

  it('counts focus time from all focus sessions but only completed ones as Pomodoros', () => {
    focus('2026-12-04', 9, 25)
    focus('2026-12-04', 10, 10, { status: 'stopped' })
    focus('2026-12-04', 11, 5, { status: 'skipped' })
    focus('2026-12-04', 12, 5, { type: 'short_break' })
    const s = stats.get({ from: '2026-12-04', to: '2026-12-04' }, SETTINGS)
    expect(s.totals.focusSeconds).toBe(40 * 60)
    expect(s.totals.sessions).toBe(1)
    expect(s.totals.recordedSessions).toBe(3)
    expect(s.totals.averageSessionSeconds).toBe(Math.round((40 * 60) / 3))
    expect(s.hours[9]).toBe(25 * 60)
  })

  it('computes goal rate and daily averages over days that have happened only', () => {
    focus('2026-12-03', 9, 60)
    focus('2026-12-04', 9, 30)
    // Range runs into next week: future days are not "missed".
    const s = stats.get({ from: '2026-12-03', to: '2026-12-09' }, SETTINGS)
    expect(s.elapsedDays).toBe(2)
    expect(s.totals.goalDaysMet).toBe(1)
    expect(s.totals.goalRate).toBe(0.5)
    expect(s.totals.averageDailyFocusSeconds).toBe(45 * 60)
  })

  it('finds the most productive weekday', () => {
    focus('2026-11-30', 9, 25) // Monday
    focus('2026-12-02', 9, 90) // Wednesday
    const s = stats.get({ from: '2026-11-30', to: '2026-12-04' }, SETTINGS)
    expect(s.bestWeekday).toBe(2)
    expect(s.weekdays[2]).toBe(90 * 60)
  })

  it('counts completed tasks per day and per subject', () => {
    const ml = subjects.create({ name: 'ML' })
    const t = tasks.create({ title: 'Backprop', subjectId: ml.id })
    tasks.update(t.id, { status: 'completed' })
    tasks.create({ title: 'Open' })
    const s = stats.get({ from: '2026-12-04', to: '2026-12-04' }, SETTINGS)
    expect(s.totals.tasksCompleted).toBe(1)
    expect(s.days[0].tasksCompleted).toBe(1)
    expect(s.subjects.find((x) => x.subjectId === ml.id)?.tasksCompleted).toBe(1)
  })

  it('attributes focus to subjects with shares, and keeps it after the task is deleted', () => {
    const ml = subjects.create({ name: 'ML', color: '#2a78d6' })
    const t = tasks.create({ title: 'Backprop', subjectId: ml.id })
    focus('2026-12-04', 9, 30, { taskId: t.id })
    focus('2026-12-04', 10, 10)
    tasks.delete(t.id)

    const s = stats.get({ from: '2026-12-04', to: '2026-12-04' }, SETTINGS)
    expect(s.subjects).toEqual([
      expect.objectContaining({ subjectId: ml.id, name: 'ML', focusSeconds: 1800, share: 0.75 }),
      expect.objectContaining({ subjectId: null, name: 'No subject', focusSeconds: 600, share: 0.25 })
    ])
  })

  it('follows a task to its new subject', () => {
    const a = subjects.create({ name: 'A' })
    const b = subjects.create({ name: 'B' })
    const t = tasks.create({ title: 'x', subjectId: a.id })
    focus('2026-12-04', 9, 30, { taskId: t.id })
    tasks.update(t.id, { subjectId: b.id })
    const s = stats.get({ from: '2026-12-04', to: '2026-12-04' }, SETTINGS)
    expect(s.subjects.map((x) => x.name)).toEqual(['B'])
  })

  describe('streaks', () => {
    it('counts consecutive qualifying days and keeps today open', () => {
      focus('2026-12-01', 9, 25)
      focus('2026-12-02', 9, 30)
      focus('2026-12-03', 9, 25)
      // Today (4 Dec) has no focus yet: the streak is still 3.
      expect(stats.streaks(25)).toEqual({ current: 3, longest: 3 })
      focus('2026-12-04', 9, 25)
      expect(stats.streaks(25)).toEqual({ current: 4, longest: 4 })
    })

    it('breaks on a missed day and ignores days under the minimum', () => {
      focus('2026-11-20', 9, 25)
      focus('2026-11-21', 9, 25)
      focus('2026-11-22', 9, 25)
      focus('2026-11-23', 9, 25)
      focus('2026-12-02', 9, 10) // below 25 minutes
      focus('2026-12-03', 9, 25)
      expect(stats.streaks(25)).toEqual({ current: 1, longest: 4 })
    })

    it('a day can qualify through several short sessions', () => {
      focus('2026-12-04', 9, 15)
      focus('2026-12-04', 14, 15)
      expect(stats.streaks(25).current).toBe(1)
    })
  })

  describe('focus quality', () => {
    it('averages ratings overall, by subject and by time of day', () => {
      const ml = subjects.create({ name: 'ML' })
      const t = tasks.create({ title: 'x', subjectId: ml.id })
      sessions.rate(focus('2026-12-04', 8, 25, { taskId: t.id }), 5, 'Deep work')
      sessions.rate(focus('2026-12-04', 15, 25, { taskId: t.id }), 3, null)
      sessions.rate(focus('2026-12-04', 23, 25), 2, null)
      focus('2026-12-04', 10, 25) // unrated

      const q = stats.get({ from: '2026-12-04', to: '2026-12-04' }, SETTINGS).quality
      expect(q.average).toBe(3.3)
      expect(q.ratedSessions).toBe(3)
      expect(q.bySubject).toEqual([
        expect.objectContaining({ label: 'ML', average: 4, count: 2 }),
        expect.objectContaining({ label: 'No subject', average: 2, count: 1 })
      ])
      expect(q.byTimeOfDay.map((g) => [g.key, g.average])).toEqual([
        ['morning', 5],
        ['afternoon', 3],
        ['night', 2]
      ])
    })

    it('only focus sessions can be rated', () => {
      expect(sessions.rate(focus('2026-12-04', 9, 5, { type: 'short_break' }), 4, null)).toBe(false)
      expect(sessions.rate('missing', 4, null)).toBe(false)
    })
  })
})

describe('validation', () => {
  it('validates ranges and ratings', () => {
    expect(() => parseDateRange({ from: '2026-12-05', to: '2026-12-01' })).toThrow(/on or before/)
    expect(() => parseDateRange({ from: '2000-01-01', to: '2026-12-01' })).toThrow(/ten years/)
    expect(() => parseRating(6, null)).toThrow(InputError)
    expect(() => parseRating(2.5, null)).toThrow(InputError)
    expect(parseRating(4, '  good  ')).toEqual({ rating: 4, note: 'good' })
    expect(parseRating(null, '')).toEqual({ rating: null, note: null })
  })

  it('buckets hours into times of day', () => {
    expect([4, 5, 11, 12, 16, 17, 21, 22].map(timeOfDay)).toEqual([
      'night',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
      'night'
    ])
  })
})

describe('migration 003', () => {
  it('backfills session subjects and remaps old subject colours', () => {
    const raw = new Database(':memory:')
    raw.pragma('foreign_keys = ON')
    runMigrations(raw, MIGRATIONS.slice(0, 2))
    const now = new Date().toISOString()
    raw.prepare("INSERT INTO subjects (id, name, color, created_at) VALUES ('s1', 'Old', '#5CC8F0', ?)").run(now)
    raw.prepare("INSERT INTO subjects (id, name, color, created_at) VALUES ('s2', 'Custom', '#123456', ?)").run(now)
    raw.prepare("INSERT INTO tasks (id, title, subject_id, created_at, updated_at) VALUES ('t1', 'x', 's1', ?, ?)").run(now, now)
    raw
      .prepare(
        `INSERT INTO focus_sessions (id, task_id, session_type, started_at, ended_at, planned_duration_seconds, actual_duration_seconds, status)
         VALUES ('f1', 't1', 'focus', ?, ?, 1500, 1500, 'completed')`
      )
      .run(now, now)

    runMigrations(raw)
    expect(raw.prepare("SELECT subject_id FROM focus_sessions WHERE id = 'f1'").get()).toEqual({ subject_id: 's1' })
    expect(raw.prepare('SELECT color FROM subjects ORDER BY id').all()).toEqual([{ color: '#2a78d6' }, { color: '#123456' }])
    raw.close()
  })
})
