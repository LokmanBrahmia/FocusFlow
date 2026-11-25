import { onBeforeUnmount, ref, watch } from 'vue'
import type { DateRange, Statistics } from '@shared/statistics'
import { desktop } from '@/services/desktop'
import { useSettingsStore } from '@/stores/settings'

/** Loads statistics for a range; reloads on data changes and on goal/streak setting changes. */
export function useStatistics(range: () => DateRange | null) {
  const stats = ref<Statistics | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const settings = useSettingsStore()
  let request = 0

  async function reload(): Promise<void> {
    const r = range()
    if (!r) return
    const id = ++request
    loading.value = true
    try {
      const result = await desktop().stats.get(r)
      if (id !== request) return
      stats.value = result
      error.value = null
    } catch (err) {
      if (id === request) error.value = err instanceof Error ? err.message : 'Statistics could not be loaded.'
    } finally {
      if (id === request) loading.value = false
    }
  }

  watch(
    [range, () => settings.settings.dailyGoalMinutes, () => settings.settings.streakMinimumMinutes],
    () => void reload(),
    { deep: true, immediate: true }
  )
  const off = desktop().onDataChanged((entity) => {
    if (entity !== 'blocks') void reload()
  })
  onBeforeUnmount(off)

  return { stats, loading, error, reload }
}
