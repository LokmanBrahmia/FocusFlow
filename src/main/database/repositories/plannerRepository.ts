import { randomUUID } from 'node:crypto'
import { addDays, format, parse, startOfDay } from 'date-fns'
import type { DB } from '../database'
import { InputError, type Task } from '@shared/tasks'
import {
  blockMinutes,
  minutesOf,
  type ActualSession,
  type DayPlan,
  type TimeBlock,
  type TimeBlockInput
} from '@shared/planner'
import type { TaskRepository } from './taskRepository'
import { tl } from '@shared/i18n'

interface BlockRow {
  id: string
  task_id: string
  task_title: string
  subject_id: string | null
  scheduled_date: string
  start_time: string
  end_time: string
  created_at: string
}

const SELECT_BLOCK = `
  SELECT b.id, b.task_id, t.title AS task_title, t.subject_id, b.scheduled_date, b.start_time, b.end_time, b.created_at
  FROM time_blocks b JOIN tasks t ON t.id = b.task_id
`

function toBlock(r: BlockRow): TimeBlock {
  return {
    id: r.id,
    taskId: r.task_id,
    taskTitle: r.task_title,
    subjectId: r.subject_id,
    date: r.scheduled_date,
    start: r.start_time,
    end: r.end_time,
    createdAt: r.created_at
  }
}

export class TimeBlockNotFound extends Error {
  override name = 'TimeBlockNotFound'
  constructor() {
    super('That study block no longer exists.')
  }
}

const dayKey = (d: Date): string => format(d, 'yyyy-MM-dd')
const parseDay = (s: string): Date => parse(s, 'yyyy-MM-dd', new Date())

export class PlannerRepository {
  constructor(
    private readonly db: DB,
    private readonly tasks: TaskRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  // ── time blocks ───────────────────────────────────────────────────────────

  getBlock(id: string): TimeBlock | null {
    const row = this.db.prepare(`${SELECT_BLOCK} WHERE b.id = ?`).get(id) as BlockRow | undefined
    return row ? toBlock(row) : null
  }

  createBlock(input: TimeBlockInput): TimeBlock {
    this.assertBlock(input)
    const id = randomUUID()
    this.db
      .prepare(
        'INSERT INTO time_blocks (id, task_id, scheduled_date, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, input.taskId, input.date, input.start, input.end, this.now().toISOString())
    return this.getBlock(id) as TimeBlock
  }

  updateBlock(id: string, input: Partial<TimeBlockInput>): TimeBlock {
    const current = this.getBlock(id)
    if (!current) throw new TimeBlockNotFound()
    const next: TimeBlockInput = {
      taskId: input.taskId ?? current.taskId,
      date: input.date ?? current.date,
      start: input.start ?? current.start,
      end: input.end ?? current.end
    }
    if (minutesOf(next.end) <= minutesOf(next.start)) throw new InputError('The block must end after it starts.')
    this.assertBlock(next, id)
    this.db
      .prepare('UPDATE time_blocks SET task_id = ?, scheduled_date = ?, start_time = ?, end_time = ? WHERE id = ?')
      .run(next.taskId, next.date, next.start, next.end, id)
    return this.getBlock(id) as TimeBlock
  }

  deleteBlock(id: string): void {
    if (this.db.prepare('DELETE FROM time_blocks WHERE id = ?').run(id).changes === 0) throw new TimeBlockNotFound()
  }

  private assertBlock(b: TimeBlockInput, exceptId?: string): void {
    if (!this.db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(b.taskId)) {
      throw new InputError(tl('err.taskGone'))
    }
    // Times are zero-padded HH:MM, so string comparison is chronological.
    const clash = this.db
      .prepare(
        `SELECT start_time, end_time FROM time_blocks
         WHERE scheduled_date = ? AND id IS NOT ? AND start_time < ? AND end_time > ? LIMIT 1`
      )
      .get(b.date, exceptId ?? null, b.end, b.start) as { start_time: string; end_time: string } | undefined
    if (clash) {
      throw new InputError(tl('err.overlap', { start: clash.start_time, end: clash.end_time }))
    }
  }

  // ── plans ─────────────────────────────────────────────────────────────────

  /** One DayPlan per day from `from` (inclusive), `days` days long. */
  getRange(from: string, days: number): DayPlan[] {
    const first = parseDay(from)
    const keys = Array.from({ length: days }, (_, i) => dayKey(addDays(first, i)))
    const last = keys[keys.length - 1]

    const scheduled = this.tasks.list({ scheduledFrom: from, scheduledTo: last, status: 'all', sort: 'priority', limit: 5000 }).tasks
    const due = this.tasks.list({ deadlineFrom: from, deadlineTo: last, status: 'open', sort: 'priority', limit: 5000 }).tasks

    const blocks = (
      this.db
        .prepare(`${SELECT_BLOCK} WHERE b.scheduled_date BETWEEN ? AND ? ORDER BY b.start_time`)
        .all(from, last) as BlockRow[]
    ).map(toBlock)

    // Every task a block points at, so a block can pull its task onto any day.
    const byId = new Map<string, Task>(scheduled.map((t) => [t.id, t]))
    for (const b of blocks) {
      if (!byId.has(b.taskId)) {
        const t = this.tasks.getById(b.taskId)
        if (t) byId.set(t.id, t)
      }
    }

    // Sessions are bucketed by the local day they started on.
    const rangeStart = startOfDay(first)
    const rangeEnd = addDays(startOfDay(parseDay(last)), 1)
    const sessions = this.db
      .prepare(
        `SELECT id, task_title, started_at, ended_at, actual_duration_seconds AS seconds
         FROM focus_sessions
         WHERE session_type = 'focus' AND started_at >= ? AND started_at < ? AND actual_duration_seconds > 0
         ORDER BY started_at`
      )
      .all(rangeStart.toISOString(), rangeEnd.toISOString()) as {
      id: string
      task_title: string | null
      started_at: string
      ended_at: string
      seconds: number
    }[]

    return keys.map((date) => {
      const dayBlocks = blocks.filter((b) => b.date === date)
      const blockTaskIds = new Set(dayBlocks.map((b) => b.taskId))
      const scheduledHere = scheduled.filter((t) => t.scheduledDate === date)
      const scheduledIds = new Set(scheduledHere.map((t) => t.id))
      const dayTasks = [
        ...scheduledHere,
        ...[...blockTaskIds].filter((id) => !scheduledIds.has(id)).flatMap((id) => byId.get(id) ?? [])
      ]
      const daySessions: ActualSession[] = sessions
        .filter((s) => dayKey(new Date(s.started_at)) === date)
        .map((s) => ({ id: s.id, taskTitle: s.task_title, startedAt: s.started_at, endedAt: s.ended_at, seconds: s.seconds }))

      const counted = dayTasks.filter((t) => t.status !== 'cancelled')
      const estimateMinutes = counted
        .filter((t) => !blockTaskIds.has(t.id))
        .reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0)

      return {
        date,
        tasks: dayTasks,
        deadlines: due.filter((t) => t.deadline === date),
        blocks: dayBlocks,
        sessions: daySessions,
        plannedMinutes: dayBlocks.reduce((sum, b) => sum + blockMinutes(b), 0) + estimateMinutes,
        focusSeconds: daySessions.reduce((sum, s) => sum + s.seconds, 0),
        completedCount: counted.filter((t) => t.status === 'completed').length,
        totalCount: counted.length
      }
    })
  }
}
