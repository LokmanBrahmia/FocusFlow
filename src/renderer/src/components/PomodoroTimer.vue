<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { Pause, Play, RotateCcw, SkipForward, Square } from '@lucide/vue'
import { SESSION_LABELS, SESSION_TYPES, type SessionType } from '@shared/timer'
import { useTimerStore } from '@/stores/timer'
import TimerRing from './TimerRing.vue'
import TimerDigits from './TimerDigits.vue'
import CycleDots from './CycleDots.vue'
import TaskPicker from './TaskPicker.vue'

const timer = useTimerStore()
const s = computed(() => timer.state)

const tone = computed(() => (timer.isBreak ? 'break' : 'focus'))

const statusLine = computed(() => {
  const st = s.value
  if (!st) return ''
  if (st.status === 'paused') return 'Paused'
  if (st.status === 'running' && st.endsAt) return `Ends at ${format(st.endsAt, 'HH:mm')}`
  return `${st.plannedDurationSeconds / 60} minutes`
})

const cycleLine = computed(() => {
  const st = s.value
  if (!st) return ''
  const n = Math.min(st.cycleCount + (st.sessionType === 'focus' ? 1 : 0), st.longBreakInterval)
  return st.sessionType === 'focus'
    ? `Session ${n} of ${st.longBreakInterval}`
    : `${st.cycleCount} of ${st.longBreakInterval} sessions done`
})

const primaryLabel = computed(() => {
  const st = s.value?.status
  if (st === 'running') return 'Pause'
  if (st === 'paused') return 'Resume'
  return timer.isBreak ? 'Start break' : 'Start focus'
})

function choose(type: SessionType): void {
  void timer.setSessionType(type)
}
</script>

<template>
  <div v-if="s" class="flex flex-col items-center">
    <div
      role="radiogroup"
      aria-label="Session type"
      class="inline-flex rounded-xl border border-line bg-surface p-1"
    >
      <button
        v-for="type in SESSION_TYPES"
        :key="type"
        type="button"
        role="radio"
        :aria-checked="s.sessionType === type"
        :disabled="s.status !== 'idle' && s.sessionType !== type"
        class="h-8 rounded-lg px-3.5 text-muted transition-colors enabled:hover:text-text disabled:opacity-40"
        :class="s.sessionType === type && 'bg-surface-2 text-text'"
        @click="choose(type)"
      >
        {{ SESSION_LABELS[type] }}
      </button>
    </div>

    <div class="mt-10 w-[min(25rem,70vh,100%)]">
      <TimerRing :progress="timer.progress" :tone="tone" :dimmed="s.status === 'paused'">
        <TimerDigits
          :ms="timer.remainingMs"
          class="text-[24cqi]"
          :class="s.status === 'paused' && 'text-muted'"
        />
        <p class="mt-[3cqi] text-base text-muted">{{ statusLine }}</p>
      </TimerRing>
    </div>

    <div class="mt-6 flex flex-col items-center gap-2 text-center">
      <TaskPicker />
      <p class="flex items-center gap-2.5 text-sm text-muted">
        <CycleDots
          :completed="s.cycleCount"
          :total="s.longBreakInterval"
          :current="s.sessionType === 'focus'"
        />
        {{ cycleLine }}
      </p>
    </div>

    <div class="mt-8 flex items-center gap-3">
      <button
        type="button"
        title="Reset session"
        aria-label="Reset session"
        class="grid size-11 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
        :disabled="s.status === 'idle'"
        @click="timer.reset()"
      >
        <RotateCcw :size="18" :stroke-width="1.75" />
      </button>

      <button
        type="button"
        class="flex h-13 min-w-40 items-center justify-center gap-2 rounded-full px-7 text-lg font-medium transition-[filter] hover:brightness-110"
        :class="timer.isBreak ? 'bg-tide text-bg' : 'bg-iris text-white'"
        @click="timer.toggle()"
      >
        <Pause v-if="s.status === 'running'" :size="18" :stroke-width="2.25" />
        <Play v-else :size="18" :stroke-width="2.25" />
        {{ primaryLabel }}
      </button>

      <button
        type="button"
        :title="s.sessionType === 'focus' ? 'Skip to break' : 'Skip to focus'"
        :aria-label="s.sessionType === 'focus' ? 'Skip to break' : 'Skip to focus'"
        class="grid size-11 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-2 hover:text-text"
        @click="timer.skip()"
      >
        <SkipForward :size="18" :stroke-width="1.75" />
      </button>
    </div>

    <button
      v-if="s.status !== 'idle'"
      type="button"
      class="mt-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      @click="timer.end()"
    >
      <Square :size="12" :stroke-width="2" />
      End session and keep the time
    </button>

    <p v-if="timer.error" role="alert" class="mt-4 text-sm text-danger">{{ timer.error }}</p>
  </div>
</template>
