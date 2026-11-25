import { BrowserWindow, ipcMain, nativeTheme, type IpcMainInvokeEvent } from 'electron'
import { IPC, type AppCapabilities, type AppInfo, type DataEntity, type IpcResult } from '@shared/ipc'
import { InputError, parseSubjectInput, parseTaskInput, parseTaskQuery, type CreateSubjectInput, type CreateTaskInput } from '@shared/tasks'
import { SETTING_VALIDATORS, isSettingKey, type AppSettings } from '@shared/settings'
import { isSessionType, type StartTimerInput } from '@shared/timer'
import type { SettingsRepository } from '../database/repositories/settingsRepository'
import { TaskNotFound, type TaskRepository } from '../database/repositories/taskRepository'
import { SubjectNotFound, type SubjectRepository } from '../database/repositories/subjectRepository'
import { TimeBlockNotFound, type PlannerRepository } from '../database/repositories/plannerRepository'
import { MAX_PLAN_DAYS, parseTimeBlockInput, type TimeBlockInput } from '@shared/planner'
import { isDateString } from '@shared/tasks'
import { parseDateRange, parseRating } from '@shared/statistics'
import type { StatisticsRepository } from '../database/repositories/statisticsRepository'
import type { FocusSessionRepository } from '../database/repositories/focusSessionRepository'
import { TaskNotFoundError, type TimerService } from '../timer/timerService'
import { UpdateActionError } from '../updates/updateService'

export class ValidationError extends Error {
  override name = 'ValidationError'
}

interface HandlerContext {
  settings: SettingsRepository
  timer: TimerService
  tasks: TaskRepository
  subjects: SubjectRepository
  planner: PlannerRepository
  statistics: StatisticsRepository
  sessions: FocusSessionRepository
  getAppInfo: () => AppInfo
  getCapabilities: () => AppCapabilities
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
  onSettingsChanged: (settings: AppSettings, key: keyof AppSettings) => void
  openMiniTimer: () => void
  closeMiniTimer: () => void
  showMainWindow: () => void
}

/**
 * Registers an invoke handler that rejects untrusted senders and converts
 * thrown errors into a typed result instead of leaking stack traces.
 */
export function handle<T>(
  ctx: Pick<HandlerContext, 'isTrustedSender'>,
  channel: string,
  fn: (...args: unknown[]) => T | Promise<T>
): void {
  ipcMain.handle(channel, async (event, ...args): Promise<IpcResult<T>> => {
    if (!ctx.isTrustedSender(event)) {
      return { ok: false, error: { code: 'INTERNAL', message: 'Request rejected.' } }
    }
    try {
      return { ok: true, data: await fn(...args) }
    } catch (err) {
      if (err instanceof ValidationError || err instanceof InputError || err instanceof UpdateActionError) {
        return { ok: false, error: { code: 'VALIDATION', message: err.message } }
      }
      if (err instanceof TaskNotFoundError || err instanceof TaskNotFound || err instanceof SubjectNotFound || err instanceof TimeBlockNotFound) {
        return { ok: false, error: { code: 'NOT_FOUND', message: err.message } }
      }
      console.error(`[ipc] ${channel} failed:`, err)
      const isDb = err instanceof Error && err.name === 'SqliteError'
      return {
        ok: false,
        error: isDb
          ? { code: 'DATABASE', message: 'The database could not complete that change.' }
          : { code: 'INTERNAL', message: 'Something went wrong. Try again.' }
      }
    }
  })
}

// ── argument validation ─────────────────────────────────────────────────────

function optionalTaskId(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return v
  if (typeof v === 'string' && v.length > 0 && v.length <= 64) return v
  throw new ValidationError('Invalid task id.')
}

export function requiredId(v: unknown, what: string): string {
  if (typeof v === 'string' && v.length > 0 && v.length <= 64) return v
  throw new ValidationError(`Invalid ${what} id.`)
}

function startInput(v: unknown): StartTimerInput {
  if (v === undefined || v === null) return {}
  if (typeof v !== 'object') throw new ValidationError('Invalid timer options.')
  const r = v as Record<string, unknown>
  const out: StartTimerInput = {}
  const taskId = optionalTaskId(r.taskId)
  if (taskId !== undefined) out.taskId = taskId
  if (r.sessionType !== undefined) {
    if (!isSessionType(r.sessionType)) throw new ValidationError('Invalid session type.')
    out.sessionType = r.sessionType
  }
  return out
}

export function applyThemeSource(theme: AppSettings['theme']): void {
  nativeTheme.themeSource = theme
}

export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

export function notifyDataChanged(entity: DataEntity): void {
  broadcast(IPC.dataChanged, entity)
}

export function registerIpcHandlers(ctx: HandlerContext): void {
  const { timer, tasks, subjects, planner, statistics, sessions } = ctx

  handle(ctx, IPC.appGetInfo, () => ctx.getAppInfo())
  handle(ctx, IPC.appGetCapabilities, () => ctx.getCapabilities())
  handle(ctx, IPC.appOpenMiniTimer, () => ctx.openMiniTimer())
  handle(ctx, IPC.appCloseMiniTimer, () => ctx.closeMiniTimer())
  handle(ctx, IPC.appShowMainWindow, () => ctx.showMainWindow())

  handle(ctx, IPC.settingsGetAll, () =>
    ctx.settings.getAll((key) => console.warn(`[settings] ignored invalid stored value for "${key}"`))
  )

  handle(ctx, IPC.settingsUpdate, (key, value) => {
    if (!isSettingKey(key)) throw new ValidationError(`Unknown setting "${String(key)}".`)
    if (!SETTING_VALIDATORS[key](value)) throw new ValidationError(`Invalid value for "${key}".`)

    ctx.settings.set(key, value as AppSettings[typeof key])
    const all = ctx.settings.getAll()
    if (key === 'theme') applyThemeSource(all.theme)
    ctx.onSettingsChanged(all, key)
    broadcast(IPC.settingsChanged, all)
    return all
  })

  handle(ctx, IPC.timerGetState, () => timer.getState())
  handle(ctx, IPC.timerStart, (input) => {
    const parsed = startInput(input)
    const state = timer.start(parsed)
    if (state.sessionType === 'focus' && state.status === 'running' && state.taskId && tasks.markStarted(state.taskId)) {
      notifyDataChanged('tasks')
    }
    return state
  })
  handle(ctx, IPC.timerPause, () => timer.pause())
  handle(ctx, IPC.timerResume, () => timer.resume())
  handle(ctx, IPC.timerToggle, () => timer.toggle())
  handle(ctx, IPC.timerSkip, () => timer.skip())
  handle(ctx, IPC.timerReset, () => timer.reset())
  handle(ctx, IPC.timerEnd, () => timer.end())
  handle(ctx, IPC.timerSetSessionType, (type) => {
    if (!isSessionType(type)) throw new ValidationError('Invalid session type.')
    return timer.setSessionType(type)
  })
  handle(ctx, IPC.timerSetTask, (taskId) => timer.setTask(optionalTaskId(taskId) ?? null))

  // ── tasks ──────────────────────────────────────────────────────────────
  handle(ctx, IPC.tasksList, (query) => tasks.list(parseTaskQuery(query)))
  handle(ctx, IPC.tasksGet, (id) => tasks.getById(requiredId(id, 'task')))
  handle(ctx, IPC.tasksCreate, (input) => {
    const task = tasks.create(parseTaskInput(input, true) as CreateTaskInput)
    notifyDataChanged('tasks')
    return task
  })
  handle(ctx, IPC.tasksUpdate, (id, input) => {
    const task = tasks.update(requiredId(id, 'task'), parseTaskInput(input, false))
    notifyDataChanged('tasks')
    // Keep the timer's task title in step with renames.
    const t = timer.getState()
    if (t.taskId === task.id && t.taskTitle !== task.title) timer.setTask(task.id)
    return task
  })
  handle(ctx, IPC.tasksDelete, (id) => {
    const taskId = requiredId(id, 'task')
    tasks.delete(taskId)
    const t = timer.getState()
    if (t.taskId === taskId && t.status === 'idle') timer.setTask(null)
    notifyDataChanged('tasks')
  })

  // ── subjects ───────────────────────────────────────────────────────────
  handle(ctx, IPC.subjectsList, () => subjects.list())
  handle(ctx, IPC.subjectsCreate, (input) => {
    const subject = subjects.create(parseSubjectInput(input, true) as CreateSubjectInput)
    notifyDataChanged('subjects')
    return subject
  })
  handle(ctx, IPC.subjectsUpdate, (id, input) => {
    const subject = subjects.update(requiredId(id, 'subject'), parseSubjectInput(input, false))
    notifyDataChanged('subjects')
    return subject
  })
  handle(ctx, IPC.subjectsDelete, (id, reassignTo) => {
    const target = reassignTo === null || reassignTo === undefined ? null : requiredId(reassignTo, 'subject')
    subjects.delete(requiredId(id, 'subject'), target)
    notifyDataChanged('subjects')
    notifyDataChanged('tasks')
  })

  // ── planner ────────────────────────────────────────────────────────────
  handle(ctx, IPC.plannerGetRange, (from, days) => {
    if (!isDateString(from)) throw new ValidationError('Invalid date.')
    if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > MAX_PLAN_DAYS) {
      throw new ValidationError('Invalid number of days.')
    }
    return planner.getRange(from, days)
  })
  handle(ctx, IPC.blocksCreate, (input) => {
    const block = planner.createBlock(parseTimeBlockInput(input, false) as TimeBlockInput)
    notifyDataChanged('blocks')
    return block
  })
  handle(ctx, IPC.blocksUpdate, (id, input) => {
    const block = planner.updateBlock(requiredId(id, 'block'), parseTimeBlockInput(input, true))
    notifyDataChanged('blocks')
    return block
  })
  handle(ctx, IPC.blocksDelete, (id) => {
    planner.deleteBlock(requiredId(id, 'block'))
    notifyDataChanged('blocks')
  })

  // ── statistics and focus quality ───────────────────────────────────────
  handle(ctx, IPC.statsGet, (range) => {
    const s = ctx.settings.getAll()
    return statistics.get(parseDateRange(range), {
      goalMinutes: s.dailyGoalMinutes,
      streakMinimumMinutes: s.streakMinimumMinutes
    })
  })
  handle(ctx, IPC.sessionsRate, (id, rating, note) => {
    const parsed = parseRating(rating, note)
    if (!sessions.rate(requiredId(id, 'session'), parsed.rating, parsed.note)) {
      throw new ValidationError('That focus session could not be found.')
    }
    notifyDataChanged('sessions')
  })
}
