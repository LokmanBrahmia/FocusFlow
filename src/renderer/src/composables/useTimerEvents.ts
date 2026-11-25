import { onBeforeUnmount } from 'vue'
import { desktop } from '@/services/desktop'
import { playSound } from '@/services/sounds'
import { useSettingsStore } from '@/stores/settings'

/** Plays completion sounds. Mounted only in the main window so sounds never double up. */
export function useCompletionSounds(): void {
  const settingsStore = useSettingsStore()
  const off = desktop().timer.onEvent((event) => {
    const s = settingsStore.settings
    if (!s.soundEnabled || event.type !== 'session-finished') return
    if (event.outcome !== 'completed' || event.recovered) return
    playSound(event.sessionType === 'focus' ? s.focusCompleteSound : s.breakCompleteSound)
  })
  onBeforeUnmount(off)
}
