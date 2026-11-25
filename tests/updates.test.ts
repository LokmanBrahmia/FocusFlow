import { describe, expect, it, vi } from 'vitest'
import {
  compareVersions,
  isNewer,
  isTrustedReleaseUrl,
  releaseToUpdate,
  InvalidReleaseError,
  type AvailableUpdate,
  type UpdateState
} from '@shared/updates'
import {
  UpdateActionError,
  UpdateScheduler,
  UpdateService,
  describeError,
  type DownloadProgress,
  type UpdateBackend
} from '../src/main/updates/updateService'
import { GitHubReleaseBackend } from '../src/main/updates/backends'

const REPO = 'LokmanBrahmia/FocusFlow'
const rel = (tag: string, extra: Record<string, unknown> = {}) => ({
  tag_name: tag,
  html_url: `https://github.com/${REPO}/releases/tag/${tag}`,
  draft: false,
  prerelease: false,
  assets: [
    `FocusFlow-${tag.slice(1)}.x86_64.rpm`,
    `FocusFlow-${tag.slice(1)}_amd64.deb`,
    `FocusFlow-Setup-${tag.slice(1)}.exe`,
    'latest.yml'
  ].map((name) => ({ name, browser_download_url: `https://github.com/${REPO}/releases/download/${tag}/${name}` })),
  ...extra
})

const update = (version = '0.2.0'): AvailableUpdate => ({
  version,
  releaseUrl: `https://github.com/${REPO}/releases/tag/v${version}`,
  assetUrl: null,
  assetName: null,
  installCommand: null
})

describe('versions', () => {
  it('compares semantic versions, including prereleases', () => {
    expect(compareVersions('0.2.0', '0.1.9')).toBeGreaterThan(0)
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.0-beta.2')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-beta.10', '1.0.0-beta.2')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0)
    expect(isNewer('0.1.0', '0.1.0')).toBe(false)
    expect(() => compareVersions('latest', '1.0.0')).toThrow(/Invalid version/)
  })
})

describe('releaseToUpdate (validating GitHub release metadata)', () => {
  it('returns the newer release with the right package and command per format', () => {
    const rpm = releaseToUpdate(rel('v0.2.0'), REPO, '0.1.0', 'rpm')
    expect(rpm).toMatchObject({ version: '0.2.0', assetName: 'FocusFlow-0.2.0.x86_64.rpm', installCommand: 'sudo dnf install ./FocusFlow-0.2.0.x86_64.rpm' })
    expect(releaseToUpdate(rel('v0.2.0'), REPO, '0.1.0', 'deb')?.installCommand).toBe('sudo apt install ./FocusFlow-0.2.0_amd64.deb')
    expect(releaseToUpdate(rel('v0.2.0'), REPO, '0.1.0', 'appimage')).toMatchObject({ assetUrl: null, installCommand: null })
  })

  it('reports no update when the release is not newer, a draft or a prerelease', () => {
    expect(releaseToUpdate(rel('v0.1.0'), REPO, '0.1.0', 'rpm')).toBeNull()
    expect(releaseToUpdate(rel('v0.0.9'), REPO, '0.1.0', 'rpm')).toBeNull()
    expect(releaseToUpdate(rel('v0.2.0', { draft: true }), REPO, '0.1.0', 'rpm')).toBeNull()
    expect(releaseToUpdate(rel('v0.2.0', { prerelease: true }), REPO, '0.1.0', 'rpm')).toBeNull()
  })

  it('rejects metadata that is malformed or points outside the repository', () => {
    expect(() => releaseToUpdate('nope', REPO, '0.1.0', 'rpm')).toThrow(InvalidReleaseError)
    expect(() => releaseToUpdate({ tag_name: 'v1' }, REPO, '0.1.0', 'rpm')).toThrow(InvalidReleaseError)
    expect(() => releaseToUpdate(rel('vnext'), REPO, '0.1.0', 'rpm')).toThrow(/invalid version/)
    expect(() =>
      releaseToUpdate(rel('v0.2.0', { html_url: 'https://evil.example/releases/tag/v0.2.0' }), REPO, '0.1.0', 'rpm')
    ).toThrow(/not on FocusFlow/)
  })

  it('ignores package links that do not come from the repository', () => {
    const r = rel('v0.2.0')
    r.assets[0].browser_download_url = 'https://evil.example/FocusFlow-0.2.0.x86_64.rpm'
    expect(releaseToUpdate(r, REPO, '0.1.0', 'rpm')).toMatchObject({ assetUrl: null, installCommand: null })
  })

  it('only trusts https release URLs of this repository on github.com', () => {
    expect(isTrustedReleaseUrl(`https://github.com/${REPO}/releases/tag/v0.2.0`, REPO)).toBe(true)
    expect(isTrustedReleaseUrl(`https://github.com/${REPO}/releases/download/v0.2.0/a.rpm`, REPO)).toBe(true)
    expect(isTrustedReleaseUrl(`http://github.com/${REPO}/releases/tag/v0.2.0`, REPO)).toBe(false)
    expect(isTrustedReleaseUrl(`https://github.com/someone/else/releases/tag/v1`, REPO)).toBe(false)
    expect(isTrustedReleaseUrl(`https://github.com.evil.example/${REPO}/releases/`, REPO)).toBe(false)
    expect(isTrustedReleaseUrl('file:///etc/passwd', REPO)).toBe(false)
    expect(isTrustedReleaseUrl('javascript:alert(1)', REPO)).toBe(false)
  })
})

/** A controllable backend: each call can be told what to return. */
function fakeBackend(mode: 'install' | 'manual' = 'install') {
  let next: () => Promise<AvailableUpdate | null> = async () => update()
  let downloadImpl: (p: (x: DownloadProgress) => void) => Promise<void> = async (p) => {
    p({ percent: 40.4, transferred: 40, total: 100 })
    p({ percent: 100, transferred: 100, total: 100 })
  }
  const backend: UpdateBackend & { installs: number; installOnQuit: boolean | null } = {
    mode,
    format: mode === 'install' ? 'nsis' : 'rpm',
    installs: 0,
    installOnQuit: null,
    check: () => next(),
    ...(mode === 'install'
      ? {
          download: (p: (x: DownloadProgress) => void) => downloadImpl(p),
          install() {
            backend.installs += 1
          },
          setInstallOnQuit(v: boolean) {
            backend.installOnQuit = v
          }
        }
      : {})
  }
  return {
    backend,
    setCheck: (fn: () => Promise<AvailableUpdate | null>) => (next = fn),
    setDownload: (fn: typeof downloadImpl) => (downloadImpl = fn)
  }
}

function makeService(mode: 'install' | 'manual' = 'install') {
  const fb = fakeBackend(mode)
  const states: UpdateState[] = []
  const service = new UpdateService({
    backend: fb.backend,
    currentVersion: '0.1.0',
    format: fb.backend.format,
    now: () => new Date('2026-12-01T10:00:00Z'),
    onChange: (s) => states.push(s)
  })
  return { ...fb, service, states }
}

const offline = Object.assign(new Error('getaddrinfo ENOTFOUND api.github.com'), { code: 'ENOTFOUND' })

describe('UpdateService', () => {
  it('reports an available update, or up to date', async () => {
    const { service, setCheck } = makeService()
    expect((await service.check({ manual: false })).status).toMatchObject({ kind: 'available', update: { version: '0.2.0' } })
    setCheck(async () => null)
    const s = await service.check({ manual: false })
    expect(s.status.kind).toBe('up-to-date')
    expect(s.lastCheckedAt).toBe('2026-12-01T10:00:00.000Z')
  })

  it('stays quiet when an automatic check fails offline, but explains a failed manual check', async () => {
    const { service, setCheck } = makeService()
    setCheck(async () => {
      throw offline
    })
    expect((await service.check({ manual: false })).status.kind).toBe('idle')
    const manual = await service.check({ manual: true })
    expect(manual.status).toMatchObject({ kind: 'error', during: 'check', message: expect.stringMatching(/internet connection/) })
  })

  it('keeps the previously found update when a later automatic check fails', async () => {
    const { service, setCheck } = makeService()
    await service.check({ manual: false })
    setCheck(async () => {
      throw offline
    })
    expect((await service.check({ manual: false })).status.kind).toBe('available')
  })

  it('runs only one check at a time', async () => {
    const { service, setCheck } = makeService()
    const spy = vi.fn(async () => update())
    setCheck(spy)
    await Promise.all([service.check({ manual: false }), service.check({ manual: true })])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Later" hides a version for the session; a manual check shows it again', async () => {
    const { service } = makeService()
    await service.check({ manual: false })
    expect(service.dismiss('0.2.0').dismissedVersion).toBe('0.2.0')
    expect((await service.check({ manual: false })).dismissedVersion).toBe('0.2.0')
    expect((await service.check({ manual: true })).dismissedVersion).toBeNull()
  })

  it('downloads with progress, then waits for the user to install', async () => {
    const { service, states, backend } = makeService()
    await service.check({ manual: false })
    const done = await service.download()
    const progress = states.filter((s) => s.status.kind === 'downloading').map((s) => (s.status as { percent: number }).percent)
    expect(progress).toEqual([0, 40, 100])
    expect(done.status).toMatchObject({ kind: 'downloaded', installOnQuit: false })
    expect(backend.installs).toBe(0) // never installs by itself
    service.install()
    expect(backend.installs).toBe(1)
  })

  it('reports an interrupted download and lets the user retry', async () => {
    const { service, setDownload } = makeService()
    await service.check({ manual: false })
    setDownload(async (p) => {
      p({ percent: 30, transferred: 30, total: 100 })
      throw Object.assign(new Error('net::ERR_CONNECTION_RESET'), {})
    })
    const failed = await service.download()
    expect(failed.status).toMatchObject({ kind: 'error', during: 'download', message: expect.stringMatching(/interrupted/) })
    setDownload(async () => {})
    expect((await service.download()).status.kind).toBe('downloaded')
  })

  it('does not re-check while an update is downloading or downloaded', async () => {
    const { service, setCheck } = makeService()
    await service.check({ manual: false })
    await service.download()
    const spy = vi.fn(async () => null)
    setCheck(spy)
    expect((await service.check({ manual: true })).status.kind).toBe('downloaded')
    expect(spy).not.toHaveBeenCalled()
  })

  it('refuses to install before a download, and records install-on-quit only when downloaded', async () => {
    const { service, backend } = makeService()
    expect(() => service.install()).toThrow(UpdateActionError)
    expect(() => service.setInstallOnQuit(true)).toThrow(UpdateActionError)
    await service.check({ manual: false })
    await service.download()
    expect(service.setInstallOnQuit(true).status).toMatchObject({ kind: 'downloaded', installOnQuit: true })
    expect(backend.installOnQuit).toBe(true)
  })

  it('never offers download or install for package formats updated by the package manager', async () => {
    const { service } = makeService('manual')
    const s = await service.check({ manual: false })
    expect(s.mode).toBe('manual')
    await expect(service.download()).rejects.toThrow(/release page/)
    expect(() => service.install()).toThrow(UpdateActionError)
  })

  it('is disabled without a backend', async () => {
    const service = new UpdateService({ backend: null, currentVersion: '0.1.0', format: 'dev', now: () => new Date(), onChange: () => {} })
    expect((await service.check({ manual: true })).enabled).toBe(false)
  })
})

describe('UpdateScheduler', () => {
  it('checks shortly after start, then periodically, only while enabled', async () => {
    vi.useFakeTimers()
    const { service } = makeService()
    const spy = vi.spyOn(service, 'check')
    let enabled = true
    const scheduler = new UpdateScheduler(service, () => enabled, { firstDelayMs: 1000, intervalMs: 10_000 })
    scheduler.start()
    await vi.advanceTimersByTimeAsync(999)
    expect(spy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(spy).toHaveBeenCalledWith({ manual: false })
    enabled = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(spy).toHaveBeenCalledTimes(1)
    enabled = true
    await vi.advanceTimersByTimeAsync(10_000)
    expect(spy).toHaveBeenCalledTimes(2)
    scheduler.stop()
    vi.useRealTimers()
  })
})

describe('GitHubReleaseBackend', () => {
  const respond = (status: number, body?: unknown) => async () =>
    new Response(body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body), { status })

  it('finds a newer stable release, or nothing when none is published', async () => {
    expect(await new GitHubReleaseBackend(REPO, 'deb', '0.1.0', respond(200, rel('v0.2.0'))).check()).toMatchObject({ version: '0.2.0' })
    expect(await new GitHubReleaseBackend(REPO, 'deb', '0.1.0', respond(404)).check()).toBeNull()
  })

  it('turns rate limits and unreadable responses into clear errors', async () => {
    await expect(new GitHubReleaseBackend(REPO, 'deb', '0.1.0', respond(403)).check()).rejects.toThrow(/limiting/)
    await expect(new GitHubReleaseBackend(REPO, 'deb', '0.1.0', respond(200, '<html>')).check()).rejects.toThrow(/could not be read/)
    await expect(new GitHubReleaseBackend(REPO, 'deb', '0.1.0', respond(500)).check()).rejects.toThrow(/status 500/)
  })
})

describe('describeError', () => {
  it('explains common failures without technical detail', () => {
    expect(describeError(offline, 'check')).toMatch(/Couldn’t reach GitHub/)
    expect(describeError(new Error('sha512 checksum mismatch'), 'download')).toMatch(/checksum/)
    expect(describeError(new Error('HttpError: 404'), 'download')).toMatch(/could not be found/)
    expect(describeError(new InvalidReleaseError('custom'), 'check')).toBe('custom')
    expect(describeError(new Error('weird'), 'install')).toMatch(/release page/)
  })
})
