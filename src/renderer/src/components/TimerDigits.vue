<script setup lang="ts">
import { computed } from 'vue'
import { formatClock } from '@shared/timer'

const props = defineProps<{ ms: number }>()

/** Each glyph gets a fixed-width cell so the clock never shifts as digits change. */
const glyphs = computed(() => formatClock(props.ms).split(''))
</script>

<template>
  <span class="timer-digits" role="timer" :aria-label="formatClock(ms)">
    <span
      v-for="(g, i) in glyphs"
      :key="i"
      aria-hidden="true"
      :class="g === ':' ? 'colon' : 'digit'"
    >{{ g }}</span>
  </span>
</template>

<style scoped>
.timer-digits {
  display: inline-flex;
  font-family: var(--font-serif);
  font-variation-settings:
    'opsz' 144,
    'SOFT' 100,
    'WONK' 0;
  font-weight: 340;
  line-height: 1;
  letter-spacing: -0.02em;
}
.digit {
  display: inline-block;
  width: 0.6em;
  text-align: center;
}
.colon {
  display: inline-block;
  width: 0.3em;
  text-align: center;
  transform: translateY(-0.06em);
  opacity: 0.55;
}
</style>
