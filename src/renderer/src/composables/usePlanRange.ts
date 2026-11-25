import { onBeforeUnmount, ref, watch } from 'vue'
import type { DayPlan } from '@shared/planner'
import { desktop } from '@/services/desktop'

/** Loads day plans for a range and reloads whenever tasks, blocks or sessions change. */
export function usePlanRange(range: () => { from: string; days: number }) {
  const days = ref<DayPlan[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let request = 0

  async function reload(): Promise<void> {
    const id = ++request
    const { from, days: n } = range()
    try {
      const result = await desktop().planner.getRange(from, n)
      if (id !== request) return
      days.value = result
      error.value = null
    } catch (err) {
      if (id === request) error.value = err instanceof Error ? err.message : 'The plan could not be loaded.'
    } finally {
      if (id === request) loading.value = false
    }
  }

  watch(range, () => void reload(), { deep: true, immediate: true })
  const off = desktop().onDataChanged(() => void reload())
  onBeforeUnmount(off)

  return { days, loading, error, reload }
}
