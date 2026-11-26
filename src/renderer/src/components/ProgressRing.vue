<script setup lang="ts">
import { computed } from 'vue'

/** A quiet completion ring (0–1) with content in the middle. */
const props = withDefaults(defineProps<{ value: number; size?: number; stroke?: number; done?: boolean }>(), {
  size: 132,
  stroke: 7,
  done: false
})
const r = computed(() => (props.size - props.stroke) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => c.value * (1 - Math.min(1, Math.max(0, props.value))))
</script>

<template>
  <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="-rotate-90 rtl:scale-y-[-1]" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" stroke="var(--line)" :stroke-width="stroke" />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="r"
        fill="none"
        :stroke="done ? 'var(--moss)' : 'var(--accent)'"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="c"
        :stroke-dashoffset="offset"
        class="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <slot />
    </div>
  </div>
</template>
