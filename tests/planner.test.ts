import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DB } from '../src/main/database/database'
import { TaskRepository } from '../src/main/database/repositories/taskRepository'
import { PlannerRepository } from '../src/main/database/repositories/plannerRepository'
import { FocusSessionRepository } from '../src/main/database/repositories/focusSessionRepository'
import { InputError } from '@shared/tasks'
import { parseTimeBlockInput } from '@shared/planner'

let db: DB
let tasks: TaskRepository
let planner: PlannerRepository
let sessions: FocusSessionRepository

beforeEach(() => {
  db = openDatabase(':memory:')
  tasks = new TaskRepository(db)
  planner = new PlannerRepository(db, tasks)
  sessions = new FocusSessionRepository(db)
})
afterEach(() => db.close())

/** A local wall-clock time on a given day (tests are timezone-independent this way). */
const local = (day: string, hh: number, mm = 0): Date => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

function record(taskId: string | null, start: Date, seconds: number, type: 'focus' | 'short_break' = 'focus'): void {
  sessions.record({
    id: `s-${start.getTime()}-${type}`,
    taskId,
    taskTitle: 'x',
    sessionType: type,
    startedAt: start,
    endedAt: new Date(start.getTime() + seconds * 1000),
    plannedDurationSeconds: 1500,
    actualDurationSeconds: seconds,
    status: 'completed'
  })
}

describe('time blocks', () => {
  it('creates, updates and deletes a block', () => {
    const t = tasks.create({ title: 'Read' })
    const b = planner.createBlock({ taskId: t.id, date: '2026-11-30', start: '09:00', end: '10:30' })
    expect(b).toMatchObject({ taskTitle: 'Read', start: '09:00', end: '10:30' })
    expect(planner.updateBlock(b.id, { end: '11:00' }).end).toBe('11:00')
    planner.deleteBlock(b.id)
    expect(planner.getBlock(b.id)).toBeNull()
  })

  it('rejects overlapping blocks on the same day but allows touching ones', () => {
    const t = tasks.create({ title: 'A' })
    planner.createBlock({ taskId: t.id, date: '2026-11-30', start: '09:00', end: '10:00' })
    expect(() => planner.createBlock({ taskId: t.id, date: '2026-11-30', start: '09:30', end: '11:00' })).toThrow(/overlaps/)
    expect(() => planner.createBlock({ taskId: t.id, date: '2026-11-30', start: '10:00', end: '11:00' })).not.toThrow()
    expect(() => planner.createBlock({ taskId: t.id, date: '2026-12-01', start: '09:30', end: '11:00' })).not.toThrow()
  })

  it('a block does not clash with itself when edited', () => {
    const t = tasks.create({ title: 'A' })
    const b = planner.createBlock({ taskId: t.id, date: '2026-11-30', start: '09:00', end: '10:00' })
    expect(planner.updateBlock(b.id, { start: '09:15' }).start).toBe('09:15')
  })

  it('removes blocks when their task is deleted', () => {
    const t = tasks.create({ title: 'A' })
    const b = planner.createBlock({ taskId: t.id, date: '2026-11-30', start: '09:00', end: '10:00' })
    tasks.delete(t.id)
    expect(planner.getBlock(b.id)).toBeNull()
  })

  it('validates input', () => {
    expect(() => parseTimeBlockInput({ taskId: 'x', date: '2026-11-30', start: '10:00', end: '09:00' }, false)).toThrow(/end after/)
    expect(() => parseTimeBlockInput({ taskId: 'x', date: '2026-11-30', start: '9:00', end: '10:00' }, false)).toThrow(/HH:MM/)
    expect(() => parseTimeBlockInput({ taskId: 'x', date: '2026-13-01', start: '09:00', end: '10:00' }, false)).toThrow(InputError)
    expect(() => planner.createBlock({ taskId: 'missing', date: '2026-11-30', start: '09:00', end: '10:00' })).toThrow(/no longer exists/)
  })
})

describe('getRange', () => {
  it('returns one plan per day in order', () => {
    const days = planner.getRange('2026-11-30', 7)
    expect(days.map((d) => d.date)).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06'
    ])
  })

  it('separates planned time from actual focus time', () => {
    const day = '2026-11-30'
    const withBlock = tasks.create({ title: 'Blocked', scheduledDate: day, estimatedMinutes: 120 })
    tasks.create({ title: 'Estimated', scheduledDate: day, estimatedMinutes: 45 })
    tasks.create({ title: 'Cancelled', scheduledDate: day, estimatedMinutes: 500, status: 'cancelled' })
    planner.createBlock({ taskId: withBlock.id, date: day, start: '09:00', end: '10:30' })

    record(withBlock.id, local(day, 9, 5), 1500)
    record(withBlock.id, local(day, 9, 35), 300, 'short_break')

    const [plan] = planner.getRange(day, 1)
    // 90 min block replaces the blocked task's estimate; 45 min estimate for the other.
    expect(plan.plannedMinutes).toBe(135)
    expect(plan.focusSeconds).toBe(1500)
    expect(plan.sessions).toHaveLength(1)
    expect(plan.totalCount).toBe(2)
  })

  it('includes tasks that only have a block that day, and counts completion', () => {
    const day = '2026-11-30'
    const other = tasks.create({ title: 'Scheduled elsewhere', scheduledDate: '2026-12-05' })
    const done = tasks.create({ title: 'Done', scheduledDate: day })
    tasks.update(done.id, { status: 'completed' })
    planner.createBlock({ taskId: other.id, date: day, start: '14:00', end: '15:00' })

    const [plan] = planner.getRange(day, 1)
    expect(plan.tasks.map((t) => t.title).sort()).toEqual(['Done', 'Scheduled elsewhere'])
    expect(plan.completedCount).toBe(1)
    expect(plan.totalCount).toBe(2)
  })

  it('shows a task on a day where it has a block, even if it is scheduled for another day in the range', () => {
    const t = tasks.create({ title: 'Problem set', scheduledDate: '2026-12-01', estimatedMinutes: 90 })
    planner.createBlock({ taskId: t.id, date: '2026-12-03', start: '10:00', end: '11:00' })
    const plans = planner.getRange('2026-11-30', 7)
    expect(plans[1].tasks.map((x) => x.title)).toEqual(['Problem set'])
    expect(plans[3].tasks.map((x) => x.title)).toEqual(['Problem set'])
    expect(plans[3].plannedMinutes).toBe(60)
    // Its own day has no block, so the estimate counts there.
    expect(plans[1].plannedMinutes).toBe(90)
  })

  it('lists open tasks due on each day', () => {
    tasks.create({ title: 'Due', deadline: '2026-12-01' })
    const closed = tasks.create({ title: 'Closed', deadline: '2026-12-01' })
    tasks.update(closed.id, { status: 'completed' })
    const plans = planner.getRange('2026-11-30', 3)
    expect(plans[1].deadlines.map((t) => t.title)).toEqual(['Due'])
    expect(plans[0].deadlines).toHaveLength(0)
  })

  it('buckets sessions by the local day they started, including late evenings', () => {
    record(null, local('2026-11-30', 23, 50), 1200)
    record(null, local('2026-12-01', 0, 10), 600)
    const plans = planner.getRange('2026-11-30', 2)
    expect(plans[0].focusSeconds).toBe(1200)
    expect(plans[1].focusSeconds).toBe(600)
  })
})
