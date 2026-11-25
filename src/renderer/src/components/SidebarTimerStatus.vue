<script setup lang="ts">
import { computed } from 'vue'
import { SESSION_LABELS, formatClock } from '@shared/timer'
import { useTimerStore } from '@/stores/timer'

const timer = useTimerStore()
const s = computed(() => timer.state)
const active = computed(() => !!s.value && s.value.status !== 'idle')
const label = computed(() => {
  if (!s.value || !active.value) return 'No session running'
  const base = SESSION_LABELS[s.value.sessionType]
  return s.value.status === 'paused' ? `${base}, paused` : base
})
</script>

<template>
  <RouterLink
    to="/focus"
    :title="active ? `${label} — ${formatClock(timer.remainingMs)}` : label"
    class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-surface-2 max-lg:justify-center max-lg:px-0"
    :class="active ? 'text-text' : 'text-faint'"
  >
    <span
      class="size-2 shrink-0 rounded-full"
      :class="
        !active
          ? 'border border-faint'
          : timer.isBreak
            ? 'bg-tide'
            : 'bg-accent'
      "
      aria-hidden="true"
    />
    <span class="flex-1 max-lg:sr-only">{{ label }}</span>
    <span v-if="active" class="tabular-nums text-muted max-lg:hidden">{{ formatClock(timer.remainingMs) }}</span>
  </RouterLink>
</template>
