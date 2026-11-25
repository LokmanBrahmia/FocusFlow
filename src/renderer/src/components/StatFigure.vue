<script setup lang="ts">
defineProps<{ label: string; value: string; detail?: string }>()
</script>

<template>
  <div class="min-w-0">
    <dt class="text-sm text-muted">{{ label }}</dt>
    <dd class="page-title mt-1 text-[1.85rem] leading-tight whitespace-nowrap tabular-nums">{{ value }}</dd>
    <dd v-if="detail" class="mt-1 text-sm text-faint">{{ detail }}</dd>
  </div>
</template>
