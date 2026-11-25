import {
  InvalidReleaseError,
  type AvailableUpdate,
  type PackageFormat,
  type UpdateMode,
  type UpdateState,
  type UpdateStatus
} from '@shared/updates'

export interface DownloadProgress {
  percent: number
  transferred: number
  total: number
}

/**
 * How updates are found and delivered for one package format. Only the
 * 'install' backend (Windows NSIS) implements download/install.
 */
export interface UpdateBackend {
  mode: UpdateMode
  format: PackageFormat
  /** Resolves to the newer release, or null when already up to date. */
  check(): Promise<AvailableUpdate | null>
  download?(onProgress: (p: DownloadProgress) => void): Promise<void>
  /** Quits Azm and runs the downloaded installer. */
  install?(): void
  setInstallOnQuit?(enabled: boolean): void
}

export interface UpdateServiceDeps {
  backend: UpdateBackend | null
  currentVersion: string
  format: PackageFormat
  now: () => Date
  onChange: (state: UpdateState) => void
  log?: (message: string, err?: unknown) => void
}

export class UpdateActionError extends Error {
  override name = 'UpdateActionError'
}

const NETWORK_CODES = /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_NETWORK_CHANGED|ERR_CONNECTION|net::/

/** A message the user can act on, without technical detail. */
export function describeError(err: unknown, during: 'check' | 'download' | 'install'): string {
  if (err instanceof InvalidReleaseError) return err.message
  const text = err instanceof Error ? `${(err as NodeJS.ErrnoException).code ?? ''} ${err.message}` : String(err)
  if (NETWORK_CODES.test(text)) {
    return during === 'download'
      ? 'The download was interrupted. Check your internet connection and try again.'
      : 'Couldn’t reach GitHub. Check your internet connection and try again.'
  }
  if (/sha512 checksum mismatch|checksum/i.test(text)) {
    return 'The downloaded update did not match its checksum and was discarded. Try again.'
  }
  if (/HttpError: 404|status code 404|\b404\b/.test(text)) {
    return 'The update files could not be found on the release.'
  }
  return during === 'check'
    ? 'The update check failed. Try again later.'
    : during === 'download'
      ? 'The update could not be downloaded. Try again.'
      : 'The update could not be installed. Try again, or download it from the release page.'
}

/**
 * The single source of truth for update state. Lives in the main process;
 * the renderer only receives snapshots and sends validated requests.
 */
export class UpdateService {
  private status: UpdateStatus = { kind: 'idle' }
  private dismissedVersion: string | null = null
  private lastCheckedAt: string | null = null
  private inFlight: Promise<UpdateState> | null = null

  constructor(private readonly deps: UpdateServiceDeps) {}

  getState(): UpdateState {
    const b = this.deps.backend
    return {
      currentVersion: this.deps.currentVersion,
      mode: b?.mode ?? 'manual',
      format: this.deps.format,
      enabled: b !== null,
      status: this.status,
      dismissedVersion: this.dismissedVersion,
      lastCheckedAt: this.lastCheckedAt
    }
  }

  /**
   * Checks for a newer release. Automatic checks stay quiet when they fail
   * (e.g. offline); manual checks report the error. A check never disturbs
   * an update that is already downloading or downloaded.
   */
  check(options: { manual: boolean }): Promise<UpdateState> {
    const backend = this.deps.backend
    if (!backend) return Promise.resolve(this.getState())
    if (this.status.kind === 'downloading' || this.status.kind === 'downloaded') {
      return Promise.resolve(this.getState())
    }
    if (this.inFlight) return this.inFlight
    if (options.manual) this.dismissedVersion = null

    const previous = this.status
    this.set({ kind: 'checking' })
    this.inFlight = (async () => {
      try {
        const update = await backend.check()
        this.lastCheckedAt = this.deps.now().toISOString()
        this.set(update ? { kind: 'available', update } : { kind: 'up-to-date', checkedAt: this.lastCheckedAt })
      } catch (err) {
        this.deps.log?.('[updates] check failed', err)
        if (options.manual) {
          this.set({ kind: 'error', during: 'check', message: describeError(err, 'check'), update: null })
        } else {
          // Quiet failure: keep whatever the user saw before.
          this.set(previous.kind === 'checking' ? { kind: 'idle' } : previous)
        }
      } finally {
        this.inFlight = null
      }
      return this.getState()
    })()
    return this.inFlight
  }

  /** "Later": hide the notice for this version until the app restarts or the user checks again. */
  dismiss(version: string): UpdateState {
    this.dismissedVersion = version
    this.emit()
    return this.getState()
  }

  async download(): Promise<UpdateState> {
    const backend = this.deps.backend
    const s = this.status
    const update = s.kind === 'available' ? s.update : s.kind === 'error' && s.during === 'download' ? s.update : null
    if (!backend?.download || backend.mode !== 'install') {
      throw new UpdateActionError('This version of Azm is updated by installing the new package from the release page.')
    }
    if (!update) throw new UpdateActionError('There is no update to download.')

    this.set({ kind: 'downloading', update, percent: 0, transferred: 0, total: 0 })
    try {
      await backend.download((p) => {
        if (this.status.kind !== 'downloading') return
        this.set({
          kind: 'downloading',
          update,
          percent: Math.max(0, Math.min(100, Math.round(p.percent))),
          transferred: p.transferred,
          total: p.total
        })
      })
      this.set({ kind: 'downloaded', update, installOnQuit: false })
    } catch (err) {
      this.deps.log?.('[updates] download failed', err)
      this.set({ kind: 'error', during: 'download', message: describeError(err, 'download'), update })
    }
    return this.getState()
  }

  /** Quits and installs. Only after the user confirmed, and only once downloaded. */
  install(): void {
    const backend = this.deps.backend
    if (this.status.kind !== 'downloaded' || !backend?.install) {
      throw new UpdateActionError('The update has not been downloaded yet.')
    }
    const update = this.status.update
    try {
      backend.install()
    } catch (err) {
      this.deps.log?.('[updates] install failed', err)
      this.set({ kind: 'error', during: 'install', message: describeError(err, 'install'), update })
    }
  }

  /** User opted in to installing the downloaded update the next time they quit. */
  setInstallOnQuit(enabled: boolean): UpdateState {
    if (this.status.kind !== 'downloaded' || !this.deps.backend?.setInstallOnQuit) {
      throw new UpdateActionError('The update has not been downloaded yet.')
    }
    this.deps.backend.setInstallOnQuit(enabled)
    this.set({ ...this.status, installOnQuit: enabled })
    return this.getState()
  }

  private set(status: UpdateStatus): void {
    this.status = status
    this.emit()
  }

  private emit(): void {
    this.deps.onChange(this.getState())
  }
}

/** Runs automatic checks: once shortly after start, then periodically. */
export class UpdateScheduler {
  private handle: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly service: UpdateService,
    private readonly enabled: () => boolean,
    private readonly timing = { firstDelayMs: 20_000, intervalMs: 6 * 60 * 60 * 1000 },
    private readonly timers: { set: typeof setTimeout; clear: typeof clearTimeout } = {
      set: setTimeout,
      clear: clearTimeout
    }
  ) {}

  start(): void {
    this.schedule(this.timing.firstDelayMs)
  }

  stop(): void {
    if (this.handle) this.timers.clear(this.handle)
    this.handle = null
  }

  private schedule(ms: number): void {
    this.stop()
    this.handle = this.timers.set(() => {
      if (this.enabled()) void this.service.check({ manual: false })
      this.schedule(this.timing.intervalMs)
    }, ms)
  }
}
