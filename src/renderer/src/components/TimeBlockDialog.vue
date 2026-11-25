<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { blockMinutes, type TimeBlock, type TimeBlockInput } from '@shared/planner'
import { formatMinutes } from '@shared/tasks'
import { useTaskList } from '@/composables/useTaskList'
import { useToastStore } from '@/stores/toasts'
import { desktop } from '@/services/desktop'
import AppDialog from './AppDialog.vue'
import FormField from './FormField.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ block: TimeBlock | null; defaults: Partial<TimeBlockInput> }>()

const toasts = useToastStore()
const { tasks } = useTaskList(() => ({ status: 'open', sort: 'priority', limit: 500 }))

const form = reactive({ taskId: '', date: '', start: '', end: '' })
const error = ref<string | null>(null)
const inputClass = 'h-9 w-full rounded-lg border border-line bg-bg px-3 outline-none focus:border-iris'

/** Open tasks, plus the block's own task if it has since been closed. */
const options = computed(() => {
  const list = tasks.value.map((t) => ({ id: t.id, title: t.title }))
  if (props.block && !list.some((t) => t.id === props.block!.taskId)) {
    list.unshift({ id: props.block.taskId, title: props.block.taskTitle })
  }
  return list
})

const length = computed(() =>
  form.start && form.end && form.end > form.start ? formatMinutes(blockMinutes(form)) : null
)

watch(open, (v) => {
  if (!v) return
  error.value = null
  const b = props.block
  form.taskId = b?.taskId ?? props.defaults.taskId ?? ''
  form.date = b?.date ?? props.defaults.date ?? ''
  form.start = b?.start ?? props.defaults.start ?? '09:00'
  form.end = b?.end ?? props.defaults.end ?? '10:00'
})

async function save(): Promise<void> {
  error.value = null
  if (!form.taskId) {
    error.value = 'Choose a task for this block.'
    return
  }
  if (!form.start || !form.end || form.end <= form.start) {
    error.value = 'The block must end after it starts.'
    return
  }
  try {
    const input = { ...form }
    if (props.block) await desktop().planner.updateBlock(props.block.id, input)
    else await desktop().planner.createBlock(input)
    toasts.show(props.block ? 'Study block saved' : 'Study block added')
    open.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The block could not be saved.'
  }
}

async function remove(): Promise<void> {
  if (!props.block) return
  try {
    await desktop().planner.deleteBlock(props.block.id)
    toasts.show('Study block removed')
    open.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The block could not be removed.'
  }
}
</script>

<template>
  <AppDialog v-model:open="open" :title="block ? 'Edit study block' : 'New study block'" width="28rem">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="save">
      <p class="text-sm text-muted">A block reserves time on your calendar. It does not start the timer.</p>
      <FormField label="Task">
        <select v-model="form.taskId" autofocus :class="inputClass">
          <option value="" disabled>Choose a task</option>
          <option v-for="t in options" :key="t.id" :value="t.id">{{ t.title }}</option>
        </select>
      </FormField>
      <FormField label="Date">
        <input v-model="form.date" type="date" required :class="inputClass" />
      </FormField>
      <div class="grid grid-cols-2 gap-4">
        <FormField label="From">
          <input v-model="form.start" type="time" step="300" required :class="inputClass" />
        </FormField>
        <FormField label="To">
          <input v-model="form.end" type="time" step="300" required :class="inputClass" />
        </FormField>
      </div>
      <p v-if="length" class="-mt-1 text-sm text-muted">{{ length }}</p>
      <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>

      <div class="flex items-center gap-2 pt-1">
        <button v-if="block" type="button" class="h-9 rounded-lg px-3 text-danger hover:bg-surface-2" @click="remove">
          Remove block
        </button>
        <span class="flex-1" />
        <button type="button" class="h-9 rounded-lg border border-line px-3.5 hover:bg-surface-2" @click="open = false">
          Cancel
        </button>
        <button type="submit" class="h-9 rounded-lg bg-iris px-4 font-medium text-white hover:brightness-110">
          {{ block ? 'Save block' : 'Add block' }}
        </button>
      </div>
    </form>
  </AppDialog>
</template>
