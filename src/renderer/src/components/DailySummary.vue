<script setup lang="ts">
import { computed } from 'vue'
import { formatMinutes } from '@shared/tasks'
import { useStatistics } from '@/composables/useStatistics'
import { todayISO } from '@/utils/dates'

/** Today's figures on the Dashboard, from the same source as the Statistics page. */
const today = todayISO()
const { stats } = useStatistics(() => ({ from: today, to: today }))

const focusMin = computed(() => Math.floor((stats.value?.totals.focusSeconds ?? 0) / 60))
const goal = computed(() => stats.value?.goalMinutes ?? 0)
const progress = computed(() => (goal.value ? Math.min(1, focusMin.value / goal.value) : 0))
const reached = computed(() => goal.value > 0 && focusMin.value >= goal.value)
const plural = (n: number, one: string): string => `${n} ${n === 1 ? one : `${one}s`}`
</script>

<template>
  <section v-if="stats" aria-label="Today so far" class="mb-10">
    <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p>
        <span class="page-title text-3xl tabular-nums">{{ formatMinutes(focusMin) }}</span>
        <span class="ml-2 text-muted">of {{ formatMinutes(goal) }} focused today</span>
      </p>
      <p class="text-sm" :class="reached ? 'text-moss' : 'text-muted'">
        {{ reached ? 'Daily goal reached' : `${formatMinutes(goal - focusMin)} to go` }}
      </p>
    </div>
    <div
      class="mt-3 h-2 overflow-hidden rounded-full bg-line/50"
      role="progressbar"
      :aria-valuenow="focusMin"
      :aria-valuemin="0"
      :aria-valuemax="goal"
      aria-label="Daily focus goal"
    >
      <div
        class="h-full rounded-full transition-[width] duration-500"
        :class="reached ? 'bg-moss' : 'bg-iris'"
        :style="{ width: `${progress * 100}%` }"
      />
    </div>
    <dl class="mt-4 flex flex-wrap gap-x-10 gap-y-2 text-sm">
      <div class="flex gap-1.5"><dt class="text-muted">Pomodoros</dt><dd class="tabular-nums">{{ stats.totals.sessions }}</dd></div>
      <div class="flex gap-1.5"><dt class="text-muted">Tasks completed</dt><dd class="tabular-nums">{{ stats.totals.tasksCompleted }}</dd></div>
      <div class="flex gap-1.5">
        <dt class="text-muted">Streak</dt>
        <dd>{{ plural(stats.streak.current, 'day') }}</dd>
      </div>
    </dl>
  </section>
</template>
