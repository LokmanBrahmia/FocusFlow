import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, type DB } from '../src/main/database/database'
import { TaskRepository } from '../src/main/database/repositories/taskRepository'
import { SubjectRepository } from '../src/main/database/repositories/subjectRepository'
import { PlannerRepository } from '../src/main/database/repositories/plannerRepository'
import { FocusSessionRepository } from '../src/main/database/repositories/focusSessionRepository'
import { SettingsRepository } from '../src/main/database/repositories/settingsRepository'
import { backupTo, countRows, exportData, replaceAll, stageImport, stageRestore } from '../src/main/data/dataService'
import { InputError } from '@shared/tasks'

let dir: string
let db: DB

/** A small but complete dataset touching every table. */
function seed(target: DB): void {
  const subjects = new SubjectRepository(target)
  const tasks = new TaskRepository(target)
  const ml = subjects.create({ name: 'Machine Learning', color: '#2a78d6' })
  const t = tasks.create({ title: 'Backprop', subjectId: ml.id, estimatedMinutes: 60, scheduledDate: '2026-12-01' })
  tasks.create({ title: 'Unassigned' })
  new PlannerRepository(target, tasks).createBlock({ taskId: t.id, date: '2026-12-01', start: '09:00', end: '10:00' })
  new FocusSessionRepository(target).record({
    id: 'sess-1',
    taskId: t.id,
    taskTitle: 'Backprop',
    sessionType: 'focus',
    startedAt: new Date('2026-12-01T09:00:00Z'),
    endedAt: new Date('2026-12-01T09:25:00Z'),
    plannedDurationSeconds: 1500,
    actualDurationSeconds: 1500,
    status: 'completed'
  })
  new SettingsRepository(target).set('dailyGoalMinutes', 90)
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'focusflow-data-'))
  db = openDatabase(join(dir, 'live.sqlite'))
})
afterEach(() => {
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('export and import', () => {
  it('round-trips every table through JSON', () => {
    seed(db)
    const file = JSON.parse(JSON.stringify(exportData(db, '1.0.0')))
    expect(file).toMatchObject({ format: 'focusflow-export', version: 1, appVersion: '1.0.0' })

    const target = openDatabase(':memory:')
    const { db: staged } = stageImport(file)
    replaceAll(target, staged)
    expect(countRows(target)).toEqual({ subjects: 1, tasks: 2, sessions: 1, blocks: 1 })
    expect(new SettingsRepository(target).getAll().dailyGoalMinutes).toBe(90)
    expect(new TaskRepository(target).list({ search: 'Backprop' }).tasks[0].focusSeconds).toBe(1500)
    staged.close()
    target.close()
  })

  it('rejects files that are not FocusFlow exports', () => {
    expect(() => stageImport({ hello: 'world' })).toThrow(/not a FocusFlow export/)
    expect(() => stageImport(null)).toThrow(InputError)
    expect(() => stageImport({ format: 'focusflow-export', version: 99, data: {} })).toThrow(/newer version/)
  })

  it('rejects invalid rows with a readable reason', () => {
    seed(db)
    const file = exportData(db, '1')
    const bad = structuredClone(file)
    bad.data.tasks[0].priority = 'urgent'
    expect(() => stageImport(bad)).toThrow(/Entry 1 in tasks is not valid/)

    const orphan = structuredClone(file)
    orphan.data.subjects = []
    expect(() => stageImport(orphan)).toThrow(InputError)

    const wrongType = structuredClone(file) as unknown as { data: { tasks: unknown[] } }
    ;(wrongType.data.tasks[0] as Record<string, unknown>).title = { nested: true }
    expect(() => stageImport(wrongType)).toThrow(/invalid "title"/)
  })

  it('ignores unknown columns and skips invalid settings instead of failing', () => {
    seed(db)
    const file = structuredClone(exportData(db, '1')) as unknown as {
      data: { tasks: Record<string, unknown>[]; settings: Record<string, unknown> }
    }
    file.data.tasks[0].injected = 'DROP TABLE tasks'
    file.data.settings.focusDurationMinutes = -5
    file.data.settings.notASetting = true
    const { db: staged, skippedSettings } = stageImport(file)
    expect(skippedSettings).toBe(2)
    expect(countRows(staged).tasks).toBe(2)
    staged.close()
  })

  it('leaves the live database untouched when validation fails', () => {
    seed(db)
    const before = countRows(db)
    expect(() => stageImport({ format: 'focusflow-export', version: 1, data: { tasks: [{ id: 'x' }] } })).toThrow()
    expect(countRows(db)).toEqual(before)
  })
})

describe('backup and restore', () => {
  it('backs up a live database and restores it', async () => {
    seed(db)
    const backup = join(dir, 'backup.sqlite')
    await backupTo(db, backup)
    expect(existsSync(backup)).toBe(true)

    // Change the live data, then restore the backup over it.
    new TaskRepository(db).create({ title: 'Added after backup' })
    const staged = stageRestore(backup, join(dir, 'work.sqlite'))
    replaceAll(db, staged)
    staged.close()
    expect(countRows(db).tasks).toBe(2)
    expect(new TaskRepository(db).list({ search: 'Added after' }).total).toBe(0)
  })

  it('rejects files that are not FocusFlow databases', () => {
    const junk = join(dir, 'junk.sqlite')
    writeFileSync(junk, 'not a database at all')
    expect(() => stageRestore(junk, join(dir, 'work.sqlite'))).toThrow(/not a FocusFlow backup/)
    expect(existsSync(join(dir, 'work.sqlite'))).toBe(false)

    const plain = join(dir, 'plain.sqlite')
    const p = new Database(plain)
    p.exec('CREATE TABLE x (a)')
    p.close()
    expect(() => stageRestore(plain, join(dir, 'work2.sqlite'))).toThrow(/not a FocusFlow backup/)
  })

  it('replaceAll is atomic: a failure keeps the existing data', () => {
    seed(db)
    const broken = openDatabase(':memory:')
    broken.pragma('foreign_keys = OFF')
    broken.prepare("INSERT INTO tasks (id, title, subject_id, created_at, updated_at) VALUES ('t', 'x', 'missing', 'a', 'a')").run()
    expect(() => replaceAll(db, broken)).toThrow()
    expect(countRows(db)).toEqual({ subjects: 1, tasks: 2, sessions: 1, blocks: 1 })
    broken.close()
  })
})
