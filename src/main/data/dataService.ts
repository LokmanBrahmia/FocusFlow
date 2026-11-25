import Database from 'better-sqlite3'
import { copyFileSync, rmSync } from 'node:fs'
import { openDatabase, type DB } from '../database/database'
import { getSchemaVersion, runMigrations, MIGRATIONS } from '../database/migrations'
import { EXPORT_FORMAT, EXPORT_VERSION, type DataCounts, type ExportFile, type Row } from '@shared/data'
import { SETTING_VALIDATORS, isSettingKey } from '@shared/settings'
import { InputError } from '@shared/tasks'

/**
 * Tables that hold user data, in insertion order (parents first). Deletion
 * runs in reverse. app_state (the running timer) is deliberately excluded.
 */
const TABLES = [
  { table: 'subjects', key: 'subjects' },
  { table: 'tasks', key: 'tasks' },
  { table: 'focus_sessions', key: 'focusSessions' },
  { table: 'time_blocks', key: 'timeBlocks' }
] as const

export const MAX_IMPORT_BYTES = 50 * 1024 * 1024

function columnsOf(db: DB, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
}

export function countRows(db: DB): DataCounts {
  const n = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n
  return { subjects: n('subjects'), tasks: n('tasks'), sessions: n('focus_sessions'), blocks: n('time_blocks') }
}

// ── export ──────────────────────────────────────────────────────────────────

export function exportData(db: DB, appVersion: string, now = new Date()): ExportFile {
  const rows = (table: string): Row[] => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as Row[]
  const settings: Record<string, unknown> = {}
  for (const { key, value } of db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]) {
    try {
      settings[key] = JSON.parse(value)
    } catch {
      /* corrupted values are not exported */
    }
  }
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    schemaVersion: getSchemaVersion(db),
    exportedAt: now.toISOString(),
    appVersion,
    data: {
      subjects: rows('subjects'),
      tasks: rows('tasks'),
      focusSessions: rows('focus_sessions'),
      timeBlocks: rows('time_blocks'),
      settings
    }
  }
}

// ── import (JSON) ───────────────────────────────────────────────────────────

/**
 * Validates an export file by loading it into a fresh in-memory database
 * with every constraint (types, CHECKs, foreign keys) enforced. The live
 * database is not touched. Returns the staging database on success.
 */
export function stageImport(raw: unknown): { db: DB; skippedSettings: number; exportedAt: string | null } {
  if (typeof raw !== 'object' || raw === null) throw new InputError('This is not a FocusFlow export file.')
  const file = raw as Partial<ExportFile>
  if (file.format !== EXPORT_FORMAT || typeof file.data !== 'object' || file.data === null) {
    throw new InputError('This is not a FocusFlow export file.')
  }
  if (typeof file.version !== 'number' || file.version > EXPORT_VERSION) {
    throw new InputError('This file was made by a newer version of FocusFlow. Update the app to import it.')
  }
  const latest = MIGRATIONS[MIGRATIONS.length - 1].version
  if (typeof file.schemaVersion === 'number' && file.schemaVersion > latest) {
    throw new InputError('This file was made by a newer version of FocusFlow. Update the app to import it.')
  }

  const db = openDatabase(':memory:')
  try {
    const load = db.transaction(() => {
      for (const { table, key } of TABLES) {
        const rows = (file.data as Record<string, unknown>)[key]
        if (rows === undefined) continue
        if (!Array.isArray(rows)) throw new InputError(`The file's ${key} section is not a list.`)
        const allowed = new Set(columnsOf(db, table))
        rows.forEach((row, i) => {
          if (typeof row !== 'object' || row === null || Array.isArray(row)) {
            throw new InputError(`Entry ${i + 1} in ${key} is not valid.`)
          }
          const cols = Object.keys(row).filter((c) => allowed.has(c))
          for (const c of cols) {
            const v = (row as Row)[c]
            if (v !== null && typeof v !== 'string' && typeof v !== 'number') {
              throw new InputError(`Entry ${i + 1} in ${key} has an invalid "${c}".`)
            }
          }
          if (!cols.includes('id')) throw new InputError(`Entry ${i + 1} in ${key} has no id.`)
          try {
            db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`).run(
              Object.fromEntries(cols.map((c) => [c, (row as Row)[c]]))
            )
          } catch (err) {
            const reason = err instanceof Error ? err.message.replace(/^SQLITE_\w+: /, '') : 'invalid data'
            throw new InputError(`Entry ${i + 1} in ${key} is not valid (${reason}).`)
          }
        })
      }
    })
    load()
    // Foreign keys are checked per statement; this catches anything deferred.
    if ((db.pragma('foreign_key_check') as unknown[]).length > 0) {
      throw new InputError('The file refers to tasks or subjects that are not in it.')
    }

    let skipped = 0
    const settings = (file.data as { settings?: unknown }).settings
    if (settings !== undefined && (typeof settings !== 'object' || settings === null || Array.isArray(settings))) {
      throw new InputError("The file's settings section is not valid.")
    }
    const put = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
    for (const [key, value] of Object.entries((settings ?? {}) as Record<string, unknown>)) {
      if (isSettingKey(key) && SETTING_VALIDATORS[key](value)) put.run(key, JSON.stringify(value))
      else skipped += 1
    }
    return { db, skippedSettings: skipped, exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null }
  } catch (err) {
    db.close()
    throw err
  }
}

// ── backup and restore ──────────────────────────────────────────────────────

/** Consistent copy of the live database using SQLite's online backup API. */
export async function backupTo(db: DB, destination: string): Promise<void> {
  await db.backup(destination)
}

/**
 * Opens a private copy of a backup file, checks that it is a healthy
 * FocusFlow database and migrates the copy to the current schema. The
 * chosen file itself is never modified.
 */
export function stageRestore(source: string, workingCopy: string): DB {
  copyFileSync(source, workingCopy)
  let db: DB | null = null
  try {
    db = new Database(workingCopy, { fileMustExist: true })
    db.pragma('foreign_keys = ON')
    const ok = db.pragma('integrity_check', { simple: true })
    if (ok !== 'ok') throw new InputError('This backup is damaged and cannot be restored.')
    const hasMigrations = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get()
    if (!hasMigrations) throw new InputError('This file is not a FocusFlow backup.')
    const latest = MIGRATIONS[MIGRATIONS.length - 1].version
    if (getSchemaVersion(db) > latest) {
      throw new InputError('This backup was made by a newer version of FocusFlow. Update the app to restore it.')
    }
    runMigrations(db)
    return db
  } catch (err) {
    db?.close()
    rmSync(workingCopy, { force: true })
    if (err instanceof InputError) throw err
    throw new InputError('This file is not a FocusFlow backup.')
  }
}

// ── replace ─────────────────────────────────────────────────────────────────

/** Replaces every user-data table in `live` with the contents of `source`, atomically. */
export function replaceAll(live: DB, source: DB): DataCounts {
  const run = live.transaction(() => {
    for (const { table } of [...TABLES].reverse()) live.prepare(`DELETE FROM ${table}`).run()
    live.prepare('DELETE FROM settings').run()

    for (const { table } of [...TABLES, { table: 'settings' }]) {
      const cols = columnsOf(live, table)
      const sourceCols = new Set(columnsOf(source, table))
      const shared = cols.filter((c) => sourceCols.has(c))
      const insert = live.prepare(`INSERT INTO ${table} (${shared.join(', ')}) VALUES (${shared.map(() => '?').join(', ')})`)
      for (const row of source.prepare(`SELECT ${shared.join(', ')} FROM ${table}`).raw().iterate()) {
        insert.run(...(row as unknown[]))
      }
    }
    if ((live.pragma('foreign_key_check') as unknown[]).length > 0) {
      throw new InputError('The data could not be restored because it is inconsistent.')
    }
  })
  run()
  return countRows(live)
}
