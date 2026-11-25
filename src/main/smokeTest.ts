import { app } from 'electron'
import { existsSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describeDatabase, openDatabase } from './database/database'
import { SettingsRepository } from './database/repositories/settingsRepository'
import { TaskRepository } from './database/repositories/taskRepository'
import { backupTo } from './data/dataService'
import { createMainWindow } from './windows/mainWindow'
import { detectPackageFormat } from './updates/backends'

/**
 * `focusflow --smoke-test` checks that a packaged build works on this
 * machine, then exits 0 (pass) or 1 (fail). It always runs in a fresh
 * temporary profile (see index.ts), so it never touches real data. The
 * profile is left in the OS temp folder: Chromium keeps writing to it
 * while shutting down, after any cleanup code could run.
 *
 * Checks: native SQLite loads, migrations run, data can be written and read
 * back in the user data directory, a backup can be taken, and the renderer
 * loads with the preload bridge (window.desktop) available.
 */
export async function runSmokeTest(): Promise<void> {
  const results: Record<string, unknown> = {}
  const finish = (ok: boolean, error?: unknown): void => {
    const line = JSON.stringify({ ok, ...results, error: error instanceof Error ? error.message : error })
    process.stdout.write(`FOCUSFLOW_SMOKE ${line}\n`)
    // Windows GUI apps have no console, so CI can ask for the result in a file.
    if (process.env.FOCUSFLOW_SMOKE_REPORT) {
      try {
        writeFileSync(process.env.FOCUSFLOW_SMOKE_REPORT, line, 'utf8')
      } catch {
        /* the exit code still reports the result */
      }
    }
    app.exit(ok ? 0 : 1)
  }
  const timeout = setTimeout(() => finish(false, 'Timed out after 60 s'), 60_000)

  try {
    await app.whenReady()
    const userData = app.getPath('userData')
    results.userData = userData
    results.packaged = app.isPackaged
    results.version = app.getVersion()
    // How updates will be offered on this install (deb/rpm → release link, nsis → in-app).
    results.updateFormat = detectPackageFormat()

    const dbPath = join(userData, 'focusflow.sqlite')
    const db = openDatabase(dbPath)
    Object.assign(results, describeDatabase(db))

    new SettingsRepository(db).set('dailyGoalMinutes', 95)
    const task = new TaskRepository(db).create({ title: 'Smoke test task' })
    const readBack = new TaskRepository(db).getById(task.id)
    if (readBack?.title !== 'Smoke test task') throw new Error('Task did not read back')
    if (new SettingsRepository(db).getAll().dailyGoalMinutes !== 95) throw new Error('Setting did not read back')
    results.database = 'read/write ok'

    const backupPath = join(userData, 'smoke-backup.sqlite')
    await backupTo(db, backupPath)
    if (!existsSync(backupPath) || statSync(backupPath).size === 0) throw new Error('Backup was not written')
    results.backup = 'ok'

    // Load the real UI hidden and check the preload bridge reached it.
    const win = createMainWindow({ show: false })
    await new Promise<void>((resolve, reject) => {
      win.webContents.once('did-finish-load', () => resolve())
      win.webContents.once('did-fail-load', (_e, code, desc) => reject(new Error(`Renderer failed to load: ${code} ${desc}`)))
    })
    const bridge = await win.webContents.executeJavaScript(
      "typeof window.desktop === 'object' && typeof window.desktop.tasks?.list === 'function' && typeof require === 'undefined'"
    )
    if (bridge !== true) throw new Error('Preload bridge missing, or Node is exposed to the renderer')
    results.renderer = 'loaded, bridge ok, no Node in renderer'
    win.destroy()
    db.close()

    clearTimeout(timeout)
    finish(true)
  } catch (err) {
    clearTimeout(timeout)
    finish(false, err)
  }
}

export function isSmokeTest(): boolean {
  return process.argv.includes('--smoke-test')
}

