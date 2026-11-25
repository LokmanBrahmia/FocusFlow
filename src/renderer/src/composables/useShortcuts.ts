import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NAV_ITEMS } from '@/router'
import { useTimerStore } from '@/stores/timer'
import { useTaskActions } from '@/stores/taskActions'

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Space would also "click" a focused button; let the button handle it instead. */
function isActivatable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['BUTTON', 'A'].includes(target.tagName)
}

/**
 * Global shortcuts. All are ignored while typing in a field.
 * - Space: start/pause the timer
 * - Ctrl/Cmd + Shift + F: start a focus session
 * - Ctrl/Cmd + N: new task (main window only)
 * - Ctrl/Cmd + 1–4: navigate (main window only)
 */
export function useAppShortcuts(options: { navigation: boolean }): void {
  const router = useRouter()
  const timer = useTimerStore()
  const taskActions = options.navigation ? useTaskActions() : null

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) return
    const mod = event.metaKey || event.ctrlKey

    if (event.code === 'Space' && !mod && !event.shiftKey && !event.altKey) {
      if (isActivatable(event.target)) return
      event.preventDefault()
      void timer.toggle()
      return
    }

    if (mod && event.shiftKey && !event.altKey && event.code === 'KeyF') {
      event.preventDefault()
      if (timer.state?.status === 'idle') void timer.start({ sessionType: 'focus' })
      if (options.navigation) void router.push('/focus')
      return
    }

    if (!options.navigation || !mod || event.shiftKey || event.altKey) return

    if (event.code === 'KeyN') {
      event.preventDefault()
      // A modal dialog is already open; let it keep focus.
      if (!document.querySelector('dialog[open]')) taskActions?.openCreate()
      return
    }
    const item = NAV_ITEMS.find((i) => i.shortcut === event.key)
    if (!item) return
    event.preventDefault()
    void router.push(item.path)
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
