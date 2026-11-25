import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

export const useToastStore = defineStore('toasts', () => {
  const toasts = ref<Toast[]>([])
  let next = 1

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function show(message: string, tone: Toast['tone'] = 'success'): void {
    const id = next++
    toasts.value = [...toasts.value.slice(-2), { id, message, tone }]
    window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3000)
  }

  /** Shows the error's message; used for failed operations the user can retry. */
  function error(err: unknown, fallback: string): void {
    show(err instanceof Error && err.message ? err.message : fallback, 'error')
  }

  return { toasts, show, error, dismiss }
})
