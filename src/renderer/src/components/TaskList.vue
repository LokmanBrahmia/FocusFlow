<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@shared/tasks'
import { useTaskActions } from '@/stores/taskActions'
import { useI18n } from '@/i18n'
import TaskRow from './TaskRow.vue'
import ConfirmDialog from './ConfirmDialog.vue'

withDefaults(defineProps<{ tasks: Task[]; showSubject?: boolean; showPlanned?: boolean; compact?: boolean }>(), {
  showSubject: true,
  showPlanned: true,
  compact: false
})

const actions = useTaskActions()
const { t } = useI18n()
const pending = ref<Task | null>(null)
const confirmOpen = ref(false)

function askDelete(task: Task): void {
  pending.value = task
  confirmOpen.value = true
}

async function confirmDelete(): Promise<void> {
  if (pending.value) await actions.remove(pending.value)
  confirmOpen.value = false
}
</script>

<template>
  <ul class="@container flex flex-col">
    <TaskRow
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      :show-subject="showSubject"
      :show-planned="showPlanned"
      :compact="compact"
      @delete="askDelete"
    />
  </ul>
  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="t('task.deleteTitle')"
    :message="t('task.deleteMessage', { title: pending?.title ?? '' })"
    :confirm-label="t('task.deleteConfirm')"
    danger
    @confirm="confirmDelete"
  />
</template>
