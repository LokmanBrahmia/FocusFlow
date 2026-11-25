<script setup lang="ts">
defineProps<{ label: string; hint?: string }>()
</script>

<template>
  <label class="flex flex-col gap-1.5">
    <span class="text-sm text-muted">{{ label }}</span>
    <slot />
    <span v-if="hint" class="text-xs text-faint">{{ hint }}</span>
  </label>
</template>
