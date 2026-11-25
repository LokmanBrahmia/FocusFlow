/**
 * Task and subject types plus validation, shared by main (authoritative
 * validation before SQL) and renderer (form hints).
 */

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
}

export interface Task {
  id: string
  title: string
  description: string | null
  subjectId: string | null
  priority: TaskPriority
  status: TaskStatus
  estimatedMinutes: number | null
  /** Derived from focus sessions, never stored. */
  focusSeconds: number
  /** Local calendar date, YYYY-MM-DD. */
  scheduledDate: string | null
  deadline: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface TaskInput {
  title: string
  description: string | null
  subjectId: string | null
  priority: TaskPriority
  status: TaskStatus
  estimatedMinutes: number | null
  scheduledDate: string | null
  deadline: string | null
}

export type CreateTaskInput = Partial<TaskInput> & { title: string }
export type UpdateTaskInput = Partial<TaskInput>

export type TaskSort = 'created' | 'deadline' | 'priority'
/** 'open' = to do + in progress. */
export type TaskStatusFilter = TaskStatus | 'open' | 'all'

export interface TaskQuery {
  search?: string
  status?: TaskStatusFilter
  priority?: TaskPriority | 'all'
  /** A subject id, 'none' for unassigned, or 'all'. */
  subjectId?: string | 'none' | 'all'
  /** Only tasks scheduled for this date (YYYY-MM-DD). */
  scheduledDate?: string
  /** Inclusive date ranges (YYYY-MM-DD). */
  scheduledFrom?: string
  scheduledTo?: string
  deadlineFrom?: string
  deadlineTo?: string
  sort?: TaskSort
  limit?: number
}

export interface TaskList {
  tasks: Task[]
  /** Total matching rows, which may exceed tasks.length when limited. */
  total: number
}

export interface Subject {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
  /** Derived. */
  taskCount: number
  openTaskCount: number
  focusSeconds: number
}

export interface SubjectInput {
  name: string
  description: string | null
  color: string | null
}

export type CreateSubjectInput = Partial<SubjectInput> & { name: string }
export type UpdateSubjectInput = Partial<SubjectInput>

/**
 * Subject colours: a categorical palette validated for colour-blind
 * separation (adjacent ΔE ≥ 8) on both FocusFlow surfaces. The light value is
 * what is stored; the dark value is its step for the dark surface.
 */
export const SUBJECT_PALETTE = [
  { light: '#2a78d6', dark: '#3987e5' },
  { light: '#eb6834', dark: '#d95926' },
  { light: '#1baf7a', dark: '#199e70' },
  { light: '#eda100', dark: '#c98500' },
  { light: '#e87ba4', dark: '#d55181' },
  { light: '#008300', dark: '#008300' },
  { light: '#6250d6', dark: '#9085e9' },
  { light: '#e34948', dark: '#e66767' }
] as const

export const SUBJECT_COLORS = SUBJECT_PALETTE.map((c) => c.light)

/** The colour to draw a stored subject colour with on the current theme. */
export function subjectColorFor(stored: string | null, dark: boolean): string | null {
  if (!stored) return null
  const slot = SUBJECT_PALETTE.find((c) => c.light.toLowerCase() === stored.toLowerCase())
  return slot ? (dark ? slot.dark : slot.light) : stored
}

export const MAX_TITLE = 200
export const MAX_DESCRIPTION = 5000
export const MAX_SUBJECT_NAME = 80

// ── validation ──────────────────────────────────────────────────────────────

export class InputError extends Error {
  override name = 'InputError'
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function isDateString(v: unknown): v is string {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function text(v: unknown, field: string, max: number, required: boolean): string | null {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
    if (required) throw new InputError(`${field} is required.`)
    return null
  }
  if (typeof v !== 'string') throw new InputError(`${field} must be text.`)
  const t = v.trim()
  if (t.length > max) throw new InputError(`${field} must be ${max} characters or fewer.`)
  return t
}

function optionalId(v: unknown, field: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string' && v.length <= 64) return v
  throw new InputError(`Invalid ${field}.`)
}

function optionalDate(v: unknown, field: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (!isDateString(v)) throw new InputError(`${field} must be a valid date.`)
  return v
}

function optionalMinutes(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 10_000) {
    throw new InputError('Estimate must be a whole number of minutes from 0 to 10000.')
  }
  return v
}

function oneOf<T extends string>(v: unknown, values: readonly T[], field: string): T {
  if (typeof v === 'string' && (values as readonly string[]).includes(v)) return v as T
  throw new InputError(`Invalid ${field}.`)
}

/** Validates a partial task. With `requireTitle`, the title must be present. */
export function parseTaskInput(raw: unknown, requireTitle: boolean): Partial<TaskInput> {
  if (!isObject(raw)) throw new InputError('Invalid task.')
  const out: Partial<TaskInput> = {}
  if (requireTitle || 'title' in raw) out.title = text(raw.title, 'Title', MAX_TITLE, true) as string
  if ('description' in raw) out.description = text(raw.description, 'Description', MAX_DESCRIPTION, false)
  if ('subjectId' in raw) out.subjectId = optionalId(raw.subjectId, 'subject')
  if ('priority' in raw) out.priority = oneOf(raw.priority, TASK_PRIORITIES, 'priority')
  if ('status' in raw) out.status = oneOf(raw.status, TASK_STATUSES, 'status')
  if ('estimatedMinutes' in raw) out.estimatedMinutes = optionalMinutes(raw.estimatedMinutes)
  if ('scheduledDate' in raw) out.scheduledDate = optionalDate(raw.scheduledDate, 'Scheduled date')
  if ('deadline' in raw) out.deadline = optionalDate(raw.deadline, 'Deadline')
  return out
}

export function parseSubjectInput(raw: unknown, requireName: boolean): Partial<SubjectInput> {
  if (!isObject(raw)) throw new InputError('Invalid subject.')
  const out: Partial<SubjectInput> = {}
  if (requireName || 'name' in raw) out.name = text(raw.name, 'Name', MAX_SUBJECT_NAME, true) as string
  if ('description' in raw) out.description = text(raw.description, 'Description', 500, false)
  if ('color' in raw) {
    if (raw.color === null || raw.color === undefined || raw.color === '') out.color = null
    else if (typeof raw.color === 'string' && COLOR_RE.test(raw.color)) out.color = raw.color
    else throw new InputError('Invalid colour.')
  }
  return out
}

export function parseTaskQuery(raw: unknown): TaskQuery {
  if (raw === undefined || raw === null) return {}
  if (!isObject(raw)) throw new InputError('Invalid task filter.')
  const q: TaskQuery = {}
  if (raw.search !== undefined) {
    if (typeof raw.search !== 'string' || raw.search.length > 200) throw new InputError('Invalid search.')
    q.search = raw.search
  }
  if (raw.status !== undefined) q.status = oneOf(raw.status, [...TASK_STATUSES, 'open', 'all'] as const, 'status filter')
  if (raw.priority !== undefined) q.priority = oneOf(raw.priority, [...TASK_PRIORITIES, 'all'] as const, 'priority filter')
  if (raw.subjectId !== undefined) {
    if (typeof raw.subjectId !== 'string' || raw.subjectId.length > 64) throw new InputError('Invalid subject filter.')
    q.subjectId = raw.subjectId
  }
  for (const key of ['scheduledDate', 'scheduledFrom', 'scheduledTo', 'deadlineFrom', 'deadlineTo'] as const) {
    if (raw[key] !== undefined) q[key] = optionalDate(raw[key], 'Date') ?? undefined
  }
  if (raw.sort !== undefined) q.sort = oneOf(raw.sort, ['created', 'deadline', 'priority'] as const, 'sort')
  if (raw.limit !== undefined) {
    if (typeof raw.limit !== 'number' || !Number.isInteger(raw.limit) || raw.limit < 1 || raw.limit > 5000) {
      throw new InputError('Invalid limit.')
    }
    q.limit = raw.limit
  }
  return q
}

/** Progress of focused time against the estimate, 0–1+ (not capped), or null without an estimate. */
export function taskProgress(t: Pick<Task, 'estimatedMinutes' | 'focusSeconds'>): number | null {
  if (!t.estimatedMinutes) return null
  return t.focusSeconds / 60 / t.estimatedMinutes
}

export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}
