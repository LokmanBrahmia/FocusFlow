import { describe, expect, it } from 'vitest'
import { fetchLatestRelease, isRepo, pickAssets, toLatestRelease } from './release'

const asset = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  browser_download_url: `https://github.com/o/r/releases/download/v0.1.0/${name}`,
  size: 100 * 1024 * 1024,
  ...extra
})

const release = (assets: ReturnType<typeof asset>[], extra: Record<string, unknown> = {}) => ({
  tag_name: 'v0.1.0',
  html_url: 'https://github.com/o/r/releases/tag/v0.1.0',
  published_at: '2026-12-01T10:00:00Z',
  draft: false,
  prerelease: false,
  assets,
  ...extra
})

const respond = (status: number, body?: unknown): typeof fetch =>
  (async () => new Response(body === undefined ? null : JSON.stringify(body), { status })) as typeof fetch

describe('pickAssets', () => {
  it('matches each package by its file name', () => {
    const picked = pickAssets([
      asset('FocusFlow-0.1.0.x86_64.rpm'),
      asset('FocusFlow-0.1.0_amd64.deb'),
      asset('FocusFlow-Setup-0.1.0.exe'),
      asset('FocusFlow-Setup-0.1.0.exe.blockmap'),
      asset('latest.yml')
    ])
    expect(picked.rpm?.name).toBe('FocusFlow-0.1.0.x86_64.rpm')
    expect(picked.deb?.name).toBe('FocusFlow-0.1.0_amd64.deb')
    expect(picked.exe?.name).toBe('FocusFlow-Setup-0.1.0.exe')
  })

  it('returns null for a package that is missing, instead of guessing a URL', () => {
    const picked = pickAssets([asset('FocusFlow-0.1.0_amd64.deb')])
    expect(picked).toEqual({ rpm: null, deb: expect.objectContaining({ name: 'FocusFlow-0.1.0_amd64.deb' }), exe: null })
  })

  it('ignores assets whose upload did not finish', () => {
    expect(pickAssets([asset('FocusFlow-0.1.0.x86_64.rpm', { state: 'starter' })]).rpm).toBeNull()
  })
})

describe('toLatestRelease', () => {
  it('strips the v from the tag', () => {
    expect(toLatestRelease(release([]))?.version).toBe('0.1.0')
  })
  it('never treats drafts or prereleases as the stable release', () => {
    expect(toLatestRelease(release([], { draft: true }))).toBeNull()
    expect(toLatestRelease(release([], { prerelease: true }))).toBeNull()
  })
})

describe('fetchLatestRelease', () => {
  it('reports "none" when the repository has no stable release yet', async () => {
    expect(await fetchLatestRelease('o/r', respond(404))).toEqual({ status: 'none' })
  })
  it('reports rate limiting and network errors as errors, not as missing files', async () => {
    expect((await fetchLatestRelease('o/r', respond(403))).status).toBe('error')
    const failing = (async () => {
      throw new TypeError('network down')
    }) as typeof fetch
    expect((await fetchLatestRelease('o/r', failing)).status).toBe('error')
  })
  it('returns the release with its packages', async () => {
    const state = await fetchLatestRelease('o/r', respond(200, release([asset('FocusFlow-0.1.0_amd64.deb')])))
    expect(state.status).toBe('ready')
    if (state.status === 'ready') expect(state.release.assets.deb?.url).toContain('/v0.1.0/')
  })
})

describe('isRepo', () => {
  it('accepts owner/repo only', () => {
    expect(isRepo('LokmanBrahmia/FocusFlow')).toBe(true)
    expect(isRepo('https://github.com/a/b')).toBe(false)
    expect(isRepo('')).toBe(false)
    expect(isRepo(undefined)).toBe(false)
  })
})
