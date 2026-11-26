<script setup lang="ts">
import { useI18n } from '@/i18n'
import { subjectColor } from '@/composables/useTheme'
import { computed, ref, watch } from 'vue'
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { MAX_SUBJECT_NAME, SUBJECT_COLORS, type Subject } from '@shared/tasks'
import { useSubjectStore } from '@/stores/subjects'
import { useToastStore } from '@/stores/toasts'
import AppDialog from './AppDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const { t, f } = useI18n()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ deleted: [id: string] }>()

const store = useSubjectStore()
const toasts = useToastStore()

/** id of the subject being edited, 'new' for the add form, or null. */
const editingId = ref<string | null>(null)
const name = ref('')
const color = ref<string>(SUBJECT_COLORS[0])
const error = ref<string | null>(null)

const pendingDelete = ref<Subject | null>(null)
const confirmOpen = ref(false)
const reassignTo = ref('')

const otherSubjects = computed(() => store.subjects.filter((s) => s.id !== pendingDelete.value?.id))

watch(open, (v) => {
  if (v) cancelEdit()
})

function startNew(): void {
  editingId.value = 'new'
  name.value = ''
  color.value = SUBJECT_COLORS[store.subjects.length % SUBJECT_COLORS.length]
  error.value = null
}

function startEdit(s: Subject): void {
  editingId.value = s.id
  name.value = s.name
  color.value = s.color ?? SUBJECT_COLORS[0]
  error.value = null
}

function cancelEdit(): void {
  editingId.value = null
  error.value = null
}

async function save(): Promise<void> {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = t('subject.nameRequired')
    return
  }
  try {
    if (editingId.value === 'new') {
      await store.create({ name: trimmed, color: color.value })
      toasts.show(t('toast.subjectAdded'))
    } else if (editingId.value) {
      await store.update(editingId.value, { name: trimmed, color: color.value })
      toasts.show(t('toast.subjectSaved'))
    }
    cancelEdit()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('toast.subjectSaveFailed')
  }
}

function askDelete(s: Subject): void {
  pendingDelete.value = s
  reassignTo.value = ''
  confirmOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const s = pendingDelete.value
  if (!s) return
  try {
    await store.remove(s.id, reassignTo.value || null)
    toasts.show(t('toast.subjectDeleted'))
    emit('deleted', s.id)
  } catch (err) {
    toasts.error(err, t('toast.subjectDeleteFailed'))
  }
  confirmOpen.value = false
}
</script>

<template>
  <AppDialog v-model:open="open" :title="t('subject.title')" width="32rem">
    <p class="text-muted">{{ t('subject.hint') }}</p>

    <ul class="mt-4 flex flex-col">
      <li v-for="s in store.subjects" :key="s.id" class="border-b border-line py-2.5 last:border-b-0">
        <form v-if="editingId === s.id" class="flex flex-col gap-3" @submit.prevent="save">
          <input
            v-model="name"
            autofocus
            :maxlength="MAX_SUBJECT_NAME"
            :aria-label="t('subject.name')"
            class="field"
          />
          <div class="flex items-center justify-between gap-3">
            <div role="radiogroup" :aria-label="t('subject.colour')" class="flex gap-1.5">
              <button
                v-for="(c, i) in SUBJECT_COLORS"
                :key="c"
                type="button"
                role="radio"
                :aria-checked="color === c"
                :aria-label="t('subject.colourN', { n: i + 1 })"
                class="size-6 rounded-full ring-offset-2 ring-offset-surface"
                :class="color === c && 'ring-2 ring-text'"
                :style="{ background: subjectColor(c) }"
                @click="color = c"
              />
            </div>
            <div class="flex gap-2">
              <button type="button" class="h-8 rounded-lg px-3 text-muted hover:bg-surface-2" @click="cancelEdit">{{ t('common.cancel') }}</button>
              <button type="submit" class="h-8 rounded-lg bg-accent px-3 font-medium text-on-accent">{{ t('common.save') }}</button>
            </div>
          </div>
          <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>
        </form>

        <div v-else class="group flex items-center gap-3">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ background: subjectColor(s.color) }" />
          <span class="min-w-0 flex-1">
            <span class="block truncate">{{ s.name }}</span>
            <span class="block text-sm text-muted">
              {{ t('subject.summary', { count: s.taskCount, time: f.duration(s.focusSeconds / 60) }) }}
            </span>
          </span>
          <button
            type="button"
            :aria-label="t('subject.rename', { name: s.name })"
            class="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
            @click="startEdit(s)"
          >
            <Pencil :size="15" :stroke-width="1.75" />
          </button>
          <button
            type="button"
            :aria-label="t('subject.delete', { name: s.name })"
            class="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
            @click="askDelete(s)"
          >
            <Trash2 :size="15" :stroke-width="1.75" />
          </button>
        </div>
      </li>
    </ul>

    <form v-if="editingId === 'new'" class="mt-3 flex flex-col gap-3" @submit.prevent="save">
      <input
        v-model="name"
        autofocus
        :maxlength="MAX_SUBJECT_NAME"
        :placeholder="t('subject.placeholder')"
        :aria-label="t('subject.name')"
        class="field"
      />
      <div class="flex items-center justify-between gap-3">
        <div role="radiogroup" :aria-label="t('subject.colour')" class="flex gap-1.5">
          <button
            v-for="(c, i) in SUBJECT_COLORS"
            :key="c"
            type="button"
            role="radio"
            :aria-checked="color === c"
            :aria-label="t('subject.colourN', { n: i + 1 })"
            class="size-6 rounded-full ring-offset-2 ring-offset-surface"
            :class="color === c && 'ring-2 ring-text'"
            :style="{ background: subjectColor(c) }"
            @click="color = c"
          />
        </div>
        <div class="flex gap-2">
          <button type="button" class="h-8 rounded-lg px-3 text-muted hover:bg-surface-2" @click="cancelEdit">{{ t('common.cancel') }}</button>
          <button type="submit" class="h-8 rounded-lg bg-accent px-3 font-medium text-on-accent">{{ t('subject.add') }}</button>
        </div>
      </div>
      <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>
    </form>
    <button
      v-else
      type="button"
      class="mt-3 inline-flex h-9 items-center gap-2 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-text"
      @click="startNew"
    >
      <Plus :size="16" :stroke-width="2" /> {{ t('subject.new') }}
    </button>
  </AppDialog>

  <ConfirmDialog
    v-model:open="confirmOpen"
    :title="t('subject.deleteTitle', { name: pendingDelete?.name ?? '' })"
    :message="
      pendingDelete?.taskCount ? t('subject.deleteKeeps', { count: pendingDelete.taskCount }) : t('subject.deleteEmpty')
    "
    :confirm-label="t('subject.deleteConfirm')"
    danger
    @confirm="confirmDelete"
  >
    <label v-if="pendingDelete?.taskCount" class="mt-4 flex flex-col gap-1.5">
      <span class="text-sm text-muted">{{ t('subject.moveTo') }}</span>
      <select v-model="reassignTo" class="field">
        <option value="">{{ t('tasks.noSubject') }}</option>
        <option v-for="o in otherSubjects" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
    </label>
  </ConfirmDialog>
</template>
