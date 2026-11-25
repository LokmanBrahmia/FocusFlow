import type { Migration } from './index'

/** Key/value store for internal state (e.g. the running timer), separate from user settings. */
export const migration002AppState: Migration = {
  version: 2,
  name: 'app_state',
  up: (db) => {
    db.exec(`
      CREATE TABLE app_state (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)
  }
}
