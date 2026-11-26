import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { CATALOGUES, formatDuration, formatTime, intlLocale, setLanguageSource, tl, translate } from '@shared/i18n'
import { en } from '@shared/i18n/en'
import { ar } from '@shared/i18n/ar'
import { DEFAULT_SETTINGS, SETTING_VALIDATORS } from '@shared/settings'
import { MIGRATIONS, runMigrations } from '../src/main/database/migrations'
import { openDatabase } from '../src/main/database/database'
import { SettingsRepository } from '../src/main/database/repositories/settingsRepository'
import { TaskRepository } from '../src/main/database/repositories/taskRepository'

const placeholders = (v: string | Record<string, string>): string[] =>
  [...new Set((typeof v === 'string' ? v : Object.values(v).join(' ')).match(/\{\w+\}/g) ?? [])].sort()

describe('catalogues', () => {
  it('Arabic has exactly the English keys', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort())
  })

  it('every Arabic message uses the same placeholders as English (count may be spelled out)', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const want = placeholders(en[key]).filter((p) => p !== '{count}')
      const got = placeholders(ar[key]).filter((p) => p !== '{count}')
      expect({ key, got }).toEqual({ key, got: want })
    }
  })

  it('no Arabic message is left in English', () => {
    // Allowed Latin: product and technical names, file names, commands, keys.
    const latin = /[A-Za-z]{3,}/g
    const allowed = new Set(['Enter', 'JSON', 'GitHub', 'Windows', 'RPM', 'DEB', 'AppImage', 'GNOME', 'AppIndicator', 'sudo', 'dnf', 'install', 'file', 'rpm', 'apt', 'deb'])
    for (const [key, value] of Object.entries(ar)) {
      const text = typeof value === 'string' ? value : Object.values(value).join(' ')
      const words = (text.replace(/<\/?b>/g, '').replace(/\{\w+\}/g, '').match(latin) ?? []).filter((w) => !allowed.has(w))
      expect({ key, words }).toEqual({ key, words: [] })
    }
  })
})

describe('translate', () => {
  it('interpolates parameters', () => {
    expect(translate('en', 'timer.endsAt', { time: '10:25' })).toBe('Ends at 10:25')
    expect(translate('ar', 'timer.endsAt', { time: '10:25' })).toBe('تنتهي عند 10:25')
  })

  it('uses all six Arabic plural forms', () => {
    const days = (n: number) => translate('ar', 'common.days', { count: n })
    expect(days(1)).toBe('يوم واحد')
    expect(days(2)).toBe('يومان')
    expect(days(3)).toBe('3 أيام')
    expect(days(11)).toBe('11 يومًا')
    expect(days(100)).toBe('100 يوم')
    expect(translate('en', 'common.days', { count: 1 })).toBe('1 day')
    expect(translate('en', 'common.days', { count: 5 })).toBe('5 days')
  })

  it('formats durations and times per language, with Western digits in Arabic', () => {
    expect(formatDuration('en', 90)).toBe('1 h 30 min')
    expect(formatDuration('en', 25)).toBe('25 min')
    expect(formatDuration('ar', 90)).toBe('1 س 30 د')
    expect(formatDuration('ar', 120)).toBe('2 س')
    expect(formatTime('ar', new Date(2026, 0, 1, 9, 5))).toBe('09:05')
    expect(intlLocale('ar')).toBe('ar-u-nu-latn')
  })

  it('main-process messages follow the language source, English by default', () => {
    expect(tl('tray.idle')).toBe('No session running')
    setLanguageSource(() => 'ar')
    expect(tl('tray.idle')).toBe('لا جلسة جارية')
    setLanguageSource(() => 'en')
  })

  it('every catalogue is registered', () => {
    expect(Object.keys(CATALOGUES).sort()).toEqual(['ar', 'en'])
  })
})

describe('default language', () => {
  it('is Arabic for new installs and accepts only ar/en', () => {
    expect(DEFAULT_SETTINGS.language).toBe('ar')
    expect(SETTING_VALIDATORS.language('ar')).toBe(true)
    expect(SETTING_VALIDATORS.language('en')).toBe(true)
    expect(SETTING_VALIDATORS.language('fr')).toBe(false)
  })

  it('a brand-new database starts in Arabic', () => {
    const db = openDatabase(':memory:')
    expect(new SettingsRepository(db).getAll().language).toBe('ar')
    db.close()
  })

  it('an existing database with the user’s work keeps English after upgrading', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db, MIGRATIONS.filter((m) => m.version <= 3))
    new TaskRepository(db).create({ title: 'Made in FocusFlow 0.2' })
    runMigrations(db)
    expect(new SettingsRepository(db).getAll().language).toBe('en')
    db.close()
  })

  it('a language the user already chose is never overwritten', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    runMigrations(db, MIGRATIONS.filter((m) => m.version <= 3))
    new SettingsRepository(db).set('language', 'ar' as never)
    new TaskRepository(db).create({ title: 'x' })
    runMigrations(db)
    expect(new SettingsRepository(db).getAll().language).toBe('ar')
    db.close()
  })
})
