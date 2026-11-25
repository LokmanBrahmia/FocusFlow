/**
 * Explicit IPC channel names and the result envelope used across the bridge.
 * Every channel the renderer can reach is listed here; nothing else is exposed.
 */

export const IPC = {
  appGetInfo: 'app:get-info',
  appGetCapabilities: 'app:get-capabilities',
  appOpenMiniTimer: 'app:open-mini-timer',
  appCloseMiniTimer: 'app:close-mini-timer',
  appShowMainWindow: 'app:show-main-window',
  appMiniTimerChanged: 'app:mini-timer-changed',

  settingsGetAll: 'settings:get-all',
  settingsUpdate: 'settings:update',
  settingsChanged: 'settings:changed',

  timerGetState: 'timer:get-state',
  timerStart: 'timer:start',
  timerPause: 'timer:pause',
  timerResume: 'timer:resume',
  timerToggle: 'timer:toggle',
  timerSkip: 'timer:skip',
  timerReset: 'timer:reset',
  timerEnd: 'timer:end',
  timerSetSessionType: 'timer:set-session-type',
  timerSetTask: 'timer:set-task',
  timerStateChanged: 'timer:state-changed',
  timerEvent: 'timer:event',

  tasksList: 'tasks:list',
  tasksGet: 'tasks:get',
  tasksCreate: 'tasks:create',
  tasksUpdate: 'tasks:update',
  tasksDelete: 'tasks:delete',

  subjectsList: 'subjects:list',
  subjectsCreate: 'subjects:create',
  subjectsUpdate: 'subjects:update',
  subjectsDelete: 'subjects:delete',

  plannerGetRange: 'planner:get-range',
  blocksCreate: 'blocks:create',
  blocksUpdate: 'blocks:update',
  blocksDelete: 'blocks:delete',

  statsGet: 'stats:get',
  sessionsRate: 'sessions:rate',

  dataExport: 'data:export',
  dataBackup: 'data:backup',
  dataPrepareImport: 'data:prepare-import',
  dataPrepareRestore: 'data:prepare-restore',
  dataConfirmReplace: 'data:confirm-replace',
  dataCancelReplace: 'data:cancel-replace',
  appOpenLogFolder: 'app:open-log-folder',

  /** Pushed after any change to tasks, subjects or recorded sessions. */
  dataChanged: 'data:changed'
} as const

export type DataEntity = 'tasks' | 'subjects' | 'sessions' | 'blocks'

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

/** Errors cross the bridge as plain data so the renderer can show a message. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

export interface IpcError {
  code: 'VALIDATION' | 'NOT_FOUND' | 'DATABASE' | 'INTERNAL'
  message: string
}

/** Platform features the Settings page can offer. */
export interface AppCapabilities {
  launchOnStartup: { supported: boolean; reason?: string }
  tray: { supported: boolean; reason?: string }
}

export interface AppInfo {
  version: string
  platform: string
  electronVersion: string
  databasePath: string
  schemaVersion: number
  sqliteVersion: string
  logFile: string
}
