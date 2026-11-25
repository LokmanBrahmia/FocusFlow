import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DB } from '../src/main/database/database'
import { AppStateRepository } from '../src/main/database/repositories/appStateRepository'
import { FocusSessionRepository } from '../src/main/database/repositories/focusSessionRepository'
import { TaskRepository } from '../src/main/database/repositories/taskRepository'
import { TimerService, parseSnapshot, type Scheduler } from '../src/main/timer/timerService'
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/settings'
import type { TimerEvent, TimerState } from '@shared/timer'

const MIN = 60_000

/** Deterministic clock + scheduler: timers fire only when time is advanced past them. */
class FakeTime implements Scheduler {
  now = Date.UTC(2026, 10, 25, 9, 0, 0)
  private next = 1
  private timers = new Map<number, { at: number; fn: () => void }>()

  set(fn: () => void, ms: number): number {
    const id = this.next++
    this.timers.set(id, { at: this.now + ms, fn })
    return id
  }
  clear(handle: unknown): void {
    this.timers.delete(handle as number)
  }
  /** Advances time, firing due timers in order (like a real event loop). */
  advance(ms: number): void {
    const target = this.now + ms
    for (;;) {
      const due = [...this.timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
      if (!due) break
      this.timers.delete(due[0])
      this.now = Math.max(this.now, due[1].at)
      due[1].fn()
    }
    this.now = target
  }
  /** Jumps the wall clock without firing timers (system suspend). */
  jump(ms: number): void {
    this.now += ms
  }
}

interface Harness {
  db: DB
  time: FakeTime
  timer: TimerService
  settings: AppSettings
  events: TimerEvent[]
  changes: TimerState[]
  sessions: () => Record<string, unknown>[]
  restart: () => TimerService
}

let h: Harness

function makeTimer(db: DB, time: FakeTime, settings: AppSettings, events: TimerEvent[], changes: TimerState[]): TimerService {
  const appState = new AppStateRepository(db)
  const repo = new FocusSessionRepository(db)
  const tasks = new TaskRepository(db)
  let n = 0
  return new TimerService({
    now: () => time.now,
    scheduler: time,
    newId: () => `session-${++n}-${time.now}`,
    getSettings: () => settings,
    loadSnapshot: () => appState.get('timer'),
    saveSnapshot: (s) => appState.set('timer', s),
    recordSession: (s) => repo.record(s),
    focusSecondsBetween: (a, b) => repo.focusSecondsBetween(a, b),
    getTaskTitle: (id) => tasks.getById(id)?.title ?? null,
    onChange: (s) => changes.push(s),
    onEvent: (e) => events.push(e)
  })
}

beforeEach(() => {
  const db = openDatabase(':memory:')
  const time = new FakeTime()
  const settings: AppSettings = { ...DEFAULT_SETTINGS }
  const events: TimerEvent[] = []
  const changes: TimerState[] = []
  const timer = makeTimer(db, time, settings, events, changes)
  timer.init()
  h = {
    db,
    time,
    timer,
    settings,
    events,
    changes,
    sessions: () => db.prepare('SELECT * FROM focus_sessions ORDER BY started_at').all() as Record<string, unknown>[],
    restart: () => {
      h.timer.dispose()
      h.timer = makeTimer(db, time, settings, events, changes)
      h.timer.init()
      return h.timer
    }
  }
})

afterEach(() => {
  h.timer.dispose()
  h.db.close()
})

describe('TimerService', () => {
  it('starts a focus session with the configured duration', () => {
    const s = h.timer.start()
    expect(s.status).toBe('running')
    expect(s.sessionType).toBe('focus')
    expect(s.remainingMs).toBe(25 * MIN)
    expect(s.endsAt).toBe(h.time.now + 25 * MIN)
  })

  it('calculates remaining time from timestamps', () => {
    h.timer.start()
    h.time.advance(10 * MIN + 30_000)
    expect(h.timer.getState().remainingMs).toBe(14 * MIN + 30_000)
  })

  it('freezes while paused and continues on resume', () => {
    h.timer.start()
    h.time.advance(5 * MIN)
    h.timer.pause()
    h.time.advance(30 * MIN)
    expect(h.timer.getState().remainingMs).toBe(20 * MIN)
    expect(h.sessions()).toHaveLength(0)

    h.timer.resume()
    h.time.advance(19 * MIN)
    expect(h.timer.getState().remainingMs).toBe(1 * MIN)
    expect(h.timer.getState().status).toBe('running')
  })

  it('completes on its deadline, records the session and moves to a short break', () => {
    h.timer.start()
    h.time.advance(25 * MIN)
    const s = h.timer.getState()
    expect(s.status).toBe('idle')
    expect(s.sessionType).toBe('short_break')
    expect(s.cycleCount).toBe(1)

    const rows = h.sessions()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ session_type: 'focus', status: 'completed', actual_duration_seconds: 1500 })
    expect(h.events).toContainEqual(
      expect.objectContaining({ type: 'session-finished', sessionType: 'focus', outcome: 'completed', recovered: false })
    )
  })

  it('stays accurate when the timer callback is delayed (throttled/suspended)', () => {
    h.timer.start()
    // The OS suspends the process: wall clock moves, no timers fire.
    h.time.jump(40 * MIN)
    expect(h.timer.getState().remainingMs).toBe(0)
    h.timer.wake()
    const rows = h.sessions()
    expect(rows).toHaveLength(1)
    // Recorded end time is the real deadline, not the late wake-up time.
    expect(rows[0].ended_at).toBe(new Date(Date.UTC(2026, 10, 25, 9, 25)).toISOString())
  })

  it('never records the same session twice', () => {
    h.timer.start()
    h.time.advance(25 * MIN)
    h.timer.check()
    h.timer.wake()
    expect(h.sessions()).toHaveLength(1)
    expect(h.events.filter((e) => e.type === 'session-finished')).toHaveLength(1)
  })

  it('uses a long break after the configured number of focus sessions, then resets the cycle', () => {
    h.settings.longBreakInterval = 2
    h.timer.start()
    h.time.advance(25 * MIN)
    expect(h.timer.getState().sessionType).toBe('short_break')
    h.timer.start()
    h.time.advance(5 * MIN)
    expect(h.timer.getState().sessionType).toBe('focus')
    h.timer.start()
    h.time.advance(25 * MIN)
    expect(h.timer.getState()).toMatchObject({ sessionType: 'long_break', cycleCount: 2 })
    h.timer.start()
    h.time.advance(15 * MIN)
    expect(h.timer.getState()).toMatchObject({ sessionType: 'focus', cycleCount: 0 })
  })

  it('auto-starts breaks and focus sessions when enabled', () => {
    h.settings.autoStartBreaks = true
    h.settings.autoStartFocus = true
    h.timer.start()
    h.time.advance(25 * MIN)
    expect(h.timer.getState()).toMatchObject({ status: 'running', sessionType: 'short_break' })
    h.time.advance(5 * MIN)
    expect(h.timer.getState()).toMatchObject({ status: 'running', sessionType: 'focus' })
    expect(h.sessions()).toHaveLength(2)
  })

  it('skipping a focus session records it as skipped, not completed', () => {
    h.timer.start()
    h.time.advance(7 * MIN)
    const s = h.timer.skip()
    expect(s).toMatchObject({ status: 'idle', sessionType: 'short_break', cycleCount: 0 })
    expect(h.sessions()[0]).toMatchObject({ status: 'skipped', actual_duration_seconds: 420 })
  })

  it('skipping while idle only changes the session type', () => {
    expect(h.timer.skip().sessionType).toBe('short_break')
    expect(h.timer.skip().sessionType).toBe('focus')
    expect(h.sessions()).toHaveLength(0)
  })

  it('reset keeps focused time in history and restarts the same session type', () => {
    h.timer.start()
    h.time.advance(3 * MIN)
    const s = h.timer.reset()
    expect(s).toMatchObject({ status: 'idle', sessionType: 'focus', remainingMs: 25 * MIN })
    expect(h.sessions()[0]).toMatchObject({ status: 'stopped', actual_duration_seconds: 180 })
  })

  it('end preserves the actual focus duration, excluding paused time', () => {
    h.timer.start()
    h.time.advance(4 * MIN)
    h.timer.pause()
    h.time.advance(10 * MIN)
    h.timer.end()
    expect(h.sessions()[0]).toMatchObject({ status: 'stopped', actual_duration_seconds: 240 })
  })

  it('recovers a running session after restart with the correct remaining time', () => {
    h.timer.start()
    h.time.advance(10 * MIN)
    // App quits; 5 minutes pass while it is closed.
    h.time.jump(5 * MIN)
    const t = h.restart()
    expect(t.getState()).toMatchObject({ status: 'running', remainingMs: 10 * MIN })
    h.time.advance(10 * MIN)
    expect(h.sessions()).toHaveLength(1)
  })

  it('recovers a paused session after restart', () => {
    h.timer.start()
    h.time.advance(10 * MIN)
    h.timer.pause()
    h.time.jump(60 * MIN)
    expect(h.restart().getState()).toMatchObject({ status: 'paused', remainingMs: 15 * MIN })
  })

  it('completes a session that ended while the app was closed, without auto-starting', () => {
    h.settings.autoStartBreaks = true
    h.timer.start()
    h.time.jump(3 * 60 * MIN)
    const t = h.restart()
    expect(t.getState()).toMatchObject({ status: 'idle', sessionType: 'short_break' })
    expect(h.sessions()).toHaveLength(1)
    expect(h.events.at(-1)).toMatchObject({ type: 'session-finished', recovered: true })
  })

  it('fires the daily goal event once when the goal is crossed', () => {
    h.settings.dailyGoalMinutes = 50
    for (let i = 0; i < 3; i++) {
      h.timer.start({ sessionType: 'focus' })
      h.time.advance(25 * MIN)
    }
    expect(h.events.filter((e) => e.type === 'daily-goal-reached')).toHaveLength(1)
  })

  it('links a session to a task and keeps it after the task is deleted', () => {
    const now = new Date().toISOString()
    h.db.prepare("INSERT INTO tasks (id, title, created_at, updated_at) VALUES ('t1', 'Revise TCP', ?, ?)").run(now, now)
    h.timer.start({ taskId: 't1' })
    expect(h.timer.getState().taskTitle).toBe('Revise TCP')
    h.db.prepare("DELETE FROM tasks WHERE id = 't1'").run()
    h.time.advance(25 * MIN)
    expect(h.sessions()[0]).toMatchObject({ task_id: null, task_title: 'Revise TCP', status: 'completed' })
  })

  it('rejects an unknown task', () => {
    expect(() => h.timer.start({ taskId: 'missing' })).toThrow(/no longer exists/)
  })

  it('applies new durations to an idle session only', () => {
    h.settings.focusDurationMinutes = 50
    h.timer.refreshSettings()
    expect(h.timer.getState().remainingMs).toBe(50 * MIN)
    h.timer.start()
    h.settings.focusDurationMinutes = 10
    h.timer.refreshSettings()
    expect(h.timer.getState().remainingMs).toBe(50 * MIN)
  })

  it('discards a corrupted persisted state', () => {
    expect(parseSnapshot({ status: 'running', sessionType: 'focus' })).toBeNull()
    expect(parseSnapshot('nonsense')).toBeNull()
    h.db.prepare("UPDATE app_state SET value = '{broken' WHERE key = 'timer'").run()
    expect(h.restart().getState()).toMatchObject({ status: 'idle', sessionType: 'focus' })
  })
})
