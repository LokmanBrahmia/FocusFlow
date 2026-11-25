import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { getSchemaVersion, runMigrations } from './migrations'

export type DB = Database.Database

/**
 * Opens (or creates) the SQLite database and brings its schema up to date.
 * Pass ':memory:' for tests.
 */
export function openDatabase(filePath: string): DB {
  if (filePath !== ':memory:') mkdirSync(dirname(filePath), { recursive: true })

  const db = new Database(filePath)
  try {
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('busy_timeout = 5000')
    db.pragma('synchronous = NORMAL')
    runMigrations(db)
  } catch (err) {
    db.close()
    throw err
  }
  return db
}

export function describeDatabase(db: DB): { schemaVersion: number; sqliteVersion: string } {
  const { v } = db.prepare('SELECT sqlite_version() AS v').get() as { v: string }
  return { schemaVersion: getSchemaVersion(db), sqliteVersion: v }
}
