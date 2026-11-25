import { randomUUID } from 'node:crypto'
import type { DB } from '../database'
import { InputError, type CreateSubjectInput, type Subject, type UpdateSubjectInput } from '@shared/tasks'

interface SubjectRow {
  id: string
  name: string
  description: string | null
  color: string | null
  created_at: string
  task_count: number
  open_task_count: number
  focus_seconds: number
}

const SELECT_SUBJECT = `
  SELECT s.*,
    (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.subject_id = s.id AND t.status IN ('todo', 'in_progress')) AS open_task_count,
    (SELECT COALESCE(SUM(f.actual_duration_seconds), 0)
       FROM focus_sessions f JOIN tasks t ON t.id = f.task_id
      WHERE t.subject_id = s.id AND f.session_type = 'focus') AS focus_seconds
  FROM subjects s
`

function toSubject(r: SubjectRow): Subject {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    createdAt: r.created_at,
    taskCount: r.task_count,
    openTaskCount: r.open_task_count,
    focusSeconds: r.focus_seconds
  }
}

export class SubjectNotFound extends Error {
  override name = 'SubjectNotFound'
  constructor() {
    super('That subject no longer exists.')
  }
}

export class SubjectRepository {
  constructor(
    private readonly db: DB,
    private readonly now: () => Date = () => new Date()
  ) {}

  list(): Subject[] {
    const rows = this.db.prepare(`${SELECT_SUBJECT} ORDER BY s.name COLLATE NOCASE`).all() as SubjectRow[]
    return rows.map(toSubject)
  }

  getById(id: string): Subject | null {
    const row = this.db.prepare(`${SELECT_SUBJECT} WHERE s.id = ?`).get(id) as SubjectRow | undefined
    return row ? toSubject(row) : null
  }

  create(input: CreateSubjectInput): Subject {
    this.assertUniqueName(input.name)
    const id = randomUUID()
    this.db
      .prepare('INSERT INTO subjects (id, name, description, color, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, input.name, input.description ?? null, input.color ?? null, this.now().toISOString())
    return this.getById(id) as Subject
  }

  update(id: string, input: UpdateSubjectInput): Subject {
    const current = this.getById(id)
    if (!current) throw new SubjectNotFound()
    if (input.name !== undefined) this.assertUniqueName(input.name, id)
    this.db
      .prepare('UPDATE subjects SET name = ?, description = ?, color = ? WHERE id = ?')
      .run(
        input.name ?? current.name,
        input.description !== undefined ? input.description : current.description,
        input.color !== undefined ? input.color : current.color,
        id
      )
    return this.getById(id) as Subject
  }

  /**
   * Deletes a subject. Its tasks are moved to `reassignTo`, or left without
   * a subject when it is null. Tasks and focus history are never deleted.
   */
  delete(id: string, reassignTo: string | null): void {
    if (reassignTo === id) throw new InputError('Choose a different subject to move the tasks to.')
    const run = this.db.transaction(() => {
      if (!this.db.prepare('SELECT 1 FROM subjects WHERE id = ?').get(id)) throw new SubjectNotFound()
      if (reassignTo && !this.db.prepare('SELECT 1 FROM subjects WHERE id = ?').get(reassignTo)) {
        throw new InputError('The subject to move tasks to no longer exists.')
      }
      this.db
        .prepare('UPDATE tasks SET subject_id = ?, updated_at = ? WHERE subject_id = ?')
        .run(reassignTo, this.now().toISOString(), id)
      this.db.prepare('DELETE FROM subjects WHERE id = ?').run(id)
    })
    run()
  }

  private assertUniqueName(name: string, exceptId?: string): void {
    const row = this.db
      .prepare('SELECT id FROM subjects WHERE name = ? COLLATE NOCASE AND id IS NOT ?')
      .get(name, exceptId ?? null)
    if (row) throw new InputError(`A subject called "${name}" already exists.`)
  }
}
