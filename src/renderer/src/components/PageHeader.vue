<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-8">
    <div class="max-w-[60ch]">
      <h1 class="page-title text-4xl">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 text-lg text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
