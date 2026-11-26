import type { Migration } from './index'

/**
 * Arabic became the default language in 0.4.0. A database that already holds
 * the user's work was created by an English-only version, so it keeps English
 * unless the user has chosen otherwise. A brand-new database is empty when
 * this runs, so it gets the new default (Arabic). Runs exactly once per
 * database, so a language picked later is never overwritten.
 */
export const migration004LanguageDefault: Migration = {
  version: 4,
  name: 'keep_english_for_existing_installs',
  up: (db) => {
    db.exec(`
      INSERT INTO settings (key, value)
      SELECT 'language', '"en"'
       WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'language')
         AND (   EXISTS (SELECT 1 FROM tasks)
              OR EXISTS (SELECT 1 FROM subjects)
              OR EXISTS (SELECT 1 FROM focus_sessions)
              OR EXISTS (SELECT 1 FROM settings));
    `)
  }
}
