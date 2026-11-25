<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  MAX_DESCRIPTION,
  MAX_TITLE,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskInput
} from '@shared/tasks'
import { useTaskActions } from '@/stores/taskActions'
import { useSubjectStore } from '@/stores/subjects'
import { useSettingsStore } from '@/stores/settings'
import AppDialog from './AppDialog.vue'
import FormField from './FormField.vue'

const actions = useTaskActions()
const subjects = useSubjectStore()
const settings = useSettingsStore()

const form = reactive({
  title: '',
  description: '',
  subjectId: '',
  priority: 'medium' as TaskInput['priority'],
  status: 'todo' as TaskInput['status'],
  estimate: '' as string | number,
  scheduledDate: '',
  deadline: ''
})
const error = ref<string | null>(null)
const saving = ref(false)
const isEdit = computed(() => actions.editing !== null)

const inputClass =
  'h-9 w-full rounded-lg border border-line bg-bg px-3 outline-none focus:border-iris aria-invalid:border-danger'

watch(
  () => actions.formOpen,
  (open) => {
    if (!open) return
    error.value = null
    const t = actions.editing
    const d = actions.defaults
    form.title = t?.title ?? d.title ?? ''
    form.description = t?.description ?? d.description ?? ''
    form.subjectId = t?.subjectId ?? d.subjectId ?? ''
    form.priority = t?.priority ?? d.priority ?? 'medium'
    form.status = t?.status ?? d.status ?? 'todo'
    form.estimate = t ? (t.estimatedMinutes ?? '') : (d.estimatedMinutes ?? settings.settings.defaultTaskMinutes)
    form.scheduledDate = t?.scheduledDate ?? d.scheduledDate ?? ''
    form.deadline = t?.deadline ?? d.deadline ?? ''
  }
)

function toInput(): TaskInput | null {
  const title = form.title.trim()
  if (!title) {
    error.value = 'Give the task a title.'
    return null
  }
  let estimatedMinutes: number | null = null
  if (form.estimate !== '' && form.estimate !== null) {
    const n = Number(form.estimate)
    if (!Number.isInteger(n) || n < 0 || n > 10000) {
      error.value = 'Estimate must be a whole number of minutes from 0 to 10000.'
      return null
    }
    estimatedMinutes = n
  }
  return {
    title,
    description: form.description.trim() || null,
    subjectId: form.subjectId || null,
    priority: form.priority,
    status: form.status,
    estimatedMinutes,
    scheduledDate: form.scheduledDate || null,
    deadline: form.deadline || null
  }
}

async function save(): Promise<void> {
  error.value = null
  const input = toInput()
  if (!input) return
  saving.value = true
  try {
    if (actions.editing) {
      const saved = await actions.update(actions.editing.id, input)
      if (!saved) return
    } else {
      await actions.create(input)
    }
    actions.formOpen = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'The task could not be saved.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog v-model:open="actions.formOpen" :title="isEdit ? 'Edit task' : 'New task'" width="34rem">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="save">
      <FormField label="Title">
        <input
          v-model="form.title"
          autofocus
          :maxlength="MAX_TITLE"
          :aria-invalid="error === 'Give the task a title.'"
          placeholder="Revise chapter 4: transport layer"
          :class="inputClass"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField label="Subject">
          <select v-model="form.subjectId" :class="inputClass">
            <option value="">No subject</option>
            <option v-for="s in subjects.subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </FormField>
        <FormField label="Estimate" hint="Minutes of focus you expect to need.">
          <input v-model="form.estimate" type="number" min="0" max="10000" inputmode="numeric" :class="inputClass" />
        </FormField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <FormField label="Priority">
          <div role="radiogroup" aria-label="Priority" class="flex rounded-lg border border-line bg-bg p-0.5">
            <button
              v-for="p in TASK_PRIORITIES"
              :key="p"
              type="button"
              role="radio"
              :aria-checked="form.priority === p"
              class="h-8 flex-1 rounded-md text-muted transition-colors hover:text-text"
              :class="form.priority === p && 'bg-surface-2 text-text'"
              @click="form.priority = p"
            >
              {{ PRIORITY_LABELS[p] }}
            </button>
          </div>
        </FormField>
        <FormField v-if="isEdit" label="Status">
          <select v-model="form.status" :class="inputClass">
            <option v-for="s in TASK_STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
          </select>
        </FormField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <FormField label="Planned for" hint="The day you intend to work on it.">
          <input v-model="form.scheduledDate" type="date" :class="inputClass" />
        </FormField>
        <FormField label="Deadline">
          <input v-model="form.deadline" type="date" :class="inputClass" />
        </FormField>
      </div>

      <FormField label="Notes">
        <textarea
          v-model="form.description"
          rows="3"
          :maxlength="MAX_DESCRIPTION"
          class="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-iris"
        />
      </FormField>

      <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="h-9 rounded-lg border border-line px-3.5 hover:bg-surface-2" @click="actions.formOpen = false">
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="h-9 rounded-lg bg-iris px-4 font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          {{ isEdit ? 'Save task' : 'Add task' }}
        </button>
      </div>
    </form>
  </AppDialog>
</template>
