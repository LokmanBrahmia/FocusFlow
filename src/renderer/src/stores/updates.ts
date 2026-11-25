import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AvailableUpdate, UpdateState } from '@shared/updates'
import { desktop } from '@/services/desktop'
import { useToastStore } from './toasts'

/** Mirror of the main-process update state. All decisions happen in main. */
export const useUpdateStore = defineStore('updates', () => {
  const state = ref<UpdateState | null>(null)
  const busy = ref(false)
  const toasts = useToastStore()
  let subscribed = false

  async function load(): Promise<void> {
    if (!subscribed) {
      subscribed = true
      desktop().updates.onStateChange((s) => (state.value = s))
    }
    try {
      state.value = await desktop().updates.getState()
    } catch {
      /* updates are optional; the app works without them */
    }
  }

  /** The update the notice is about, if any. */
  const update = computed<AvailableUpdate | null>(() => {
    const s = state.value?.status
    if (!s) return null
    if (s.kind === 'available' || s.kind === 'downloading' || s.kind === 'downloaded') return s.update
    if (s.kind === 'error') return s.update
    return null
  })

  /** Show the notice unless the user chose "Later" for this version. */
  const noticeVisible = computed(() => {
    const u = update.value
    return !!u && state.value?.dismissedVersion !== u.version
  })

  async function run<T>(action: () => Promise<T>, failure: string): Promise<T | null> {
    busy.value = true
    try {
      return await action()
    } catch (err) {
      toasts.error(err, failure)
      return null
    } finally {
      busy.value = false
    }
  }

  const u = () => desktop().updates
  return {
    state,
    busy,
    update,
    noticeVisible,
    load,
    check: () => run(() => u().check(), 'The update check failed.'),
    later: (version: string) => run(() => u().dismiss(version), 'Could not hide the notice.'),
    download: () => run(() => u().download(), 'The update could not be downloaded.'),
    install: (acknowledgeActiveSession = false) =>
      run(() => u().install({ acknowledgeActiveSession }), 'The update could not be installed.'),
    installOnQuit: (enabled: boolean) => run(() => u().setInstallOnQuit(enabled), 'That did not work.'),
    open: (url: string) => run(() => u().openRelease(url), 'The release page could not be opened.')
  }
})
