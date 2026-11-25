<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@shared/tasks'
import { useTaskActions } from '@/stores/taskActions'
import TaskRow from './TaskRow.vue'
import ConfirmDialog from './ConfirmDialog.vue'

withDefaults(defineProps<{ tasks: Task[]; showSubject?: boolean; showPlanned?: boolean; compact?: boolean }>(), {
  showSubject: true,
  showPlanned: true,
  compact: false
})

const actions = useTaskActions()
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
  <ul class="-mx-3 flex flex-col">
    <TaskRow v-for="t in tasks" :key="t.id" :task="t" :show-subject="showSubject" :show-planned="showPlanned" :compact="compact" @delete="askDelete" />
  </ul>
  <ConfirmDialog
    v-model:open="confirmOpen"
    title="Delete this task?"
    :message="`“${pending?.title ?? ''}” will be deleted permanently. Focus time already recorded stays in your statistics.`"
    confirm-label="Delete task"
    danger
    @confirm="confirmDelete"
  />
</template>
