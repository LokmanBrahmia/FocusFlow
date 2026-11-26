<script setup lang="ts">
/**
 * Every screen opens the same way: a small context label, the title, one
 * line of meaning, and the screen's actions on the opposite edge.
 */
defineProps<{ title: string; eyebrow?: string; subtitle?: string }>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-7">
    <div class="min-w-0 max-w-[62ch]">
      <p v-if="eyebrow" class="eyebrow mb-1.5">{{ eyebrow }}</p>
      <h1 class="page-title text-[2.35rem] leading-[1.15]">{{ title }}</h1>
      <p v-if="subtitle" class="mt-2 text-base text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
