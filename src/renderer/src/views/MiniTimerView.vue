<script setup lang="ts">
import { computed } from 'vue'
import { Maximize2, Pause, Play, X } from '@lucide/vue'
import { SESSION_LABELS } from '@shared/timer'
import TimerDigits from '@/components/TimerDigits.vue'
import TimerRing from '@/components/TimerRing.vue'
import { useTimerStore } from '@/stores/timer'
import { desktop } from '@/services/desktop'

const timer = useTimerStore()
const s = computed(() => timer.state)
const label = computed(() => {
  if (!s.value) return ''
  const base = SESSION_LABELS[s.value.sessionType]
  return s.value.status === 'paused' ? `${base}, paused` : base
})
</script>

<template>
  <div
    v-if="s"
    class="drag flex h-screen items-center gap-3 border border-line bg-surface pr-2 pl-3"
  >
    <div class="w-12 shrink-0">
      <TimerRing :progress="timer.progress" :tone="timer.isBreak ? 'break' : 'focus'" :dimmed="s.status === 'paused'" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-xs" :class="timer.isBreak ? 'text-tide' : 'text-iris'">{{ label }}</p>
      <TimerDigits :ms="timer.remainingMs" class="text-[1.9rem]" :class="s.status === 'paused' && 'text-muted'" />
      <p class="truncate text-xs text-muted">{{ s.taskTitle ?? 'Not linked to a task' }}</p>
    </div>

    <div class="no-drag flex items-center gap-0.5">
      <button
        type="button"
        :aria-label="s.status === 'running' ? 'Pause' : s.status === 'paused' ? 'Resume' : 'Start'"
        class="grid size-9 place-items-center rounded-full text-text hover:bg-surface-2"
        @click="timer.toggle()"
      >
        <Pause v-if="s.status === 'running'" :size="17" :stroke-width="2" />
        <Play v-else :size="17" :stroke-width="2" />
      </button>
      <button
        type="button"
        aria-label="Open FocusFlow"
        title="Open FocusFlow"
        class="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        @click="desktop().app.showMainWindow()"
      >
        <Maximize2 :size="15" :stroke-width="1.75" />
      </button>
      <button
        type="button"
        aria-label="Close mini timer"
        title="Close mini timer"
        class="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        @click="desktop().app.closeMiniTimer()"
      >
        <X :size="15" :stroke-width="1.75" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.drag {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
