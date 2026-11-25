import type { AppCapabilities, AppInfo, DataEntity } from '@shared/ipc'
import type { FileResult, ReplacePreview, ReplaceResult } from '@shared/data'
import type {
  CreateSubjectInput,
  CreateTaskInput,
  Subject,
  Task,
  TaskList,
  TaskQuery,
  UpdateSubjectInput,
  UpdateTaskInput
} from '@shared/tasks'
import type { AppSettings, SettingKey } from '@shared/settings'
import type { DayPlan, TimeBlock, TimeBlockInput } from '@shared/planner'
import type { DateRange, Statistics } from '@shared/statistics'
import type { UpdateState } from '@shared/updates'
import type { SessionType, StartTimerInput, TimerEvent, TimerState } from '@shared/timer'

/**
 * The complete surface the renderer can call. It grows phase by phase;
 * nothing outside it is reachable.
 */
export interface DesktopAPI {
  app: {
    getInfo(): Promise<AppInfo>
    getCapabilities(): Promise<AppCapabilities>
    openLogFolder(): Promise<void>
    openMiniTimer(): Promise<void>
    closeMiniTimer(): Promise<void>
    showMainWindow(): Promise<void>
    onMiniTimerChange(callback: (open: boolean) => void): () => void
  }
  settings: {
    getAll(): Promise<AppSettings>
    update<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<AppSettings>
    onChange(callback: (settings: AppSettings) => void): () => void
  }
  timer: {
    getState(): Promise<TimerState>
    start(input?: StartTimerInput): Promise<TimerState>
    pause(): Promise<TimerState>
    resume(): Promise<TimerState>
    toggle(): Promise<TimerState>
    skip(): Promise<TimerState>
    reset(): Promise<TimerState>
    end(): Promise<TimerState>
    setSessionType(type: SessionType): Promise<TimerState>
    setTask(taskId: string | null): Promise<TimerState>
    onStateChange(callback: (state: TimerState) => void): () => void
    onEvent(callback: (event: TimerEvent) => void): () => void
  }
  tasks: {
    list(query?: TaskQuery): Promise<TaskList>
    getById(id: string): Promise<Task | null>
    create(input: CreateTaskInput): Promise<Task>
    update(id: string, input: UpdateTaskInput): Promise<Task>
    delete(id: string): Promise<void>
  }
  subjects: {
    getAll(): Promise<Subject[]>
    create(input: CreateSubjectInput): Promise<Subject>
    update(id: string, input: UpdateSubjectInput): Promise<Subject>
    /** Tasks move to `reassignTo`, or become unassigned when null. */
    delete(id: string, reassignTo: string | null): Promise<void>
  }
  planner: {
    /** Plans for `days` consecutive days starting at `from` (YYYY-MM-DD). */
    getRange(from: string, days: number): Promise<DayPlan[]>
    createBlock(input: TimeBlockInput): Promise<TimeBlock>
    updateBlock(id: string, input: Partial<TimeBlockInput>): Promise<TimeBlock>
    deleteBlock(id: string): Promise<void>
  }
  stats: {
    get(range: DateRange): Promise<Statistics>
  }
  sessions: {
    /** Stores a 1–5 focus rating (or null to clear) and an optional note. */
    rate(id: string, rating: number | null, note: string | null): Promise<void>
  }
  data: {
    /** Each opens a native file dialog; `saved: false` means the user cancelled. */
    exportJson(): Promise<FileResult>
    backup(): Promise<FileResult>
    /** Validates a chosen file without changing anything; null if cancelled. */
    prepareImport(): Promise<ReplacePreview | null>
    prepareRestore(): Promise<ReplacePreview | null>
    /** Replaces all data with the prepared file, after an automatic safety backup. */
    confirmReplace(token: string): Promise<ReplaceResult>
    cancelReplace(token: string): Promise<void>
  }
  updates: {
    getState(): Promise<UpdateState>
    /** Manual check: errors are reported in the returned state. */
    check(): Promise<UpdateState>
    /** "Later": hide the notice for this version for the rest of the session. */
    dismiss(version: string): Promise<UpdateState>
    /** Windows only: download the verified installer. */
    download(): Promise<UpdateState>
    /** Windows only: quit and install. Refused during a focus session unless acknowledged. */
    install(options?: { acknowledgeActiveSession?: boolean }): Promise<void>
    /** Windows only: install the downloaded update the next time Azm quits. */
    setInstallOnQuit(enabled: boolean): Promise<UpdateState>
    /** Opens an Azm release page or file on github.com in the browser. */
    openRelease(url: string): Promise<void>
    onStateChange(callback: (state: UpdateState) => void): () => void
  }
  /** Fires after tasks, subjects or sessions change in any window. */
  onDataChanged(callback: (entity: DataEntity) => void): () => void
  platform: string
}
