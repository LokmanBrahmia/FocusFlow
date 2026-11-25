<script setup lang="ts">
import { computed } from 'vue'
import { formatMinutes } from '@shared/tasks'

/**
 * Planned time as an outlined track, actual focus as a solid fill on top,
 * so the two never read as the same thing.
 */
const props = withDefaults(
  defineProps<{ plannedMinutes: number; focusMinutes: number; scaleMinutes: number; stacked?: boolean }>(),
  { stacked: false }
)

const pct = (m: number): string => `${Math.min(100, (m / Math.max(1, props.scaleMinutes)) * 100)}%`
const empty = computed(() => props.plannedMinutes === 0 && props.focusMinutes === 0)
</script>

<template>
  <div>
    <div class="relative h-2" aria-hidden="true">
      <div class="absolute inset-0 rounded-full bg-line/50" />
      <div
        v-if="plannedMinutes > 0"
        class="absolute inset-y-0 left-0 rounded-full border border-dashed border-accent/70"
        :style="{ width: pct(plannedMinutes) }"
      />
      <div
        v-if="focusMinutes > 0"
        class="absolute inset-y-0 left-0 rounded-full bg-accent"
        :style="{ width: pct(focusMinutes) }"
      />
    </div>
    <dl class="mt-1.5 grid gap-x-2 text-xs" :class="stacked ? 'grid-cols-1' : 'grid-cols-2'">
      <template v-if="!empty">
        <dt class="sr-only">Planned</dt>
        <dd class="text-muted">{{ plannedMinutes ? formatMinutes(plannedMinutes) : 'Nothing' }} planned</dd>
        <dt class="sr-only">Focused</dt>
        <dd :class="[focusMinutes ? 'text-text' : 'text-faint', !stacked && 'text-right']">
          {{ formatMinutes(focusMinutes) }} focused
        </dd>
      </template>
      <dd v-else class="col-span-full text-faint">Nothing planned</dd>
    </dl>
  </div>
</template>
