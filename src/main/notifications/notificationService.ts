import { Notification } from 'electron'
import type { AppSettings } from '@shared/settings'
import type { TimerEvent } from '@shared/timer'

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
      return { title: 'Daily goal reached', body: `You have focused for ${event.goalMinutes} minutes today.` }
    }
    if (event.outcome !== 'completed') return null
    if (event.sessionType === 'focus') {
      if (!s.notifyFocusComplete) return null
      const next = s.autoStartBreaks ? 'Your break has started.' : 'Time for a break.'
      return { title: 'Focus session complete', body: event.recovered ? 'It finished while FocusFlow was closed.' : next }
    }
    if (!s.notifyBreakComplete) return null
    const next = s.autoStartFocus ? 'Your next focus session has started.' : 'Ready for the next focus session?'
    return { title: 'Break over', body: event.recovered ? 'It finished while FocusFlow was closed.' : next }
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
