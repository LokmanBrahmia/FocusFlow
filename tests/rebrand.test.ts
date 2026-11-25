import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { DATABASE_FILE, resolveUserDataDir } from '../src/main/system/userDataDir'
import { BRAND } from '@shared/brand'
import { EXPORT_FORMAT } from '@shared/data'
import { releaseToUpdate } from '@shared/updates'

const APPDATA = '/home/u/.config'
const names = { current: BRAND.name, legacy: BRAND.legacyName }
const has = (...paths: string[]) => (p: string) => paths.includes(p)

describe('user data folder after the FocusFlow → Azm rename', () => {
  it('keeps using an existing FocusFlow folder when Azm has no data yet', () => {
    const r = resolveUserDataDir(APPDATA, names, has(join(APPDATA, 'FocusFlow', DATABASE_FILE)))
    expect(r).toEqual({ dir: join(APPDATA, 'FocusFlow'), legacy: true })
  })

  it('uses the Azm folder for a fresh install', () => {
    expect(resolveUserDataDir(APPDATA, names, has())).toEqual({ dir: join(APPDATA, 'Azm'), legacy: false })
  })

  it('prefers the Azm folder once it holds data', () => {
    const both = has(join(APPDATA, 'Azm', DATABASE_FILE), join(APPDATA, 'FocusFlow', DATABASE_FILE))
    expect(resolveUserDataDir(APPDATA, names, both).dir).toBe(join(APPDATA, 'Azm'))
  })

  it('ignores a FocusFlow folder that has no database (e.g. only logs)', () => {
    const r = resolveUserDataDir(APPDATA, names, has(join(APPDATA, 'FocusFlow')))
    expect(r.dir).toBe(join(APPDATA, 'Azm'))
  })

  it('keeps the database file name and export format that existing data uses', () => {
    expect(DATABASE_FILE).toBe('focusflow.sqlite')
    expect(EXPORT_FORMAT).toBe('focusflow-export')
  })
})

describe('brand', () => {
  it('uses the agreed names and taglines', () => {
    expect(BRAND.name).toBe('Azm')
    expect(BRAND.nameAr).toBe('عَزم')
    expect(BRAND.nameAr.normalize('NFC')).toContain('َ') // fatha on the ʿayn
    expect(BRAND.tagline).toBe('Steady focus. Meaningful progress.')
  })
})

describe('update checks across the rename', () => {
  const REPO = 'LokmanBrahmia/FocusFlow'
  const release = (prefix: string) => ({
    tag_name: 'v0.3.0',
    html_url: `https://github.com/${REPO}/releases/tag/v0.3.0`,
    draft: false,
    prerelease: false,
    assets: [`${prefix}-0.3.0.x86_64.rpm`, `${prefix}-0.3.0_amd64.deb`, `${prefix}-Setup-0.3.0.exe`].map((name) => ({
      name,
      browser_download_url: `https://github.com/${REPO}/releases/download/v0.3.0/${name}`
    }))
  })

  it('finds Azm-named packages for installs that started as FocusFlow', () => {
    expect(releaseToUpdate(release('Azm'), REPO, '0.2.0', 'rpm')).toMatchObject({
      assetName: 'Azm-0.3.0.x86_64.rpm',
      installCommand: 'sudo dnf install ./Azm-0.3.0.x86_64.rpm'
    })
    expect(releaseToUpdate(release('Azm'), REPO, '0.2.0', 'deb')?.assetName).toBe('Azm-0.3.0_amd64.deb')
  })
})
