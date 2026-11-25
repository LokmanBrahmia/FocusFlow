<script setup lang="ts">
withDefaults(defineProps<{ label: string; description?: string; disabled?: boolean }>(), { description: undefined, disabled: false })
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="flex items-start justify-between gap-6 py-1" :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'">
    <span>
      <span class="block">{{ label }}</span>
      <span v-if="description" class="block text-sm text-muted">{{ description }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="label"
      :disabled="disabled"
      class="relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors"
      :class="model ? 'bg-iris' : 'bg-line'"
      @click="model = !model"
    >
      <span
        class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform"
        :class="model && 'translate-x-4'"
      />
    </button>
  </label>
</template>
