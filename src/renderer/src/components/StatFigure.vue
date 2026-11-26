<script setup lang="ts">
/** One headline figure: label, value, and an optional line of context. */
defineProps<{ label: string; value: string; detail?: string }>()
</script>

<template>
  <div class="min-w-0 px-5 py-4">
    <dt class="text-sm text-muted">{{ label }}</dt>
    <dd class="page-title mt-1.5 text-[1.9rem] leading-tight whitespace-nowrap tabular-nums">{{ value }}</dd>
    <dd v-if="detail" class="mt-1 text-xs text-faint">{{ detail }}</dd>
  </div>
</template>
