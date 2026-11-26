<script setup lang="ts">
import { useI18n } from '@/i18n'
import { ref, watch } from 'vue'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{ label: string; min: number; max: number; unit?: string }>(),
  { unit: undefined }
)
const model = defineModel<number>({ required: true })

const draft = ref(String(model.value))
const invalid = ref(false)
watch(model, (v) => {
  draft.value = String(v)
  invalid.value = false
})

/** Commits on blur/Enter; out-of-range input is shown as an error and not saved. */
function commit(): void {
  const n = Number(draft.value)
  if (!Number.isInteger(n) || n < props.min || n > props.max) {
    invalid.value = true
    return
  }
  invalid.value = false
  if (n !== model.value) model.value = n
}
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span class="text-sm text-muted">{{ label }}</span>
    <span
      class="flex h-9 items-center rounded-lg border bg-bg pe-3 focus-within:border-accent"
      :class="invalid ? 'border-danger' : 'border-line'"
    >
      <input
        v-model="draft"
        type="number"
        inputmode="numeric"
        :min="min"
        :max="max"
        :aria-invalid="invalid"
        class="w-full min-w-0 bg-transparent px-3 tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        @blur="commit"
        @keydown.enter="commit"
      />
      <span class="text-sm text-faint">{{ unit ?? t('unit.min') }}</span>
    </span>
    <span v-if="invalid" class="text-xs text-danger">{{ t('form.wholeNumber', { min, max }) }}</span>
  </label>
</template>
