<script setup lang="ts">
import { useI18n, type MessageKey } from '@/i18n'
import { computed, ref } from 'vue'
import type { DataCounts, ReplacePreview } from '@shared/data'
import AppDialog from './AppDialog.vue'

const { t, f } = useI18n()

const props = defineProps<{ preview: ReplacePreview | null }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const busy = ref(false)

const source = computed(() => {
  const p = props.preview
  if (!p) return ''
  return p.createdAt ? t('replace.fromDate', { file: p.fileName, date: `${f.value.dayMonthYear(new Date(p.createdAt))} ${f.value.time(new Date(p.createdAt))}` }) : p.fileName
})

const open = computed({
  get: () => props.preview !== null,
  set: (v) => {
    if (!v && !busy.value) emit('cancel')
  }
})

const rows: { key: keyof DataCounts; label: MessageKey }[] = [
  { key: 'tasks', label: 'nav.tasks' },
  { key: 'subjects', label: 'subject.title' },
  { key: 'sessions', label: 'replace.sessions' },
  { key: 'blocks', label: 'replace.blocks' }
]

async function confirm(): Promise<void> {
  busy.value = true
  emit('confirm')
}

defineExpose({ done: () => (busy.value = false) })
</script>

<template>
  <AppDialog v-model:open="open" :title="preview?.kind === 'restore' ? t('replace.restoreTitle') : t('replace.importTitle')" width="30rem">
    <template v-if="preview">
      <p class="text-muted">
        {{ t('replace.body', { source }) }}
      </p>

      <table class="mt-4 w-full text-start tabular-nums">
        <thead class="text-sm text-muted">
          <tr class="border-b border-line">
            <th class="py-1.5 font-normal" />
            <th class="py-1.5 text-start font-normal">{{ t('replace.now') }}</th>
            <th class="py-1.5 text-start font-normal">{{ t('replace.after') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key" class="border-b border-line/60">
            <td class="py-1.5">{{ t(r.label) }}</td>
            <td class="py-1.5 text-muted">{{ preview.current[r.key] }}</td>
            <td class="py-1.5">{{ preview.incoming[r.key] }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="preview.skippedSettings" class="mt-3 text-sm text-muted">
        {{ t('replace.skipped', { count: preview.skippedSettings }) }}
      </p>
      <p class="mt-3 text-sm text-muted">{{ t('replace.timer') }}</p>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" autofocus :disabled="busy" class="h-9 rounded-lg border border-line px-3.5 hover:bg-surface-2" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          :disabled="busy"
          class="h-9 rounded-lg bg-danger px-3.5 font-medium text-white hover:brightness-110 disabled:opacity-50"
          @click="confirm"
        >
          {{ busy ? t('replace.busy') : t('replace.confirm') }}
        </button>
      </div>
    </template>
  </AppDialog>
</template>
