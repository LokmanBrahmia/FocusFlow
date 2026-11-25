import { startOfDay, addDays } from 'date-fns'
import type { AppSettings } from '@shared/settings'
import {
  deadline,
  elapsedMs,
  isSessionType,
  remainingMs,
  type SessionOutcome,
  type SessionType,
  type StartTimerInput,
  type TimerEvent,
  type TimerSnapshot,
  type TimerState
} from '@shared/timer'
import type { NewFocusSession } from '../database/repositories/focusSessionRepository'

export interface Scheduler {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

export interface TimerDeps {
  now: () => number
  scheduler: Scheduler
  newId: () => string
  getSettings: () => AppSettings
  loadSnapshot: () => unknown
  saveSnapshot: (s: TimerSnapshot) => void
  recordSession: (s: NewFocusSession) => boolean
  focusSecondsBetween: (from: Date, to: Date) => number
  getTaskTitle: (id: string) => string | null
  onChange: (state: TimerState) => void
  onEvent: (event: TimerEvent) => void
}

/** Sessions shorter than this are not written to history when stopped early. */
export const MIN_RECORDED_SECONDS = 1

/**
 * Node timers cap at ~24.8 days; we also re-check periodically so a timer
 * delayed by system sleep is caught soon after wake, even without an event.
 */
const MAX_TIMEOUT_MS = 60_000

/**
 * The single authoritative Pomodoro timer. Lives in the main process; every
 * window renders the state it broadcasts. Pure of Electron so it can be tested
 * with a fake clock.
 */
export class TimerService {
  private snap: TimerSnapshot
  private handle: unknown = null

  constructor(private readonly deps: TimerDeps) {
    this.snap = this.idleSnapshot('focus', 0)
  }

  /** Restores the persisted timer. A session that ended while the app was closed is completed now. */
  init(): TimerState {
    const restored = parseSnapshot(this.deps.loadSnapshot())
    if (restored) {
      this.snap = restored
      if (this.snap.status === 'idle') {
        this.snap.plannedDurationSeconds = this.durationFor(this.snap.sessionType)
      }
    }
    this.check(true)
    this.commit()
    return this.getState()
  }

  getState(): TimerState {
    const now = this.deps.now()
    return {
      ...this.snap,
      remainingMs: remainingMs(this.snap, now),
      endsAt: deadline(this.snap),
      longBreakInterval: this.deps.getSettings().longBreakInterval
    }
  }

  start(input: StartTimerInput = {}): TimerState {
    if (input.sessionType && this.snap.status === 'idle') {
      this.snap = this.idleSnapshot(input.sessionType, this.snap.cycleCount, this.snap.taskId, this.snap.taskTitle)
    }
    if (input.taskId !== undefined) this.assignTask(input.taskId)

    if (this.snap.status === 'paused') return this.resume()
    if (this.snap.status === 'running') return this.commit()

    this.snap.status = 'running'
    this.snap.sessionId = this.deps.newId()
    this.snap.plannedDurationSeconds = this.durationFor(this.snap.sessionType)
    this.snap.startedAt = this.deps.now()
    this.snap.pausedAt = null
    this.snap.pausedTotalMs = 0
    return this.commit()
  }

  pause(): TimerState {
    if (this.snap.status !== 'running') return this.getState()
    this.snap.status = 'paused'
    this.snap.pausedAt = this.deps.now()
    return this.commit()
  }

  resume(): TimerState {
    if (this.snap.status !== 'paused' || this.snap.pausedAt === null) return this.getState()
    this.snap.pausedTotalMs += Math.max(0, this.deps.now() - this.snap.pausedAt)
    this.snap.pausedAt = null
    this.snap.status = 'running'
    return this.commit()
  }

  toggle(): TimerState {
    return this.snap.status === 'running' ? this.pause() : this.start()
  }

  /** Abandons the current session and moves to the next one in the cycle. */
  skip(): TimerState {
    const wasActive = this.snap.status !== 'idle'
    if (wasActive) this.finishEarly('skipped')

    const type = this.snap.sessionType
    if (type === 'focus') {
      const next: SessionType = this.snap.cycleCount + 1 >= this.interval() ? 'long_break' : 'short_break'
      this.toIdle(next, this.snap.cycleCount)
    } else {
      this.toIdle('focus', type === 'long_break' ? 0 : this.snap.cycleCount)
    }
    return this.commit()
  }

  /** Restarts the current session from its full duration. Time already focused is kept in history. */
  reset(): TimerState {
    if (this.snap.status !== 'idle') this.finishEarly('stopped')
    this.toIdle(this.snap.sessionType, this.snap.cycleCount)
    return this.commit()
  }

  /** Stops the session early, keeping the focused time, and returns to a fresh focus session. */
  end(): TimerState {
    if (this.snap.status !== 'idle') this.finishEarly('stopped')
    this.toIdle('focus', this.snap.cycleCount)
    return this.commit()
  }

  setSessionType(type: SessionType): TimerState {
    if (this.snap.status !== 'idle') return this.getState()
    this.toIdle(type, this.snap.cycleCount)
    return this.commit()
  }

  setTask(taskId: string | null): TimerState {
    this.assignTask(taskId)
    return this.commit()
  }

  /** Called when settings change: idle sessions pick up new durations. */
  refreshSettings(): void {
    if (this.snap.status === 'idle') {
      this.snap.plannedDurationSeconds = this.durationFor(this.snap.sessionType)
    }
    this.commit()
  }

  /** Completes the running session if its deadline has passed. Safe to call any time. */
  check(recovered = false): void {
    const end = deadline(this.snap)
    if (end === null || this.deps.now() < end) return
    this.complete(end, recovered)
  }

  /** Call after system resume/unlock: completes overdue sessions and reschedules. */
  wake(): void {
    this.check()
    this.commit()
  }

  dispose(): void {
    if (this.handle !== null) this.deps.scheduler.clear(this.handle)
    this.handle = null
  }

  // ── internals ────────────────────────────────────────────────────────────

  private complete(endedAt: number, recovered: boolean): void {
    const s = this.snap
    if (s.startedAt === null || s.sessionId === null) return
    const type = s.sessionType

    const written = this.deps.recordSession({
      id: s.sessionId,
      taskId: s.taskId,
      taskTitle: s.taskTitle,
      sessionType: type,
      startedAt: new Date(s.startedAt),
      endedAt: new Date(endedAt),
      plannedDurationSeconds: s.plannedDurationSeconds,
      actualDurationSeconds: s.plannedDurationSeconds,
      status: 'completed'
    })

    let cycle = s.cycleCount
    let next: SessionType
    if (type === 'focus') {
      cycle += 1
      next = cycle >= this.interval() ? 'long_break' : 'short_break'
    } else {
      if (type === 'long_break') cycle = 0
      next = 'focus'
    }
    this.toIdle(next, cycle)

    if (written) {
      this.deps.onEvent({ type: 'session-finished', sessionId: s.sessionId, sessionType: type, outcome: 'completed', recovered })
      if (type === 'focus') this.checkDailyGoal(new Date(s.startedAt), s.plannedDurationSeconds)
    }

    const settings = this.deps.getSettings()
    const autoStart = next === 'focus' ? settings.autoStartFocus : settings.autoStartBreaks
    if (autoStart && !recovered) {
      this.snap.status = 'running'
      this.snap.sessionId = this.deps.newId()
      this.snap.startedAt = this.deps.now()
    }
  }

  private finishEarly(outcome: Exclude<SessionOutcome, 'completed'>): void {
    const s = this.snap
    if (s.startedAt === null || s.sessionId === null) return
    const now = this.deps.now()
    const actual = Math.min(s.plannedDurationSeconds, Math.floor(elapsedMs(s, now) / 1000))
    if (actual < MIN_RECORDED_SECONDS) return

    const written = this.deps.recordSession({
      id: s.sessionId,
      taskId: s.taskId,
      taskTitle: s.taskTitle,
      sessionType: s.sessionType,
      startedAt: new Date(s.startedAt),
      endedAt: new Date(s.pausedAt ?? now),
      plannedDurationSeconds: s.plannedDurationSeconds,
      actualDurationSeconds: actual,
      status: outcome
    })
    if (written && s.sessionType === 'focus') this.checkDailyGoal(new Date(s.startedAt), actual)
  }

  private checkDailyGoal(day: Date, addedSeconds: number): void {
    const goalMinutes = this.deps.getSettings().dailyGoalMinutes
    const from = startOfDay(day)
    const total = this.deps.focusSecondsBetween(from, addDays(from, 1))
    const goal = goalMinutes * 60
    if (total >= goal && total - addedSeconds < goal) {
      this.deps.onEvent({ type: 'daily-goal-reached', goalMinutes })
    }
  }

  private assignTask(taskId: string | null): void {
    if (taskId === null) {
      this.snap.taskId = null
      this.snap.taskTitle = null
      return
    }
    const title = this.deps.getTaskTitle(taskId)
    if (title === null) throw new TaskNotFoundError()
    this.snap.taskId = taskId
    this.snap.taskTitle = title
  }

  private toIdle(type: SessionType, cycleCount: number): void {
    this.snap = this.idleSnapshot(type, cycleCount, this.snap.taskId, this.snap.taskTitle)
  }

  private idleSnapshot(
    type: SessionType,
    cycleCount: number,
    taskId: string | null = null,
    taskTitle: string | null = null
  ): TimerSnapshot {
    return {
      status: 'idle',
      sessionType: type,
      sessionId: null,
      taskId,
      taskTitle,
      plannedDurationSeconds: this.durationFor(type),
      startedAt: null,
      pausedAt: null,
      pausedTotalMs: 0,
      cycleCount
    }
  }

  private durationFor(type: SessionType): number {
    const s = this.deps.getSettings()
    const minutes =
      type === 'focus' ? s.focusDurationMinutes : type === 'short_break' ? s.shortBreakMinutes : s.longBreakMinutes
    return minutes * 60
  }

  private interval(): number {
    return this.deps.getSettings().longBreakInterval
  }

  /** Persists, reschedules the deadline check and broadcasts. */
  private commit(): TimerState {
    this.deps.saveSnapshot(this.snap)
    this.schedule()
    const state = this.getState()
    this.deps.onChange(state)
    return state
  }

  private schedule(): void {
    this.dispose()
    const end = deadline(this.snap)
    if (end === null) return
    const wait = Math.min(Math.max(0, end - this.deps.now()), MAX_TIMEOUT_MS)
    this.handle = this.deps.scheduler.set(() => {
      this.handle = null
      const before = this.snap.sessionId
      this.check()
      if (this.snap.sessionId !== before || this.snap.status !== 'running') {
        this.commit()
      } else {
        this.schedule()
      }
    }, wait)
  }
}

export class TaskNotFoundError extends Error {
  override name = 'TaskNotFoundError'
  constructor() {
    super('That task no longer exists.')
  }
}

/** Validates a persisted snapshot; anything malformed is discarded. */
export function parseSnapshot(raw: unknown): TimerSnapshot | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  const numOrNull = (v: unknown): v is number | null => v === null || num(v)
  const strOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string'

  if (!['idle', 'running', 'paused'].includes(r.status as string)) return null
  if (!isSessionType(r.sessionType)) return null
  if (!strOrNull(r.sessionId) || !strOrNull(r.taskId) || !strOrNull(r.taskTitle)) return null
  if (!num(r.plannedDurationSeconds) || r.plannedDurationSeconds <= 0) return null
  if (!numOrNull(r.startedAt) || !numOrNull(r.pausedAt) || !num(r.pausedTotalMs) || !num(r.cycleCount)) return null

  const snap: TimerSnapshot = {
    status: r.status as TimerSnapshot['status'],
    sessionType: r.sessionType,
    sessionId: r.sessionId,
    taskId: r.taskId,
    taskTitle: r.taskTitle,
    plannedDurationSeconds: r.plannedDurationSeconds,
    startedAt: r.startedAt,
    pausedAt: r.pausedAt,
    pausedTotalMs: r.pausedTotalMs,
    cycleCount: Math.floor(r.cycleCount)
  }

  // Internal consistency: active sessions need an id and a start; paused ones a pause time.
  if (snap.status !== 'idle' && (snap.sessionId === null || snap.startedAt === null)) return null
  if (snap.status === 'paused' && snap.pausedAt === null) return null
  if (snap.status === 'running' && snap.pausedAt !== null) return null
  return snap
}
