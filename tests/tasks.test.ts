import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DB } from '../src/main/database/database'
import { TaskRepository } from '../src/main/database/repositories/taskRepository'
import { SubjectRepository } from '../src/main/database/repositories/subjectRepository'
import { FocusSessionRepository } from '../src/main/database/repositories/focusSessionRepository'
import { InputError, parseSubjectInput, parseTaskInput, parseTaskQuery, taskProgress } from '@shared/tasks'

let db: DB
let tasks: TaskRepository
let subjects: SubjectRepository
let sessions: FocusSessionRepository
let clock: Date

beforeEach(() => {
  db = openDatabase(':memory:')
  clock = new Date('2026-11-25T09:00:00.000Z')
  const now = (): Date => new Date(clock)
  tasks = new TaskRepository(db, now)
  subjects = new SubjectRepository(db, now)
  sessions = new FocusSessionRepository(db)
})

afterEach(() => db.close())

function focus(taskId: string | null, seconds: number, id = `s-${Math.random()}`, type: 'focus' | 'short_break' = 'focus'): void {
  sessions.record({
    id,
    taskId,
    taskTitle: 'x',
    sessionType: type,
    startedAt: new Date('2026-11-25T10:00:00Z'),
    endedAt: new Date('2026-11-25T10:25:00Z'),
    plannedDurationSeconds: 1500,
    actualDurationSeconds: seconds,
    status: 'completed'
  })
}

describe('TaskRepository', () => {
  it('creates a task with defaults', () => {
    const t = tasks.create({ title: 'Read chapter 3' })
    expect(t).toMatchObject({
      title: 'Read chapter 3',
      priority: 'medium',
      status: 'todo',
      focusSeconds: 0,
      completedAt: null,
      createdAt: '2026-11-25T09:00:00.000Z'
    })
  })

  it('derives focus time from focus sessions only', () => {
    const t = tasks.create({ title: 'Lab report', estimatedMinutes: 120 })
    focus(t.id, 1800)
    focus(t.id, 1800)
    focus(t.id, 300, 'break', 'short_break')
    const got = tasks.getById(t.id)!
    expect(got.focusSeconds).toBe(3600)
    expect(taskProgress(got)).toBe(0.5)
  })

  it('does not complete a task just because the estimate is reached', () => {
    const t = tasks.create({ title: 'Short', estimatedMinutes: 10 })
    focus(t.id, 1200)
    expect(tasks.getById(t.id)!.status).toBe('todo')
  })

  it('sets and clears completedAt with the status', () => {
    const t = tasks.create({ title: 'Essay' })
    clock = new Date('2026-11-26T08:00:00.000Z')
    expect(tasks.update(t.id, { status: 'completed' }).completedAt).toBe('2026-11-26T08:00:00.000Z')
    clock = new Date('2026-11-27T08:00:00.000Z')
    expect(tasks.update(t.id, { title: 'Essay v2' }).completedAt).toBe('2026-11-26T08:00:00.000Z')
    expect(tasks.update(t.id, { status: 'todo' }).completedAt).toBeNull()
  })

  it('updates only the provided fields', () => {
    const t = tasks.create({ title: 'A', description: 'keep me', deadline: '2026-12-01' })
    const u = tasks.update(t.id, { priority: 'high', deadline: null })
    expect(u).toMatchObject({ priority: 'high', description: 'keep me', deadline: null, title: 'A' })
  })

  it('deletes a task but keeps its focus history', () => {
    const t = tasks.create({ title: 'Gone soon' })
    focus(t.id, 1500, 'kept')
    tasks.delete(t.id)
    expect(tasks.getById(t.id)).toBeNull()
    expect(db.prepare("SELECT task_id FROM focus_sessions WHERE id = 'kept'").get()).toEqual({ task_id: null })
  })

  it('filters by status, priority, subject and search, case-insensitively', () => {
    const ml = subjects.create({ name: 'Machine Learning' })
    tasks.create({ title: 'Gradient descent notes', subjectId: ml.id, priority: 'high' })
    tasks.create({ title: 'Backprop exercises', subjectId: ml.id, status: 'completed' })
    tasks.create({ title: 'Read 100% of chapter_2', priority: 'low' })

    expect(tasks.list({ status: 'open' }).total).toBe(2)
    expect(tasks.list({ priority: 'high' }).tasks.map((t) => t.title)).toEqual(['Gradient descent notes'])
    expect(tasks.list({ subjectId: ml.id }).total).toBe(2)
    expect(tasks.list({ subjectId: 'none' }).total).toBe(1)
    expect(tasks.list({ search: 'GRADIENT' }).total).toBe(1)
    // LIKE wildcards in the search text are matched literally.
    expect(tasks.list({ search: '100%' }).total).toBe(1)
    expect(tasks.list({ search: '_' }).total).toBe(1)
  })

  it('sorts by deadline with undated tasks last, and by priority', () => {
    tasks.create({ title: 'none' })
    tasks.create({ title: 'late', deadline: '2026-12-20', priority: 'low' })
    tasks.create({ title: 'soon', deadline: '2026-12-01', priority: 'high' })
    expect(tasks.list({ sort: 'deadline' }).tasks.map((t) => t.title)).toEqual(['soon', 'late', 'none'])
    expect(tasks.list({ sort: 'priority' }).tasks.map((t) => t.title)).toEqual(['soon', 'none', 'late'])
  })

  it('limits results but reports the full count', () => {
    for (let i = 0; i < 12; i++) tasks.create({ title: `Task ${i}` })
    const r = tasks.list({ limit: 5 })
    expect(r.tasks).toHaveLength(5)
    expect(r.total).toBe(12)
  })

  it('moves a not-started task to in progress when focus starts', () => {
    const t = tasks.create({ title: 'Start me' })
    expect(tasks.markStarted(t.id)).toBe(true)
    expect(tasks.getById(t.id)!.status).toBe('in_progress')
    expect(tasks.markStarted(t.id)).toBe(false)
  })

  it('rejects a subject that does not exist', () => {
    expect(() => tasks.create({ title: 'x', subjectId: 'nope' })).toThrow(InputError)
  })
})

describe('SubjectRepository', () => {
  it('reports task counts and focus time per subject', () => {
    const net = subjects.create({ name: 'Computer Networks', color: '#5CC8F0' })
    const a = tasks.create({ title: 'TCP', subjectId: net.id })
    tasks.create({ title: 'UDP', subjectId: net.id, status: 'completed' })
    focus(a.id, 1500)
    expect(subjects.getById(net.id)).toMatchObject({ taskCount: 2, openTaskCount: 1, focusSeconds: 1500 })
  })

  it('rejects duplicate names regardless of case', () => {
    subjects.create({ name: 'Reading' })
    expect(() => subjects.create({ name: 'reading' })).toThrow(/already exists/)
  })

  it('deleting a subject leaves its tasks unassigned', () => {
    const s = subjects.create({ name: 'Research' })
    const t = tasks.create({ title: 'Survey', subjectId: s.id })
    subjects.delete(s.id, null)
    expect(subjects.list()).toHaveLength(0)
    expect(tasks.getById(t.id)!.subjectId).toBeNull()
  })

  it('deleting a subject can move its tasks to another subject', () => {
    const a = subjects.create({ name: 'AI' })
    const b = subjects.create({ name: 'Artificial Intelligence' })
    const t = tasks.create({ title: 'Search algorithms', subjectId: a.id })
    subjects.delete(a.id, b.id)
    expect(tasks.getById(t.id)!.subjectId).toBe(b.id)
  })

  it('rolls back when the reassignment target is missing', () => {
    const a = subjects.create({ name: 'AI' })
    const t = tasks.create({ title: 'x', subjectId: a.id })
    expect(() => subjects.delete(a.id, 'missing')).toThrow(InputError)
    expect(subjects.getById(a.id)).not.toBeNull()
    expect(tasks.getById(t.id)!.subjectId).toBe(a.id)
  })
})

describe('input validation', () => {
  it('requires a title and trims it', () => {
    expect(() => parseTaskInput({ title: '   ' }, true)).toThrow(/Title is required/)
    expect(parseTaskInput({ title: '  Plan  ' }, true).title).toBe('Plan')
  })

  it('rejects invalid values', () => {
    expect(() => parseTaskInput({ title: 'x', priority: 'urgent' }, true)).toThrow(InputError)
    expect(() => parseTaskInput({ title: 'x', deadline: '2026-02-30' }, true)).toThrow(/valid date/)
    expect(() => parseTaskInput({ title: 'x', estimatedMinutes: 1.5 }, true)).toThrow(/whole number/)
    expect(() => parseTaskInput('nope', true)).toThrow(InputError)
    expect(() => parseSubjectInput({ name: 'x', color: 'red' }, true)).toThrow(/colour/)
    expect(() => parseTaskQuery({ sort: 'random' })).toThrow(InputError)
  })

  it('only includes fields that were sent, so partial updates stay partial', () => {
    expect(parseTaskInput({ priority: 'low' }, false)).toEqual({ priority: 'low' })
    expect(parseTaskInput({ description: '' }, false)).toEqual({ description: null })
  })
})
