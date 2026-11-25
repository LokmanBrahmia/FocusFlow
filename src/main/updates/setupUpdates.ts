import { app, shell, type IpcMainInvokeEvent } from 'electron'
import { readFile } from 'node:fs/promises'
import { IPC } from '@shared/ipc'
import { isTrustedReleaseUrl, parseVersion, type UpdateState } from '@shared/updates'
import { broadcast, handle, ValidationError } from '../ipc/handlers'
import { createNsisBackend, detectPackageFormat, GitHubReleaseBackend } from './backends'
import { UpdateScheduler, UpdateService, type UpdateBackend } from './updateService'

interface SetupDeps {
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
  /** Whether automatic checks are enabled in Settings. */
  autoCheckEnabled: () => boolean
  /** True while a focus session or break is running or paused. */
  timerActive: () => boolean
}

/** The repository updates come from (package.json "repository", injected at build time). */
export const UPDATE_REPOSITORY: string = /^[\w.-]+\/[\w.-]+$/.test(__GITHUB_REPOSITORY__) ? __GITHUB_REPOSITORY__ : ''

/**
 * Wires the update system: picks the backend for this install, registers
 * validated IPC handlers and starts the automatic check schedule.
 */
export async function setupUpdates(deps: SetupDeps): Promise<UpdateService> {
  const format = detectPackageFormat()
  const currentVersion = app.getVersion()
  let backend: UpdateBackend | null = null

  const fixture = !app.isPackaged ? process.env.FOCUSFLOW_UPDATE_FIXTURE : undefined
  if (UPDATE_REPOSITORY && fixture) {
    // Development/testing only: serve a local "latest release" JSON through the
    // same validation as the real GitHub response. Ignored in packaged builds.
    backend = new GitHubReleaseBackend(UPDATE_REPOSITORY, format, currentVersion, async () =>
      new Response(await readFile(fixture, 'utf8'), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
  } else if (UPDATE_REPOSITORY) {
    if (format === 'nsis') {
      try {
        backend = await createNsisBackend(UPDATE_REPOSITORY)
      } catch (err) {
        console.error('[updates] Windows updater unavailable, falling back to release links:', err)
        backend = new GitHubReleaseBackend(UPDATE_REPOSITORY, format, currentVersion)
      }
    } else {
      backend = new GitHubReleaseBackend(UPDATE_REPOSITORY, format, currentVersion)
    }
  } else {
    console.warn('[updates] No GitHub repository configured in package.json; update checks are off.')
  }

  const service = new UpdateService({
    backend,
    currentVersion,
    format,
    now: () => new Date(),
    onChange: (state: UpdateState) => broadcast(IPC.updatesStateChanged, state),
    log: (message, err) => console.warn(message, err instanceof Error ? err.message : err)
  })

  const ctx = { isTrustedSender: deps.isTrustedSender }

  handle(ctx, IPC.updatesGetState, () => service.getState())
  handle(ctx, IPC.updatesCheck, () => service.check({ manual: true }))
  handle(ctx, IPC.updatesDismiss, (version) => {
    if (typeof version !== 'string' || !parseVersion(version)) throw new ValidationError('Invalid version.')
    return service.dismiss(version)
  })
  handle(ctx, IPC.updatesDownload, () => service.download())
  handle(ctx, IPC.updatesInstall, (options) => {
    const acknowledged =
      typeof options === 'object' && options !== null && (options as Record<string, unknown>).acknowledgeActiveSession === true
    // Never cut a focus session short without the user's say-so.
    if (deps.timerActive() && !acknowledged) {
      throw new ValidationError('A focus session is running. Confirm to restart now, or install when you quit Azm.')
    }
    service.install()
  })
  handle(ctx, IPC.updatesInstallOnQuit, (enabled) => {
    if (typeof enabled !== 'boolean') throw new ValidationError('Invalid value.')
    return service.setInstallOnQuit(enabled)
  })
  handle(ctx, IPC.updatesOpenRelease, async (url) => {
    // Only this repository's release pages and files on github.com.
    if (typeof url !== 'string' || !UPDATE_REPOSITORY || !isTrustedReleaseUrl(url, UPDATE_REPOSITORY)) {
      throw new ValidationError('That link is not an Azm release.')
    }
    await shell.openExternal(url)
  })

  if (backend) new UpdateScheduler(service, deps.autoCheckEnabled).start()
  return service
}
