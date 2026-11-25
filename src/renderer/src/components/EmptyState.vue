<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; body: string }>()
</script>

<template>
  <section class="rounded-2xl border border-dashed border-line px-7 py-8">
    <component :is="icon" :size="22" :stroke-width="1.5" class="text-faint" aria-hidden="true" />
    <h2 class="mt-4 text-lg font-semibold">{{ title }}</h2>
    <p class="mt-1 max-w-[56ch] text-muted">{{ body }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap gap-2">
      <slot />
    </div>
  </section>
</template>
