<script setup lang="ts">
import { useI18n } from '@/i18n'
import { computed, reactive, ref, watch } from 'vue'
import { MAX_DESCRIPTION, MAX_TITLE, TASK_PRIORITIES, TASK_STATUSES, type TaskInput } from '@shared/tasks'
import { useTaskActions } from '@/stores/taskActions'
import { useSubjectStore } from '@/stores/subjects'
import { useSettingsStore } from '@/stores/settings'
import AppDialog from './AppDialog.vue'
import FormField from './FormField.vue'

const { t } = useI18n()

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

const inputClass = 'field'
const titleMissing = ref(false)

watch(
  () => actions.formOpen,
  (open) => {
    if (!open) return
    error.value = null
    titleMissing.value = false
    const e = actions.editing
    const d = actions.defaults
    form.title = e?.title ?? d.title ?? ''
    form.description = e?.description ?? d.description ?? ''
    form.subjectId = e?.subjectId ?? d.subjectId ?? ''
    form.priority = e?.priority ?? d.priority ?? 'medium'
    form.status = e?.status ?? d.status ?? 'todo'
    form.estimate = e ? (e.estimatedMinutes ?? '') : (d.estimatedMinutes ?? settings.settings.defaultTaskMinutes)
    form.scheduledDate = e?.scheduledDate ?? d.scheduledDate ?? ''
    form.deadline = e?.deadline ?? d.deadline ?? ''
  }
)

function toInput(): TaskInput | null {
  const title = form.title.trim()
  if (!title) {
    titleMissing.value = true
    error.value = t('form.titleRequired')
    return null
  }
  titleMissing.value = false
  let estimatedMinutes: number | null = null
  if (form.estimate !== '' && form.estimate !== null) {
    const n = Number(form.estimate)
    if (!Number.isInteger(n) || n < 0 || n > 10000) {
      error.value = t('form.estimateInvalid')
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
    error.value = err instanceof Error ? err.message : t('toast.taskSaveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog v-model:open="actions.formOpen" :title="isEdit ? t('form.editTask') : t('form.newTask')" width="34rem">
    <form class="flex flex-col gap-4" novalidate @submit.prevent="save">
      <FormField :label="t('form.title')">
        <input
          v-model="form.title"
          autofocus
          :maxlength="MAX_TITLE"
          :aria-invalid="titleMissing"
          :placeholder="t('form.titlePlaceholder')"
          :class="inputClass"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField :label="t('form.subject')">
          <select v-model="form.subjectId" :class="inputClass">
            <option value="">{{ t('tasks.noSubject') }}</option>
            <option v-for="s in subjects.subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </FormField>
        <FormField :label="t('form.estimate')" :hint="t('form.estimateHint')">
          <input v-model="form.estimate" type="number" min="0" max="10000" inputmode="numeric" :class="inputClass" />
        </FormField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <FormField :label="t('form.priority')">
          <div role="radiogroup" :aria-label="t('form.priority')" class="flex rounded-lg border border-line bg-bg p-0.5">
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
              {{ t(`priority.${p}`) }}
            </button>
          </div>
        </FormField>
        <FormField v-if="isEdit" :label="t('form.status')">
          <select v-model="form.status" :class="inputClass">
            <option v-for="s in TASK_STATUSES" :key="s" :value="s">{{ t(`status.${s}`) }}</option>
          </select>
        </FormField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <FormField :label="t('form.plannedFor')" :hint="t('form.plannedHint')">
          <input v-model="form.scheduledDate" type="date" :class="inputClass" />
        </FormField>
        <FormField :label="t('form.deadline')">
          <input v-model="form.deadline" type="date" :class="inputClass" />
        </FormField>
      </div>

      <FormField :label="t('form.notes')">
        <textarea
          v-model="form.description"
          rows="3"
          :maxlength="MAX_DESCRIPTION"
          class="field h-auto resize-y py-2"
        />
      </FormField>

      <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="h-9 rounded-lg border border-line px-3.5 hover:bg-surface-2" @click="actions.formOpen = false">
          {{ t('common.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="h-9 rounded-lg bg-accent px-4 font-medium text-on-accent hover:brightness-110 disabled:opacity-50"
        >
          {{ isEdit ? t('form.saveTask') : t('form.addTask') }}
        </button>
      </div>
    </form>
  </AppDialog>
</template>
