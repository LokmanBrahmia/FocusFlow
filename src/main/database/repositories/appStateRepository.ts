import type { DB } from '../database'

export class AppStateRepository {
  private readonly getStmt
  private readonly setStmt

  constructor(db: DB) {
    this.getStmt = db.prepare('SELECT value FROM app_state WHERE key = ?')
    this.setStmt = db.prepare(`
      INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
  }

  /** Parsed JSON value, or undefined when missing or unreadable. */
  get(key: string): unknown {
    const row = this.getStmt.get(key) as { value: string } | undefined
    if (!row) return undefined
    try {
      return JSON.parse(row.value)
    } catch {
      return undefined
    }
  }

  set(key: string, value: unknown): void {
    this.setStmt.run(key, JSON.stringify(value), new Date().toISOString())
  }
}
