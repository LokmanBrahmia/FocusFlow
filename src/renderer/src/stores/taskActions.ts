import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CreateTaskInput, Task, TaskInput, UpdateTaskInput } from '@shared/tasks'
import { desktop } from '@/services/desktop'
import { useToastStore } from './toasts'
import { useTimerStore } from './timer'
import { useI18n } from '@/i18n'

/**
 * Task mutations plus the shared task form (opened from anywhere, e.g. Ctrl+N).
 * Lists refresh themselves through the data-changed event.
 */
export const useTaskActions = defineStore('taskActions', () => {
  const toasts = useToastStore()
  const timer = useTimerStore()
  const router = useRouter()
  const { t } = useI18n()

  const formOpen = ref(false)
  const editing = ref<Task | null>(null)
  const defaults = ref<Partial<TaskInput>>({})

  function openCreate(prefill: Partial<TaskInput> = {}): void {
    editing.value = null
    defaults.value = prefill
    formOpen.value = true
  }

  function openEdit(task: Task): void {
    editing.value = task
    defaults.value = {}
    formOpen.value = true
  }

  async function create(input: CreateTaskInput): Promise<Task> {
    const task = await desktop().tasks.create(input)
    toasts.show(t('toast.taskAdded'))
    return task
  }

  async function update(id: string, input: UpdateTaskInput, message: string | null = t('toast.taskSaved')): Promise<Task | null> {
    try {
      const task = await desktop().tasks.update(id, input)
      if (message) toasts.show(message)
      return task
    } catch (err) {
      toasts.error(err, t('toast.taskSaveFailed'))
      return null
    }
  }

  async function remove(task: Task): Promise<boolean> {
    try {
      await desktop().tasks.delete(task.id)
      toasts.show(t('toast.taskDeleted'))
      return true
    } catch (err) {
      toasts.error(err, t('toast.taskDeleteFailed'))
      return false
    }
  }

  function toggleComplete(task: Task): Promise<Task | null> {
    const done = task.status === 'completed'
    return update(task.id, { status: done ? 'todo' : 'completed' }, done ? t('toast.taskReopened') : t('toast.taskCompleted'))
  }

  /**
   * Starts focusing on a task. If a session is already running, the task is
   * linked to it instead of interrupting it.
   */
  async function focusOn(task: Task): Promise<void> {
    const active = timer.state && timer.state.status !== 'idle'
    if (active) {
      await timer.setTask(task.id)
      if (!timer.error) toasts.show(t('toast.linked', { title: task.title }))
    } else {
      await timer.start({ sessionType: 'focus', taskId: task.id })
    }
    if (timer.error) toasts.show(timer.error, 'error')
    else void router.push('/focus')
  }

  return { formOpen, editing, defaults, openCreate, openEdit, create, update, remove, toggleComplete, focusOn }
})
