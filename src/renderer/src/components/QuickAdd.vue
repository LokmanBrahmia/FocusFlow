<script setup lang="ts">
import { ref } from 'vue'
import { CornerDownLeft, Plus } from '@lucide/vue'
import { MAX_TITLE, type TaskInput } from '@shared/tasks'
import { useTaskActions } from '@/stores/taskActions'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/i18n'

/**
 * Type a title, press Enter: the task exists. Everything else (subject,
 * dates, notes) stays in the full form, one click away.
 */
const props = withDefaults(defineProps<{ defaults?: Partial<TaskInput>; placeholder?: string }>(), {
  defaults: () => ({}),
  placeholder: undefined
})

const actions = useTaskActions()
const settings = useSettingsStore()
const { t } = useI18n()
const title = ref('')
const saving = ref(false)

async function submit(): Promise<void> {
  const value = title.value.trim()
  if (!value || saving.value) return
  saving.value = true
  try {
    await actions.create({ estimatedMinutes: settings.settings.defaultTaskMinutes, ...props.defaults, title: value })
    title.value = ''
  } catch {
    /* the action already reported the error */
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="group flex items-center gap-2 rounded-xl border border-dashed border-line px-3 focus-within:border-solid focus-within:border-accent" @submit.prevent="submit">
    <Plus :size="16" :stroke-width="2" class="shrink-0 text-faint" aria-hidden="true" />
    <label class="min-w-0 flex-1">
      <span class="sr-only">{{ t('quickAdd.label') }}</span>
      <input
        v-model="title"
        :maxlength="MAX_TITLE"
        :placeholder="placeholder ?? t('quickAdd.placeholder')"
        class="h-10 w-full bg-transparent outline-none placeholder:text-faint"
      />
    </label>
    <span v-if="title" class="flex items-center gap-1 text-xs text-faint" aria-hidden="true">
      <CornerDownLeft :size="12" /> {{ t('quickAdd.enter') }}
    </span>
    <button
      type="button"
      class="shrink-0 text-sm text-muted hover:text-text"
      @click="actions.openCreate({ ...defaults, title: title.trim() || undefined })"
    >
      {{ t('quickAdd.details') }}
    </button>
  </form>
</template>
