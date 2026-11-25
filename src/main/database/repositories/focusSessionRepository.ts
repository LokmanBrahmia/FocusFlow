import type { DB } from '../database'
import type { SessionOutcome, SessionType } from '@shared/timer'

export interface NewFocusSession {
  id: string
  taskId: string | null
  taskTitle: string | null
  sessionType: SessionType
  startedAt: Date
  endedAt: Date
  plannedDurationSeconds: number
  actualDurationSeconds: number
  status: SessionOutcome
}

export class FocusSessionRepository {
  private readonly insertStmt
  private readonly focusSecondsStmt
  private readonly rateStmt

  constructor(db: DB) {
    // INSERT OR IGNORE on the primary key makes recording idempotent: a
    // completion that fires twice for the same session writes one row.
    // The task_id subquery stores NULL if the task was deleted meanwhile.
    this.insertStmt = db.prepare(`
      INSERT OR IGNORE INTO focus_sessions (
        id, task_id, task_title, subject_id, session_type, started_at, ended_at,
        planned_duration_seconds, actual_duration_seconds, status
      ) VALUES (
        @id, (SELECT id FROM tasks WHERE id = @taskId), @taskTitle,
        (SELECT subject_id FROM tasks WHERE id = @taskId), @sessionType,
        @startedAt, @endedAt, @planned, @actual, @status
      )
    `)
    this.rateStmt = db.prepare(
      "UPDATE focus_sessions SET focus_rating = ?, notes = ? WHERE id = ? AND session_type = 'focus'"
    )
    this.focusSecondsStmt = db.prepare(`
      SELECT COALESCE(SUM(actual_duration_seconds), 0) AS total
      FROM focus_sessions
      WHERE session_type = 'focus' AND started_at >= ? AND started_at < ?
    `)
  }

  /** Returns true when a new row was written, false for a duplicate. */
  record(s: NewFocusSession): boolean {
    const info = this.insertStmt.run({
      id: s.id,
      taskId: s.taskId,
      taskTitle: s.taskTitle,
      sessionType: s.sessionType,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt.toISOString(),
      planned: s.plannedDurationSeconds,
      actual: s.actualDurationSeconds,
      status: s.status
    })
    return info.changes === 1
  }

  /**
   * Rates a recorded focus session. Returns false if the session does not
   * exist or is not a focus session.
   */
  rate(id: string, rating: number | null, note: string | null): boolean {
    return this.rateStmt.run(rating, note, id).changes === 1
  }

  /** Focus seconds (completed or stopped early) started within [from, to). Breaks excluded. */
  focusSecondsBetween(from: Date, to: Date): number {
    const row = this.focusSecondsStmt.get(from.toISOString(), to.toISOString()) as { total: number }
    return row.total
  }
}
