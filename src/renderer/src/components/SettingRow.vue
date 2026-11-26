<script setup lang="ts">
/**
 * One setting: what it is and what it does on the start side, its control
 * aligned on the end side. Rows stack on narrow windows.
 */
defineProps<{ label: string; description?: string; forId?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b border-line/70 py-3.5 last:border-b-0">
    <div class="min-w-0 max-w-[46ch] flex-1">
      <component :is="forId ? 'label' : 'p'" :for="forId" class="block">{{ label }}</component>
      <p v-if="description" class="mt-0.5 text-sm text-muted">{{ description }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot />
    </div>
  </div>
</template>
