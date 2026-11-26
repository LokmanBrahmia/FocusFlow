<script setup lang="ts">
import { computed } from 'vue'
import { PictureInPicture2, Pause, Play, RotateCcw, SkipForward, Square, X } from '@lucide/vue'
import { SESSION_TYPES, type SessionType } from '@shared/timer'
import TimerRing from '@/components/TimerRing.vue'
import TimerDigits from '@/components/TimerDigits.vue'
import TaskPicker from '@/components/TaskPicker.vue'
import { useTimerStore } from '@/stores/timer'
import { useSettingsStore } from '@/stores/settings'
import { useTaskList } from '@/composables/useTaskList'
import { useStatistics } from '@/composables/useStatistics'
import { desktop } from '@/services/desktop'
import { todayISO } from '@/utils/dates'
import { useI18n } from '@/i18n'

/**
 * A deliberate focus space. Three layers, in order of attention:
 * the timer (centre), the session cycle (just below), and one dock that joins
 * the task being worked on to the controls that drive the session.
 */
const timer = useTimerStore()
const settings = useSettingsStore()
const { t, f } = useI18n()

const s = computed(() => timer.state)
const tone = computed(() => (timer.isBreak ? 'break' : 'focus'))

// ── today's focus, shown quietly in the top bar ─────────────────────────────
const today = todayISO()
const { stats } = useStatistics(() => ({ from: today, to: today }))
const todayMin = computed(() => Math.floor((stats.value?.totals.focusSeconds ?? 0) / 60))
const goalMin = computed(() => settings.settings.dailyGoalMinutes)

// ── the linked task, with progress that moves while you focus ───────────────
const { tasks } = useTaskList(() => ({ status: 'open', sort: 'priority', limit: 500 }))
const task = computed(() => tasks.value.find((x) => x.id === s.value?.taskId) ?? null)
const elapsedMin = computed(() => {
  const st = s.value
  if (!st || st.status === 'idle' || st.sessionType !== 'focus') return 0
  return Math.max(0, Math.floor((st.plannedDurationSeconds * 1000 - timer.remainingMs) / 60000))
})
const taskFocused = computed(() => (task.value ? Math.floor(task.value.focusSeconds / 60) + elapsedMin.value : 0))

// ── status and cycle ────────────────────────────────────────────────────────
const statusLine = computed(() => {
  const st = s.value
  if (!st) return ''
  if (st.status === 'paused') return t('timer.paused')
  if (st.status === 'running' && st.endsAt) return t('timer.endsAt', { time: f.value.time(st.endsAt) })
  return t('timer.length', { time: f.value.duration(st.plannedDurationSeconds / 60) })
})

/** Which focus session of the set this is (1-based), or how many are done during a break. */
const position = computed(() => {
  const st = s.value
  if (!st) return 0
  return Math.min(st.cycleCount + (st.sessionType === 'focus' ? 1 : 0), st.longBreakInterval)
})

/** What follows this session, so the rhythm is visible before it happens. */
const upNext = computed(() => {
  const st = s.value
  if (!st) return ''
  const cfg = settings.settings
  if (st.sessionType !== 'focus') return t('timer.next', { session: t('session.focus'), time: f.value.duration(cfg.focusDurationMinutes) })
  const long = (st.cycleCount + 1) % st.longBreakInterval === 0
  return t('timer.next', {
    session: t(long ? 'session.long_break' : 'session.short_break'),
    time: f.value.duration(long ? cfg.longBreakMinutes : cfg.shortBreakMinutes)
  })
})

const primaryLabel = computed(() => {
  const st = s.value?.status
  if (st === 'running') return t('timer.pause')
  if (st === 'paused') return t('timer.resume')
  return timer.isBreak ? t('timer.startBreak') : t('timer.startFocus')
})

function choose(type: SessionType): void {
  void timer.setSessionType(type)
}
function toggleMini(): void {
  void (timer.miniOpen ? desktop().app.closeMiniTimer() : desktop().app.openMiniTimer())
}
</script>

<template>
  <div v-if="s" class="flex min-h-full flex-col px-10 py-6 max-lg:px-5">
    <!-- Top bar: session type, today's focus, mini timer -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div role="radiogroup" :aria-label="t('timer.sessionType')" class="seg">
        <button
          v-for="type in SESSION_TYPES"
          :key="type"
          type="button"
          role="radio"
          :aria-checked="s.sessionType === type"
          :disabled="s.status !== 'idle' && s.sessionType !== type"
          @click="choose(type)"
        >
          {{ t(`session.${type}`) }}
        </button>
      </div>

      <div class="flex items-center gap-4">
        <p class="flex items-center gap-2 text-sm text-muted" :title="t('focus.todayTitle')">
          <span class="track w-20" aria-hidden="true">
            <span :style="{ width: `${Math.min(1, todayMin / Math.max(1, goalMin)) * 100}%` }" />
          </span>
          <span class="tabular-nums">{{ t('focus.today', { done: f.duration(todayMin), goal: f.duration(goalMin) }) }}</span>
        </p>
        <button type="button" class="btn btn-ghost h-8 px-2.5 text-sm" @click="toggleMini">
          <X v-if="timer.miniOpen" :size="15" :stroke-width="1.75" />
          <PictureInPicture2 v-else :size="15" :stroke-width="1.75" />
          {{ timer.miniOpen ? t('focus.closeMini') : t('focus.mini') }}
        </button>
      </div>
    </div>

    <!-- Centre: the timer and the session cycle -->
    <div class="flex flex-1 flex-col items-center justify-center py-6">
      <p class="eyebrow mb-4" :class="timer.isBreak ? '!text-tide' : '!text-accent'">{{ t(`session.${s.sessionType}`) }}</p>
      <div class="w-[min(24rem,58vh,100%)]">
        <TimerRing :progress="timer.progress" :tone="tone" :dimmed="s.status === 'paused'">
          <TimerDigits :ms="timer.remainingMs" class="text-[23cqi]" :class="s.status === 'paused' && 'text-muted'" />
          <p class="mt-[2.5cqi] text-base text-muted">{{ statusLine }}</p>
        </TimerRing>
      </div>

      <!-- The set: one segment per focus session, the long break at the end -->
      <div class="mt-7 flex flex-col items-center gap-2">
        <ol class="flex items-center gap-1.5" :aria-label="t('timer.cycle', { n: position, total: s.longBreakInterval })">
          <li
            v-for="i in s.longBreakInterval"
            :key="i"
            class="h-1.5 w-8 rounded-full transition-colors"
            :class="
              i <= s.cycleCount
                ? 'bg-accent'
                : i === s.cycleCount + 1 && s.sessionType === 'focus'
                  ? 'bg-accent/40'
                  : 'bg-line'
            "
          />
          <li class="ms-1 size-1.5 rounded-full" :class="s.sessionType === 'long_break' ? 'bg-tide' : 'bg-line'" aria-hidden="true" />
        </ol>
        <p class="text-sm text-muted">
          {{ s.sessionType === 'focus' ? t('timer.cycle', { n: position, total: s.longBreakInterval }) : t('timer.cycleDone', { n: s.cycleCount, total: s.longBreakInterval }) }}
          <span class="text-faint"> · {{ upNext }}</span>
        </p>
      </div>
    </div>

    <!-- Dock: the task and the controls, together -->
    <div class="mx-auto w-full max-w-2xl">
      <div class="panel flex items-center gap-4 p-3 ps-4 max-sm:flex-col max-sm:items-stretch">
        <div class="min-w-0 flex-1">
          <p class="eyebrow">{{ t('focus.workingOn') }}</p>
          <TaskPicker />
          <div v-if="task?.estimatedMinutes" class="mt-1.5 flex items-center gap-2 text-xs text-muted tabular-nums">
            <span class="track w-28" aria-hidden="true">
              <span :style="{ width: `${Math.min(1, taskFocused / task.estimatedMinutes) * 100}%` }" />
            </span>
            {{ t('task.ofEstimate', { done: f.duration(taskFocused), total: f.duration(task.estimatedMinutes) }) }}
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 max-sm:justify-center">
          <button
            type="button"
            :title="t('timer.reset')"
            :aria-label="t('timer.reset')"
            class="icon-btn size-11 rounded-full border border-line"
            :disabled="s.status === 'idle'"
            @click="timer.reset()"
          >
            <RotateCcw :size="18" :stroke-width="1.75" />
          </button>
          <button
            type="button"
            class="btn h-12 min-w-36 rounded-full px-6 text-base"
            :class="timer.isBreak ? 'bg-tide text-bg hover:brightness-110' : 'btn-primary'"
            aria-keyshortcuts="Space"
            @click="timer.toggle()"
          >
            <Pause v-if="s.status === 'running'" :size="18" :stroke-width="2.25" />
            <Play v-else :size="18" :stroke-width="2.25" />
            {{ primaryLabel }}
          </button>
          <button
            type="button"
            :title="s.sessionType === 'focus' ? t('timer.skipToBreak') : t('timer.skipToFocus')"
            :aria-label="s.sessionType === 'focus' ? t('timer.skipToBreak') : t('timer.skipToFocus')"
            class="icon-btn size-11 rounded-full border border-line"
            @click="timer.skip()"
          >
            <SkipForward :size="18" :stroke-width="1.75" />
          </button>
        </div>
      </div>

      <div class="mt-3 flex h-6 items-center justify-center gap-4 text-sm text-muted">
        <button
          v-if="s.status !== 'idle'"
          type="button"
          class="inline-flex items-center gap-1.5 hover:text-text"
          @click="timer.end()"
        >
          <Square :size="11" :stroke-width="2" /> {{ t('timer.end') }}
        </button>
        <span v-else class="text-faint">{{ t('focus.spaceHint') }}</span>
      </div>
      <p v-if="timer.error" role="alert" class="mt-2 text-center text-sm text-danger">{{ timer.error }}</p>
    </div>
  </div>
</template>
