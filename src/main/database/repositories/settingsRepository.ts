import type { DB } from '../database'
import {
  DEFAULT_SETTINGS,
  SETTING_VALIDATORS,
  isSettingKey,
  type AppSettings,
  type SettingKey
} from '@shared/settings'

export class SettingsRepository {
  private readonly selectAll
  private readonly upsert

  constructor(db: DB) {
    this.selectAll = db.prepare('SELECT key, value FROM settings')
    this.upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
    )
  }

  /**
   * Returns every setting. Stored values that fail to parse or validate are
   * ignored in favour of the default, and reported through `onInvalid`.
   */
  getAll(onInvalid?: (key: string, raw: string) => void): AppSettings {
    const result: AppSettings = { ...DEFAULT_SETTINGS }
    const rows = this.selectAll.all() as { key: string; value: string }[]

    for (const { key, value } of rows) {
      if (!isSettingKey(key)) continue
      let parsed: unknown
      try {
        parsed = JSON.parse(value)
      } catch {
        onInvalid?.(key, value)
        continue
      }
      if (SETTING_VALIDATORS[key](parsed)) {
        ;(result as Record<SettingKey, unknown>)[key] = parsed
      } else {
        onInvalid?.(key, value)
      }
    }
    return result
  }

  set<K extends SettingKey>(key: K, value: AppSettings[K]): void {
    this.upsert.run(key, JSON.stringify(value))
  }
}
