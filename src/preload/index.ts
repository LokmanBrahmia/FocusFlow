import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type DataEntity, type IpcResult } from '@shared/ipc'
import type { AppSettings } from '@shared/settings'
import type { TimerEvent, TimerState } from '@shared/timer'
import type { DesktopAPI } from './api'

/** Unwraps the result envelope so the renderer receives data or a thrown Error. */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (result.ok) return result.data
  // contextBridge copies only an Error's message, so that is what the renderer shows.
  throw new Error(result.error.message)
}

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: DesktopAPI = {
  app: {
    getInfo: () => invoke(IPC.appGetInfo),
    getCapabilities: () => invoke(IPC.appGetCapabilities),
    openLogFolder: () => invoke(IPC.appOpenLogFolder),
    openMiniTimer: () => invoke(IPC.appOpenMiniTimer),
    closeMiniTimer: () => invoke(IPC.appCloseMiniTimer),
    showMainWindow: () => invoke(IPC.appShowMainWindow),
    onMiniTimerChange: (cb) => subscribe<boolean>(IPC.appMiniTimerChanged, cb)
  },
  settings: {
    getAll: () => invoke(IPC.settingsGetAll),
    update: (key, value) => invoke(IPC.settingsUpdate, key, value),
    onChange: (cb) => subscribe<AppSettings>(IPC.settingsChanged, cb)
  },
  timer: {
    getState: () => invoke(IPC.timerGetState),
    start: (input) => invoke(IPC.timerStart, input ?? {}),
    pause: () => invoke(IPC.timerPause),
    resume: () => invoke(IPC.timerResume),
    toggle: () => invoke(IPC.timerToggle),
    skip: () => invoke(IPC.timerSkip),
    reset: () => invoke(IPC.timerReset),
    end: () => invoke(IPC.timerEnd),
    setSessionType: (type) => invoke(IPC.timerSetSessionType, type),
    setTask: (taskId) => invoke(IPC.timerSetTask, taskId),
    onStateChange: (cb) => subscribe<TimerState>(IPC.timerStateChanged, cb),
    onEvent: (cb) => subscribe<TimerEvent>(IPC.timerEvent, cb)
  },
  tasks: {
    list: (query) => invoke(IPC.tasksList, query ?? {}),
    getById: (id) => invoke(IPC.tasksGet, id),
    create: (input) => invoke(IPC.tasksCreate, input),
    update: (id, input) => invoke(IPC.tasksUpdate, id, input),
    delete: (id) => invoke(IPC.tasksDelete, id)
  },
  subjects: {
    getAll: () => invoke(IPC.subjectsList),
    create: (input) => invoke(IPC.subjectsCreate, input),
    update: (id, input) => invoke(IPC.subjectsUpdate, id, input),
    delete: (id, reassignTo) => invoke(IPC.subjectsDelete, id, reassignTo)
  },
  planner: {
    getRange: (from, days) => invoke(IPC.plannerGetRange, from, days),
    createBlock: (input) => invoke(IPC.blocksCreate, input),
    updateBlock: (id, input) => invoke(IPC.blocksUpdate, id, input),
    deleteBlock: (id) => invoke(IPC.blocksDelete, id)
  },
  stats: {
    get: (range) => invoke(IPC.statsGet, range)
  },
  sessions: {
    rate: (id, rating, note) => invoke(IPC.sessionsRate, id, rating, note)
  },
  data: {
    exportJson: () => invoke(IPC.dataExport),
    backup: () => invoke(IPC.dataBackup),
    prepareImport: () => invoke(IPC.dataPrepareImport),
    prepareRestore: () => invoke(IPC.dataPrepareRestore),
    confirmReplace: (token) => invoke(IPC.dataConfirmReplace, token),
    cancelReplace: (token) => invoke(IPC.dataCancelReplace, token)
  },
  onDataChanged: (cb) => subscribe<DataEntity>(IPC.dataChanged, cb),
  platform: process.platform
}

contextBridge.exposeInMainWorld('desktop', api)
