import { app, BrowserWindow, dialog, powerMonitor, session, type Rectangle } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { IPC } from '@shared/ipc'
import type { AppSettings } from '@shared/settings'
import { describeDatabase, openDatabase, type DB } from './database/database'
import { MigrationError } from './database/migrations'
import { AppStateRepository } from './database/repositories/appStateRepository'
import { FocusSessionRepository } from './database/repositories/focusSessionRepository'
import { SettingsRepository } from './database/repositories/settingsRepository'
import { TaskRepository } from './database/repositories/taskRepository'
import { SubjectRepository } from './database/repositories/subjectRepository'
import { PlannerRepository } from './database/repositories/plannerRepository'
import { StatisticsRepository } from './database/repositories/statisticsRepository'
import { applyThemeSource, broadcast, notifyDataChanged, registerIpcHandlers } from './ipc/handlers'
import { registerDataHandlers } from './ipc/dataHandlers'
import { NotificationService } from './notifications/notificationService'
import { TimerService } from './timer/timerService'
import { createMainWindow, isAllowedUrl } from './windows/mainWindow'
import { createMiniTimerWindow } from './windows/miniTimerWindow'
import { initLogger } from './system/logger'
import { applyLaunchOnStartup, launchedHidden, startupSupport } from './system/startup'
import { AppTray } from './system/tray'
import { isSmokeTest, runSmokeTest } from './smokeTest'
import { setupUpdates } from './updates/setupUpdates'
import { existsSync, mkdtempSync } from 'node:fs'
import { BRAND } from '@shared/brand'
import { DATABASE_FILE, resolveUserDataDir } from './system/userDataDir'
import { tmpdir } from 'node:os'

// Lets automated tests run against a throwaway profile. The smoke test
// always uses a fresh temporary profile so it can never touch real data.
const SMOKE = isSmokeTest()
if (process.env.FOCUSFLOW_USER_DATA) app.setPath('userData', process.env.FOCUSFLOW_USER_DATA)
else if (SMOKE) app.setPath('userData', mkdtempSync(join(tmpdir(), 'focusflow-smoke-')))
else {
  // Renamed from FocusFlow to Azm: keep using an existing FocusFlow data folder.
  const resolved = resolveUserDataDir(
    app.getPath('appData'),
    { current: BRAND.name, legacy: BRAND.legacyName },
    existsSync
  )
  app.setPath('userData', resolved.dir)
}

const TIMER_STATE_KEY = 'timer'
const WINDOW_STATE_KEY = 'window'

const userData = app.getPath('userData')
const databasePath = join(userData, DATABASE_FILE)
const logFile = initLogger(userData)
const iconDir = app.isPackaged ? join(process.resourcesPath, 'icons') : join(app.getAppPath(), 'resources', 'icons')

let db: DB | null = null
let timer: TimerService | null = null
let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null
let quitting = false

function showFatalError(title: string, err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err)
  console.error(`[fatal] ${title}:`, err)
  const advice =
    err instanceof MigrationError
      ? 'Your data has not been changed: the update stopped before modifying it.'
      : 'Your data file has not been deleted.'
  dialog.showErrorBox(title, `${detail}\n\n${advice}\n\nDatabase: ${databasePath}\nLog: ${logFile}`)
}

function hardenSessions(): void {
  // Deny every permission request except desktop notifications.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'notifications')
  })
}

const gotLock = SMOKE || app.requestSingleInstanceLock()
if (SMOKE) {
  void runSmokeTest()
} else if (!gotLock) {
  app.quit()
} else {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault())
  })

  app.whenReady().then(() => {
    try {
      db = openDatabase(databasePath)
    } catch (err) {
      showFatalError(`${BRAND.name} could not open its database`, err)
      app.exit(1)
      return
    }
    const database = db

    const settingsRepo = new SettingsRepository(database)
    const appState = new AppStateRepository(database)
    const sessions = new FocusSessionRepository(database)
    const tasks = new TaskRepository(database)
    const subjects = new SubjectRepository(database)
    const planner = new PlannerRepository(database, tasks)
    const statistics = new StatisticsRepository(database)

    const loadSettings = (): AppSettings =>
      settingsRepo.getAll((key) => console.warn(`[settings] ignored invalid stored value for "${key}"`))
    let settings = loadSettings()
    applyThemeSource(settings.theme)
    hardenSessions()

    // ── windows ─────────────────────────────────────────────────────────────
    function saveWindowState(win: BrowserWindow): void {
      try {
        appState.set(WINDOW_STATE_KEY, { bounds: win.getNormalBounds(), maximized: win.isMaximized() })
      } catch (err) {
        console.warn('[window] could not save window state:', err)
      }
    }

    function openMainWindow(show = true): void {
      const saved = appState.get(WINDOW_STATE_KEY) as { bounds?: Rectangle; maximized?: boolean } | undefined
      const behavior = settings.windowBehavior
      mainWindow = createMainWindow({
        bounds: behavior === 'remember' ? saved?.bounds : undefined,
        maximized: behavior === 'maximized' || (behavior === 'remember' && saved?.maximized === true),
        show
      })
      const win = mainWindow
      win.on('close', (event) => {
        saveWindowState(win)
        if (!quitting && settings.closeToTray && tray.active) {
          event.preventDefault()
          win.hide()
        }
      })
      win.on('closed', () => {
        mainWindow = null
        // The mini timer is a companion; it should not keep the app alive alone.
        if (!tray.active) miniWindow?.close()
      })
      // A crashed renderer is reloaded instead of leaving a blank window.
      win.webContents.on('render-process-gone', (_e, details) => {
        console.error('[renderer] process gone:', details.reason)
        if (details.reason !== 'clean-exit' && !win.isDestroyed()) win.reload()
      })
    }

    function showMainWindow(): void {
      if (!mainWindow || mainWindow.isDestroyed()) {
        openMainWindow()
        return
      }
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }

    function openMiniTimer(): void {
      if (miniWindow && !miniWindow.isDestroyed()) {
        miniWindow.showInactive()
        return
      }
      miniWindow = createMiniTimerWindow()
      miniWindow.on('closed', () => {
        miniWindow = null
        broadcast(IPC.appMiniTimerChanged, false)
      })
      broadcast(IPC.appMiniTimerChanged, true)
    }

    // ── timer ───────────────────────────────────────────────────────────────
    const notifications = new NotificationService(() => settings, showMainWindow)
    const tray = new AppTray({
      show: showMainWindow,
      toggleTimer: () => timerService.toggle(),
      quit: () => app.quit()
    })

    const timerService = new TimerService({
      now: Date.now,
      scheduler: { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as NodeJS.Timeout) },
      newId: randomUUID,
      getSettings: () => settings,
      loadSnapshot: () => appState.get(TIMER_STATE_KEY),
      saveSnapshot: (s) => {
        try {
          appState.set(TIMER_STATE_KEY, s)
        } catch (err) {
          console.error('[timer] could not persist timer state:', err)
        }
      },
      recordSession: (s) => {
        const written = sessions.record(s)
        if (written) {
          notifyDataChanged('sessions')
          if (s.taskId) notifyDataChanged('tasks')
        }
        return written
      },
      focusSecondsBetween: (from, to) => sessions.focusSecondsBetween(from, to),
      getTaskTitle: (id) => tasks.getById(id)?.title ?? null,
      onChange: (state) => {
        broadcast(IPC.timerStateChanged, state)
        tray.update(state)
      },
      onEvent: (event) => {
        notifications.handle(event)
        broadcast(IPC.timerEvent, event)
      }
    })
    timer = timerService

    function applySystemSettings(key?: keyof AppSettings): void {
      if (!key || key === 'closeToTray') {
        if (settings.closeToTray) {
          tray.enable(iconDir)
          tray.update(timerService.getState())
        } else tray.disable()
      }
      if (key === 'launchOnStartup') {
        applyLaunchOnStartup(settings.launchOnStartup).catch((err) =>
          console.error('[startup] could not update launch at login:', err)
        )
      }
    }

    // ── IPC ─────────────────────────────────────────────────────────────────
    const isTrustedSender = (event: Electron.IpcMainInvokeEvent): boolean => {
      const url = event.senderFrame?.url
      return typeof url === 'string' && isAllowedUrl(url)
    }

    registerIpcHandlers({
      settings: settingsRepo,
      timer: timerService,
      tasks,
      subjects,
      planner,
      statistics,
      sessions,
      isTrustedSender,
      onSettingsChanged: (next, key) => {
        settings = next
        timerService.refreshSettings()
        applySystemSettings(key)
      },
      openMiniTimer,
      closeMiniTimer: () => miniWindow?.close(),
      showMainWindow,
      getCapabilities: () => ({
        launchOnStartup: startupSupport(),
        tray: { supported: true }
      }),
      getAppInfo: () => ({
        version: app.getVersion(),
        platform: process.platform,
        electronVersion: process.versions.electron,
        databasePath,
        logFile,
        ...describeDatabase(database)
      })
    })

    registerDataHandlers({
      db: database,
      appVersion: app.getVersion(),
      userData,
      documents: app.getPath('documents'),
      logFile,
      window: () => mainWindow,
      isTrustedSender,
      onReplaced: () => {
        settings = loadSettings()
        applyThemeSource(settings.theme)
        // The timer keeps running; drop its task link if that task is gone.
        const t = timerService.getState()
        if (t.taskId && !tasks.getById(t.taskId) && t.status === 'idle') timerService.setTask(null)
        timerService.refreshSettings()
        applySystemSettings()
        broadcast(IPC.settingsChanged, settings)
        for (const entity of ['subjects', 'tasks', 'sessions', 'blocks'] as const) notifyDataChanged(entity)
      }
    })

    // Update checks run in the main process only; the renderer just shows state.
    void setupUpdates({
      isTrustedSender,
      autoCheckEnabled: () => settings.checkForUpdates,
      timerActive: () => timerService.getState().status !== 'idle'
    }).catch((err) => console.error('[updates] setup failed:', err))

    // Restore before any window asks for state; overdue sessions complete here.
    timerService.init()
    applySystemSettings()
    // Rewrite the login entry so it points at this install (the path changed
    // from /opt/FocusFlow to /opt/Azm with the rename).
    if (settings.launchOnStartup) {
      applyLaunchOnStartup(true).catch((err) => console.warn('[startup] could not refresh launch at login:', err))
    }

    // setTimeout can fire late (or not at all) across sleep; re-check on wake.
    powerMonitor.on('resume', () => timerService.wake())
    powerMonitor.on('unlock-screen', () => timerService.wake())

    // Started at login with close-to-tray on: stay in the tray until opened.
    openMainWindow(!(launchedHidden() && tray.active))

    app.on('second-instance', () => showMainWindow())
    app.on('activate', () => showMainWindow())
  })

  app.on('before-quit', () => {
    quitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', () => {
    timer?.dispose()
    timer = null
    db?.close()
    db = null
  })
}
