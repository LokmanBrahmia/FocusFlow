import { BrowserWindow, dialog, shell, type IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { format } from 'date-fns'
import { IPC } from '@shared/ipc'
import type { FileResult, ReplacePreview, ReplaceResult } from '@shared/data'
import { InputError } from '@shared/tasks'
import type { DB } from '../database/database'
import {
  MAX_IMPORT_BYTES,
  backupTo,
  countRows,
  exportData,
  replaceAll,
  stageImport,
  stageRestore
} from '../data/dataService'
import { handle } from './handlers'
import { tl } from '@shared/i18n'

interface DataDeps {
  db: DB
  appVersion: string
  userData: string
  /** Default folder for save dialogs (the user's Documents). */
  documents: string
  logFile: string
  window: () => BrowserWindow | null
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
  /** Called after data was replaced so settings, timer and windows refresh. */
  onReplaced: () => void
}

interface Pending {
  preview: ReplacePreview
  staged: DB
  cleanup: () => void
}

const stamp = (): string => format(new Date(), 'yyyy-MM-dd_HHmmss')

export function registerDataHandlers(deps: DataDeps): void {
  const ctx = { isTrustedSender: deps.isTrustedSender }
  const pending = new Map<string, Pending>()
  const backupsDir = join(deps.userData, 'backups')

  function dropPending(token: string): void {
    const p = pending.get(token)
    if (!p) return
    pending.delete(token)
    try {
      p.staged.close()
    } catch {
      /* already closed */
    }
    p.cleanup()
  }

  async function saveDialog(title: string, defaultName: string, ext: string, label: string): Promise<string | null> {
    const win = deps.window()
    const options = {
      title,
      defaultPath: join(deps.documents, defaultName),
      filters: [{ name: label, extensions: [ext] }]
    }
    const r = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    return r.canceled || !r.filePath ? null : r.filePath
  }

  async function openDialog(title: string, ext: string[], label: string): Promise<string | null> {
    const win = deps.window()
    const options = { title, properties: ['openFile' as const], filters: [{ name: label, extensions: ext }] }
    const r = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
  }

  handle(ctx, IPC.dataExport, async (): Promise<FileResult> => {
    const path = await saveDialog(tl('dialog.export'), `azm-export-${stamp()}.json`, 'json', tl('dialog.exportFilter'))
    if (!path) return { saved: false }
    writeFileSync(path, JSON.stringify(exportData(deps.db, deps.appVersion), null, 2), 'utf8')
    return { saved: true, path }
  })

  handle(ctx, IPC.dataBackup, async (): Promise<FileResult> => {
    const path = await saveDialog(tl('dialog.backup'), `azm-backup-${stamp()}.sqlite`, 'sqlite', tl('dialog.backupFilter'))
    if (!path) return { saved: false }
    await backupTo(deps.db, path)
    return { saved: true, path }
  })

  handle(ctx, IPC.dataPrepareImport, async (): Promise<ReplacePreview | null> => {
    const path = await openDialog(tl('dialog.import'), ['json'], tl('dialog.exportFilter'))
    if (!path) return null
    if (statSync(path).size > MAX_IMPORT_BYTES) throw new InputError(tl('err.tooLarge'))
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      throw new InputError(tl('err.notJson'))
    }
    const { db, skippedSettings, exportedAt } = stageImport(parsed)
    const token = randomUUID()
    const preview: ReplacePreview = {
      token,
      kind: 'import',
      fileName: basename(path),
      incoming: countRows(db),
      current: countRows(deps.db),
      createdAt: exportedAt,
      skippedSettings
    }
    pending.set(token, { preview, staged: db, cleanup: () => {} })
    return preview
  })

  handle(ctx, IPC.dataPrepareRestore, async (): Promise<ReplacePreview | null> => {
    const path = await openDialog(tl('dialog.restore'), ['sqlite', 'db'], tl('dialog.backupFilter'))
    if (!path) return null
    mkdirSync(backupsDir, { recursive: true })
    const workingCopy = join(backupsDir, `.restore-${randomUUID()}.sqlite`)
    const db = stageRestore(path, workingCopy)
    const token = randomUUID()
    const preview: ReplacePreview = {
      token,
      kind: 'restore',
      fileName: basename(path),
      incoming: countRows(db),
      current: countRows(deps.db),
      createdAt: statSync(path).mtime.toISOString(),
      skippedSettings: 0
    }
    pending.set(token, {
      preview,
      staged: db,
      cleanup: () => {
        for (const suffix of ['', '-wal', '-shm']) rmSync(workingCopy + suffix, { force: true })
      }
    })
    return preview
  })

  handle(ctx, IPC.dataConfirmReplace, async (token): Promise<ReplaceResult> => {
    const p = typeof token === 'string' ? pending.get(token) : undefined
    if (!p) throw new InputError(tl('err.expired'))
    try {
      // Never replace data without keeping a copy of what was there.
      mkdirSync(backupsDir, { recursive: true })
      const safetyBackup = join(backupsDir, `before-${p.preview.kind}-${stamp()}.sqlite`)
      await backupTo(deps.db, safetyBackup)
      const counts = replaceAll(deps.db, p.staged)
      deps.onReplaced()
      return { safetyBackup, counts }
    } finally {
      dropPending(p.preview.token)
    }
  })

  handle(ctx, IPC.dataCancelReplace, (token) => {
    if (typeof token === 'string') dropPending(token)
  })

  handle(ctx, IPC.appOpenLogFolder, async () => {
    await shell.openPath(dirname(deps.logFile))
  })
}
