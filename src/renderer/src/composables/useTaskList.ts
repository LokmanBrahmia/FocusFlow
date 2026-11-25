import { onBeforeUnmount, ref, watch } from 'vue'
import type { Task, TaskQuery } from '@shared/tasks'
import { desktop } from '@/services/desktop'

/**
 * Loads tasks for a query and reloads when the query changes or when any
 * window changes tasks or records a session (focus time is derived).
 * Rapid query changes (typing in search) are debounced, and stale responses ignored.
 */
export function useTaskList(query: () => TaskQuery, options: { debounceMs?: number } = {}) {
  const tasks = ref<Task[]>([])
  const total = ref(0)
  const loading = ref(true)
  const error = ref<string | null>(null)
  let request = 0
  let timer: number | null = null

  async function reload(): Promise<void> {
    const id = ++request
    try {
      const result = await desktop().tasks.list(query())
      if (id !== request) return
      tasks.value = result.tasks
      total.value = result.total
      error.value = null
    } catch (err) {
      if (id !== request) return
      error.value = err instanceof Error ? err.message : 'Tasks could not be loaded.'
    } finally {
      if (id === request) loading.value = false
    }
  }

  watch(
    query,
    () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => void reload(), options.debounceMs ?? 0)
    },
    { deep: true, immediate: true }
  )

  const off = desktop().onDataChanged((entity) => {
    if (entity === 'tasks' || entity === 'sessions' || entity === 'subjects') void reload()
  })

  onBeforeUnmount(() => {
    off()
    if (timer !== null) window.clearTimeout(timer)
  })

  return { tasks, total, loading, error, reload }
}
