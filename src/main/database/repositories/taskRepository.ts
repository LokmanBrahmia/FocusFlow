import { randomUUID } from 'node:crypto'
import type { DB } from '../database'
import {
  InputError,
  type CreateTaskInput,
  type Task,
  type TaskInput,
  type TaskList,
  type TaskPriority,
  type TaskQuery,
  type TaskStatus,
  type UpdateTaskInput
} from '@shared/tasks'

interface TaskRow {
  id: string
  title: string
  description: string | null
  subject_id: string | null
  priority: TaskPriority
  status: TaskStatus
  estimated_duration_minutes: number | null
  scheduled_date: string | null
  deadline: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  focus_seconds: number
}

const SELECT_TASK = `
  SELECT t.*, COALESCE(fs.focus_seconds, 0) AS focus_seconds
  FROM tasks t
  LEFT JOIN (
    SELECT task_id, SUM(actual_duration_seconds) AS focus_seconds
    FROM focus_sessions
    WHERE session_type = 'focus' AND task_id IS NOT NULL
    GROUP BY task_id
  ) fs ON fs.task_id = t.id
`

const ORDER_BY: Record<NonNullable<TaskQuery['sort']>, string> = {
  created: 't.created_at DESC',
  deadline: 't.deadline IS NULL, t.deadline ASC, t.created_at DESC',
  priority:
    "CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.deadline IS NULL, t.deadline, t.created_at DESC"
}

export const DEFAULT_TASK_LIMIT = 500

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    subjectId: r.subject_id,
    priority: r.priority,
    status: r.status,
    estimatedMinutes: r.estimated_duration_minutes,
    focusSeconds: r.focus_seconds,
    scheduledDate: r.scheduled_date,
    deadline: r.deadline,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at
  }
}

export class TaskNotFound extends Error {
  override name = 'TaskNotFound'
  constructor() {
    super('That task no longer exists.')
  }
}

export class TaskRepository {
  constructor(
    private readonly db: DB,
    private readonly now: () => Date = () => new Date()
  ) {}

  list(q: TaskQuery = {}): TaskList {
    const where: string[] = []
    const params: Record<string, unknown> = {}

    if (q.search?.trim()) {
      where.push("t.title LIKE @search ESCAPE '\\'")
      params.search = `%${q.search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    }
    const status = q.status ?? 'all'
    if (status === 'open') where.push("t.status IN ('todo', 'in_progress')")
    else if (status !== 'all') {
      where.push('t.status = @status')
      params.status = status
    }
    if (q.priority && q.priority !== 'all') {
      where.push('t.priority = @priority')
      params.priority = q.priority
    }
    if (q.subjectId === 'none') where.push('t.subject_id IS NULL')
    else if (q.subjectId && q.subjectId !== 'all') {
      where.push('t.subject_id = @subjectId')
      params.subjectId = q.subjectId
    }
    if (q.scheduledDate) {
      where.push('t.scheduled_date = @scheduledDate')
      params.scheduledDate = q.scheduledDate
    }
    const ranges = [
      ['scheduledFrom', 't.scheduled_date >= @scheduledFrom'],
      ['scheduledTo', 't.scheduled_date <= @scheduledTo'],
      ['deadlineFrom', 't.deadline >= @deadlineFrom'],
      ['deadlineTo', 't.deadline <= @deadlineTo']
    ] as const
    for (const [key, clause] of ranges) {
      if (q[key]) {
        where.push(clause)
        params[key] = q[key]
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const limit = q.limit ?? DEFAULT_TASK_LIMIT
    const rows = this.db
      .prepare(`${SELECT_TASK} ${whereSql} ORDER BY ${ORDER_BY[q.sort ?? 'created']} LIMIT ${limit}`)
      .all(params) as TaskRow[]
    const { n } = this.db.prepare(`SELECT COUNT(*) AS n FROM tasks t ${whereSql}`).get(params) as { n: number }
    return { tasks: rows.map(toTask), total: n }
  }

  getById(id: string): Task | null {
    const row = this.db.prepare(`${SELECT_TASK} WHERE t.id = ?`).get(id) as TaskRow | undefined
    return row ? toTask(row) : null
  }

  create(input: CreateTaskInput): Task {
    this.assertSubject(input.subjectId)
    const id = randomUUID()
    const now = this.now().toISOString()
    const status = input.status ?? 'todo'
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, subject_id, priority, status,
           estimated_duration_minutes, scheduled_date, deadline, created_at, updated_at, completed_at)
         VALUES (@id, @title, @description, @subjectId, @priority, @status,
           @estimatedMinutes, @scheduledDate, @deadline, @now, @now, @completedAt)`
      )
      .run({
        id,
        title: input.title,
        description: input.description ?? null,
        subjectId: input.subjectId ?? null,
        priority: input.priority ?? 'medium',
        status,
        estimatedMinutes: input.estimatedMinutes ?? null,
        scheduledDate: input.scheduledDate ?? null,
        deadline: input.deadline ?? null,
        now,
        completedAt: status === 'completed' ? now : null
      })
    return this.getById(id) as Task
  }

  update(id: string, input: UpdateTaskInput): Task {
    const current = this.getById(id)
    if (!current) throw new TaskNotFound()
    if (input.subjectId !== undefined) this.assertSubject(input.subjectId)

    const next: TaskInput = {
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      subjectId: input.subjectId !== undefined ? input.subjectId : current.subjectId,
      priority: input.priority ?? current.priority,
      status: input.status ?? current.status,
      estimatedMinutes: input.estimatedMinutes !== undefined ? input.estimatedMinutes : current.estimatedMinutes,
      scheduledDate: input.scheduledDate !== undefined ? input.scheduledDate : current.scheduledDate,
      deadline: input.deadline !== undefined ? input.deadline : current.deadline
    }
    const now = this.now().toISOString()
    const completedAt =
      next.status === 'completed' ? (current.status === 'completed' ? current.completedAt : now) : null

    this.db
      .prepare(
        `UPDATE tasks SET title = @title, description = @description, subject_id = @subjectId,
           priority = @priority, status = @status, estimated_duration_minutes = @estimatedMinutes,
           scheduled_date = @scheduledDate, deadline = @deadline, updated_at = @now, completed_at = @completedAt
         WHERE id = @id`
      )
      .run({ ...next, id, now, completedAt })
    return this.getById(id) as Task
  }

  /** Focus sessions keep their history (task_id becomes NULL, title snapshot stays). */
  delete(id: string): void {
    const info = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    if (info.changes === 0) throw new TaskNotFound()
  }

  /** Starting focus on a task that has not been started yet moves it to "in progress". */
  markStarted(id: string): boolean {
    const info = this.db
      .prepare("UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'todo'")
      .run(this.now().toISOString(), id)
    return info.changes > 0
  }

  private assertSubject(subjectId: string | null | undefined): void {
    if (!subjectId) return
    const row = this.db.prepare('SELECT 1 FROM subjects WHERE id = ?').get(subjectId)
    if (!row) throw new InputError('That subject no longer exists.')
  }
}
