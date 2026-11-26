import { Menu, Tray, nativeImage } from 'electron'
import { join } from 'node:path'
import { formatClock, type TimerState } from '@shared/timer'
import { tl } from '@shared/i18n'

const hhmm = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * System tray icon, created only while "close to tray" is on. Some Linux
 * desktops (stock GNOME) hide tray icons without an extension; the app still
 * works, and the menu remains reachable where the desktop shows it.
 */
export class AppTray {
  private tray: Tray | null = null

  constructor(
    private readonly actions: { show: () => void; toggleTimer: () => void; quit: () => void }
  ) {}

  get active(): boolean {
    return this.tray !== null
  }

  enable(iconDir: string): void {
    if (this.tray) return
    try {
      const icon = nativeImage.createFromPath(join(iconDir, 'tray.png'))
      this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
      this.tray.setToolTip(tl('brand.name'))
      this.tray.on('click', this.actions.show)
      this.update(null)
    } catch (err) {
      console.warn('[tray] unavailable:', err)
      this.tray = null
    }
  }

  disable(): void {
    this.tray?.destroy()
    this.tray = null
  }

  update(state: TimerState | null): void {
    if (!this.tray) return
    const active = state && state.status !== 'idle'
    // The tray menu is rebuilt on timer changes, not every second, so it shows
    // the end time (still correct later) rather than a countdown.
    const session = state ? tl(`session.${state.sessionType}`) : ''
    const status = !active
      ? tl('tray.idle')
      : state.status === 'paused'
        ? tl('tray.paused', { session, left: formatClock(state.remainingMs) })
        : tl('tray.running', { session, time: state.endsAt ? hhmm(state.endsAt) : '' })
    this.tray.setToolTip(`${tl('brand.name')} — ${status}`)
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: status, enabled: false },
        { type: 'separator' },
        { label: tl('tray.open'), click: this.actions.show },
        {
          label: state?.status === 'running' ? tl('tray.pause') : state?.status === 'paused' ? tl('tray.resume') : tl('now.start'),
          click: this.actions.toggleTimer
        },
        { type: 'separator' },
        { label: tl('tray.quit'), click: this.actions.quit }
      ])
    )
  }
}
