/**
 * Timer types shared by the main process (authoritative) and renderer (display).
 *
 * The timer is timestamp-based: remaining time is always derived from
 * `startedAt`, `pausedAt`, `pausedTotalMs` and the planned duration, never
 * from a decrementing counter, so it cannot drift while the app is
 * minimised, throttled or suspended.
 */

export type SessionType = 'focus' | 'short_break' | 'long_break'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type SessionOutcome = 'completed' | 'stopped' | 'skipped'

export const SESSION_TYPES: readonly SessionType[] = ['focus', 'short_break', 'long_break']

export const SESSION_LABELS: Record<SessionType, string> = {
  focus: 'Focus',
  short_break: 'Short break',
  long_break: 'Long break'
}

/** The part of the timer that is persisted and survives a restart. */
export interface TimerSnapshot {
  status: TimerStatus
  sessionType: SessionType
  /** Generated when a session starts; used to make completion idempotent. */
  sessionId: string | null
  taskId: string | null
  taskTitle: string | null
  plannedDurationSeconds: number
  /** Epoch ms when the session first started. */
  startedAt: number | null
  /** Epoch ms when the current pause began. */
  pausedAt: number | null
  /** Total paused time before the current pause, in ms. */
  pausedTotalMs: number
  /** Focus sessions completed in the current set; resets after a long break. */
  cycleCount: number
}

/** What the renderer receives: the snapshot plus derived values. */
export interface TimerState extends TimerSnapshot {
  remainingMs: number
  /** Epoch ms when a running session will end; null unless running. */
  endsAt: number | null
  longBreakInterval: number
}

export interface StartTimerInput {
  taskId?: string | null
  sessionType?: SessionType
}

export type TimerEvent =
  | {
      type: 'session-finished'
      sessionId: string
      sessionType: SessionType
      outcome: SessionOutcome
      /** True when the session ended while the app was closed. */
      recovered: boolean
    }
  | { type: 'daily-goal-reached'; goalMinutes: number }

export function elapsedMs(s: TimerSnapshot, now: number): number {
  if (s.startedAt === null) return 0
  const end = s.pausedAt ?? now
  return Math.max(0, end - s.startedAt - s.pausedTotalMs)
}

export function remainingMs(s: TimerSnapshot, now: number): number {
  return Math.max(0, s.plannedDurationSeconds * 1000 - elapsedMs(s, now))
}

/** Epoch ms at which a running session reaches zero. */
export function deadline(s: TimerSnapshot): number | null {
  if (s.status !== 'running' || s.startedAt === null) return null
  return s.startedAt + s.pausedTotalMs + s.plannedDurationSeconds * 1000
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function isSessionType(v: unknown): v is SessionType {
  return typeof v === 'string' && (SESSION_TYPES as readonly string[]).includes(v)
}
