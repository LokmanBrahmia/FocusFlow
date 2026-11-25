<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Fraction of the session remaining, 0–1. */
  progress: number
  tone: 'focus' | 'break'
  dimmed?: boolean
}>()

const R = 46
const C = 2 * Math.PI * R
const offset = computed(() => C * (1 - Math.min(1, Math.max(0, props.progress))))
</script>

<template>
  <div class="relative aspect-square w-full [container-type:inline-size]">
    <svg viewBox="0 0 100 100" class="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" :r="R" fill="none" stroke="var(--line)" stroke-width="0.8" />
      <circle
        cx="50"
        cy="50"
        :r="R"
        fill="none"
        :stroke="tone === 'focus' ? 'var(--accent)' : 'var(--tide)'"
        stroke-width="2.2"
        stroke-linecap="round"
        :stroke-dasharray="C"
        :stroke-dashoffset="offset"
        class="ring-arc"
        :class="dimmed && 'opacity-50'"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ring-arc {
  transition:
    stroke-dashoffset 260ms linear,
    stroke 300ms ease,
    opacity 200ms ease;
}
</style>
