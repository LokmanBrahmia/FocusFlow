import type Database from 'better-sqlite3'
import { migration001Initial } from './001_initial'
import { migration002AppState } from './002_app_state'
import { migration003SessionSubject } from './003_session_subject'

export interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
}

/** Ordered list of every schema migration. Append only; never edit a shipped one. */
export const MIGRATIONS: readonly Migration[] = [migration001Initial, migration002AppState, migration003SessionSubject]

export class MigrationError extends Error {
  constructor(
    readonly migration: Migration,
    cause: unknown
  ) {
    super(
      `Migration ${migration.version} (${migration.name}) failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      { cause }
    )
    this.name = 'MigrationError'
  }
}

export function getSchemaVersion(db: Database.Database): number {
  const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as
    | { version: number | null }
    | undefined
  return row?.version ?? 0
}

/**
 * Applies pending migrations, each inside its own transaction, so a failure
 * leaves the database at the last fully applied version.
 */
export function runMigrations(
  db: Database.Database,
  migrations: readonly Migration[] = MIGRATIONS
): { from: number; to: number } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      applied_at TEXT    NOT NULL
    )
  `)

  const from = getSchemaVersion(db)
  const sorted = [...migrations].sort((a, b) => a.version - b.version)
  const record = db.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
  )

  for (const migration of sorted) {
    if (migration.version <= from) continue
    const apply = db.transaction(() => {
      migration.up(db)
      record.run(migration.version, migration.name, new Date().toISOString())
    })
    try {
      apply()
    } catch (err) {
      throw new MigrationError(migration, err)
    }
  }

  return { from, to: getSchemaVersion(db) }
}
