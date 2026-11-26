import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AvailableUpdate, UpdateState } from '@shared/updates'
import { desktop } from '@/services/desktop'
import { useToastStore } from './toasts'
import { useI18n } from '@/i18n'

/** Mirror of the main-process update state. All decisions happen in main. */
export const useUpdateStore = defineStore('updates', () => {
  const state = ref<UpdateState | null>(null)
  const busy = ref(false)
  const toasts = useToastStore()
  const { t: tr } = useI18n()
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
    check: () => run(() => u().check(), tr('update.err.check')),
    later: (version: string) => run(() => u().dismiss(version), tr('update.err.hide')),
    download: () => run(() => u().download(), tr('update.err.download')),
    install: (acknowledgeActiveSession = false) =>
      run(() => u().install({ acknowledgeActiveSession }), tr('update.err.install')),
    installOnQuit: (enabled: boolean) => run(() => u().setInstallOnQuit(enabled), tr('toast.genericError')),
    open: (url: string) => run(() => u().openRelease(url), tr('update.err.open'))
  }
})
