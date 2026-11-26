import { Notification } from 'electron'
import type { AppSettings } from '@shared/settings'
import type { TimerEvent } from '@shared/timer'
import { formatDuration, tl } from '@shared/i18n'

/**
 * Turns timer events into desktop notifications. Never throws: if the OS
 * refuses or notifications are unsupported, the app carries on silently.
 */
export class NotificationService {
  constructor(
    private readonly getSettings: () => AppSettings,
    private readonly onClick: () => void
  ) {}

  handle(event: TimerEvent): void {
    const content = this.contentFor(event)
    if (content) this.show(content.title, content.body)
  }

  private contentFor(event: TimerEvent): { title: string; body: string } | null {
    const s = this.getSettings()
    if (event.type === 'daily-goal-reached') {
      if (!s.notifyDailyGoal) return null
      return {
        title: tl('notify.goalTitle'),
        body: tl('notify.goalBody', { time: formatDuration(s.language, event.goalMinutes) })
      }
    }
    if (event.outcome !== 'completed') return null
    if (event.sessionType === 'focus') {
      if (!s.notifyFocusComplete) return null
      const next = s.autoStartBreaks ? tl('notify.breakStarted') : tl('notify.timeForBreak')
      return { title: tl('notify.focusTitle'), body: event.recovered ? tl('notify.whileClosed') : next }
    }
    if (!s.notifyBreakComplete) return null
    const next = s.autoStartFocus ? tl('notify.focusStarted') : tl('notify.readyForFocus')
    return { title: tl('notify.breakTitle'), body: event.recovered ? tl('notify.whileClosed') : next }
  }

  private show(title: string, body: string): void {
    try {
      if (!Notification.isSupported()) return
      // Sound is played by the app itself so it follows the user's sound settings.
      const n = new Notification({ title, body, silent: true })
      n.on('click', this.onClick)
      n.show()
    } catch (err) {
      console.warn('[notifications] could not show notification:', err)
    }
  }
}
