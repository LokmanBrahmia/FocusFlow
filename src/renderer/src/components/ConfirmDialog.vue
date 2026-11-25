<script setup lang="ts">
import AppDialog from './AppDialog.vue'

const props = withDefaults(
  defineProps<{ title: string; message: string; confirmLabel: string; danger?: boolean }>(),
  { danger: false }
)
const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <AppDialog v-model:open="open" :title="props.title" width="26rem">
    <p class="text-muted">{{ message }}</p>
    <slot />
    <div class="mt-6 flex justify-end gap-2">
      <button
        type="button"
        autofocus
        class="h-9 rounded-lg border border-line px-3.5 hover:bg-surface-2"
        @click="open = false"
      >
        Cancel
      </button>
      <button
        type="button"
        class="h-9 rounded-lg px-3.5 font-medium hover:brightness-110"
        :class="danger ? 'bg-danger text-white' : 'bg-accent text-on-accent'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </AppDialog>
</template>
