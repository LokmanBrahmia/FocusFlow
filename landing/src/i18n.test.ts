import { describe, expect, it } from 'vitest'
import { catalogues, fill, lang } from './i18n'

/** Every leaf path with its placeholders, so the two catalogues can be compared shape for shape. */
function leaves(v: unknown, path = ''): Record<string, string[]> {
  if (typeof v === 'string') return { [path]: [...new Set(v.match(/\{\w+\}/g) ?? [])].sort() }
  const out: Record<string, string[]> = {}
  for (const [k, child] of Object.entries(v as Record<string, unknown>)) Object.assign(out, leaves(child, `${path}.${k}`))
  return out
}

describe('site catalogues', () => {
  it('Arabic is the default language', () => {
    expect(lang.value).toBe('ar')
  })

  it('Arabic and English have the same entries, list lengths and placeholders', () => {
    expect(leaves(catalogues.ar)).toEqual(leaves(catalogues.en))
  })

  it('fills placeholders', () => {
    expect(fill(catalogues.ar.download.version, { version: '0.4.0' })).toBe('الإصدار 0.4.0')
    expect(fill(catalogues.en.download.version, { version: '0.4.0' })).toBe('Version 0.4.0')
  })
})
