<script setup lang="ts">
import { computed, ref } from 'vue'
import { format } from 'date-fns'
import type { DataCounts, ReplacePreview } from '@shared/data'
import AppDialog from './AppDialog.vue'

const props = defineProps<{ preview: ReplacePreview | null }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const busy = ref(false)

const source = computed(() => {
  const p = props.preview
  if (!p) return ''
  return p.createdAt ? `${p.fileName}, from ${format(new Date(p.createdAt), 'd MMM yyyy, HH:mm')}` : p.fileName
})

const open = computed({
  get: () => props.preview !== null,
  set: (v) => {
    if (!v && !busy.value) emit('cancel')
  }
})

const rows: { key: keyof DataCounts; label: string }[] = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'sessions', label: 'Focus sessions' },
  { key: 'blocks', label: 'Study blocks' }
]

async function confirm(): Promise<void> {
  busy.value = true
  emit('confirm')
}

defineExpose({ done: () => (busy.value = false) })
</script>

<template>
  <AppDialog v-model:open="open" :title="preview?.kind === 'restore' ? 'Restore this backup?' : 'Import this file?'" width="30rem">
    <template v-if="preview">
      <p class="text-muted">
        Everything currently in FocusFlow will be replaced by <span class="text-text">{{ source }}</span>.
        A copy of your current data is saved first, so you can restore it if needed.
      </p>

      <table class="mt-4 w-full text-left tabular-nums">
        <thead class="text-sm text-muted">
          <tr class="border-b border-line">
            <th class="py-1.5 font-normal" />
            <th class="py-1.5 font-normal">Now</th>
            <th class="py-1.5 font-normal">After</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key" class="border-b border-line/60">
            <td class="py-1.5">{{ r.label }}</td>
            <td class="py-1.5 text-muted">{{ preview.current[r.key] }}</td>
            <td class="py-1.5">{{ preview.incoming[r.key] }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="preview.skippedSettings" class="mt-3 text-sm text-muted">
        {{ preview.skippedSettings }} setting{{ preview.skippedSettings === 1 ? ' was' : 's were' }} not recognised and will keep the default.
      </p>
      <p class="mt-3 text-sm text-muted">A running timer is not interrupted.</p>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" autofocus :disabled="busy" class="h-9 rounded-lg border border-line px-3.5 hover:bg-surface-2" @click="emit('cancel')">
          Cancel
        </button>
        <button
          type="button"
          :disabled="busy"
          class="h-9 rounded-lg bg-danger px-3.5 font-medium text-white hover:brightness-110 disabled:opacity-50"
          @click="confirm"
        >
          {{ busy ? 'Replacing…' : 'Replace my data' }}
        </button>
      </div>
    </template>
  </AppDialog>
</template>
