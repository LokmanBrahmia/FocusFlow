import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, type DB } from '../src/main/database/database'
import { MIGRATIONS, MigrationError, getSchemaVersion, runMigrations } from '../src/main/database/migrations'
import { SettingsRepository } from '../src/main/database/repositories/settingsRepository'
import { DEFAULT_SETTINGS } from '@shared/settings'

const open: DB[] = []
const mem = (): DB => {
  const db = openDatabase(':memory:')
  open.push(db)
  return db
}

afterEach(() => {
  while (open.length) open.pop()?.close()
})

describe('migrations', () => {
  it('creates every table at the latest schema version', () => {
    const db = mem()
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
        name: string
      }[]
    ).map((r) => r.name)

    expect(tables).toEqual(
      expect.arrayContaining(['focus_sessions', 'schema_migrations', 'settings', 'subjects', 'tasks', 'time_blocks'])
    )
    expect(getSchemaVersion(db)).toBe(MIGRATIONS.at(-1)?.version)
  })

  it('is idempotent across restarts of a file database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'focusflow-'))
    try {
      const file = join(dir, 'nested', 'focusflow.sqlite')
      openDatabase(file).close()
      const db = openDatabase(file)
      const count = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get() as { n: number }
      expect(count.n).toBe(MIGRATIONS.length)
      db.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rolls back a failing migration and keeps the previous version', () => {
    const db = mem()
    const before = getSchemaVersion(db)
    const broken = {
      version: before + 1,
      name: 'broken',
      up: (d: DB) => {
        d.exec('CREATE TABLE half_done (id INTEGER)')
        d.exec('THIS IS NOT SQL')
      }
    }
    expect(() => runMigrations(db, [...MIGRATIONS, broken])).toThrow(MigrationError)
    expect(getSchemaVersion(db)).toBe(before)
    const leftover = db.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").get()
    expect(leftover).toBeUndefined()
  })

  it('enforces foreign keys and keeps sessions when a task is deleted', () => {
    const db = mem()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO tasks (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
    ).run('t1', 'Read chapter 4', now, now)
    db.prepare(
      `INSERT INTO focus_sessions (id, task_id, task_title, session_type, started_at, ended_at,
        planned_duration_seconds, actual_duration_seconds, status)
       VALUES ('s1', 't1', 'Read chapter 4', 'focus', ?, ?, 1500, 1500, 'completed')`
    ).run(now, now)

    expect(() =>
      db.prepare("INSERT INTO tasks (id, title, subject_id, created_at, updated_at) VALUES ('t2', 'x', 'missing', ?, ?)").run(now, now)
    ).toThrow(/FOREIGN KEY/)

    db.prepare("DELETE FROM tasks WHERE id = 't1'").run()
    const session = db.prepare("SELECT task_id, task_title FROM focus_sessions WHERE id = 's1'").get()
    expect(session).toEqual({ task_id: null, task_title: 'Read chapter 4' })
  })

  it('rejects invalid enum values', () => {
    const db = mem()
    const now = new Date().toISOString()
    expect(() =>
      db.prepare("INSERT INTO tasks (id, title, priority, created_at, updated_at) VALUES ('t', 'x', 'urgent', ?, ?)").run(now, now)
    ).toThrow(/CHECK/)
  })
})

describe('SettingsRepository', () => {
  it('returns defaults for an empty database', () => {
    expect(new SettingsRepository(mem()).getAll()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists values', () => {
    const repo = new SettingsRepository(mem())
    repo.set('theme', 'light')
    repo.set('dailyGoalMinutes', 90)
    expect(repo.getAll()).toMatchObject({ theme: 'light', dailyGoalMinutes: 90 })
  })

  it('falls back to defaults for corrupted or invalid stored values', () => {
    const db = mem()
    db.prepare("INSERT INTO settings (key, value) VALUES ('theme', '{not json'), ('focusDurationMinutes', '-4'), ('unknownKey', '1')").run()
    const invalid: string[] = []
    const all = new SettingsRepository(db).getAll((key) => invalid.push(key))
    expect(all.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(all.focusDurationMinutes).toBe(DEFAULT_SETTINGS.focusDurationMinutes)
    expect(invalid.sort()).toEqual(['focusDurationMinutes', 'theme'])
    expect(all).not.toHaveProperty('unknownKey')
  })
})
