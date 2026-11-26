import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { remainingMs as computeRemaining, type SessionType, type StartTimerInput, type TimerState } from '@shared/timer'
import { desktop } from '@/services/desktop'
import { translate } from '@shared/i18n'
import { useSettingsStore } from './settings'

/**
 * Mirror of the main-process timer. It never counts time itself: the
 * displayed remaining time is re-derived from the authoritative timestamps
 * on each animation tick, so every window shows the same value.
 */
export const useTimerStore = defineStore('timer', () => {
  const state = ref<TimerState | null>(null)
  const now = ref(Date.now())
  const error = ref<string | null>(null)
  const miniOpen = ref(false)
  let ticking: number | null = null
  let subscribed = false

  const remainingMs = computed(() => (state.value ? computeRemaining(state.value, now.value) : 0))
  const progress = computed(() => {
    const s = state.value
    if (!s) return 1
    return remainingMs.value / (s.plannedDurationSeconds * 1000)
  })
  const isRunning = computed(() => state.value?.status === 'running')
  const isBreak = computed(() => !!state.value && state.value.sessionType !== 'focus')

  function tick(): void {
    now.value = Date.now()
  }

  watch(isRunning, (running) => {
    if (running && ticking === null) {
      ticking = window.setInterval(tick, 250)
    } else if (!running && ticking !== null) {
      window.clearInterval(ticking)
      ticking = null
    }
    tick()
  })

  async function load(): Promise<void> {
    if (!subscribed) {
      subscribed = true
      desktop().timer.onStateChange((s) => {
        state.value = s
        tick()
      })
      desktop().app.onMiniTimerChange((open) => {
        miniOpen.value = open
      })
    }
    state.value = await desktop().timer.getState()
    tick()
  }

  async function run(action: () => Promise<TimerState>): Promise<void> {
    error.value = null
    try {
      state.value = await action()
      tick()
    } catch (err) {
      error.value = err instanceof Error ? err.message : translate(useSettingsStore().settings.language, 'timer.error')
    }
  }

  const t = () => desktop().timer
  return {
    state,
    error,
    miniOpen,
    remainingMs,
    progress,
    isRunning,
    isBreak,
    load,
    start: (input?: StartTimerInput) => run(() => t().start(input)),
    pause: () => run(() => t().pause()),
    resume: () => run(() => t().resume()),
    toggle: () => run(() => t().toggle()),
    skip: () => run(() => t().skip()),
    reset: () => run(() => t().reset()),
    end: () => run(() => t().end()),
    setSessionType: (type: SessionType) => run(() => t().setSessionType(type)),
    setTask: (taskId: string | null) => run(() => t().setTask(taskId))
  }
})
