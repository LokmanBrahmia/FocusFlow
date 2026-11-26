<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Pause, Play, Timer } from '@lucide/vue'
import { formatClock } from '@shared/timer'
import { useTimerStore } from '@/stores/timer'
import { useI18n } from '@/i18n'

/**
 * The sidebar's "now" card: the running session at a glance with its one
 * control, or the primary action (start focusing) when nothing runs.
 * Hidden on the Focus screen itself, where the timer is the whole page.
 */
const timer = useTimerStore()
const route = useRoute()
const { t } = useI18n()

const s = computed(() => timer.state)
const active = computed(() => !!s.value && s.value.status !== 'idle')
const onFocusPage = computed(() => route.name === 'focus')
const sessionLabel = computed(() => (s.value ? t(`session.${s.value.sessionType}`) : ''))
</script>

<template>
  <div v-if="s && !onFocusPage">
    <!-- Running or paused -->
    <div
      v-if="active"
      class="panel flex items-center gap-2.5 bg-surface-2/50 p-2.5 max-lg:flex-col max-lg:border-0 max-lg:bg-transparent max-lg:p-0"
    >
      <RouterLink
        to="/focus"
        class="min-w-0 flex-1 rounded-lg max-lg:hidden"
        :title="t('now.open')"
      >
        <span class="flex items-center gap-1.5 text-xs" :class="timer.isBreak ? 'text-tide' : 'text-accent'">
          <span class="size-1.5 rounded-full" :class="timer.isBreak ? 'bg-tide' : 'bg-accent'" aria-hidden="true" />
          {{ s.status === 'paused' ? t('now.paused', { session: sessionLabel }) : sessionLabel }}
        </span>
        <span class="timer-digits block text-2xl leading-tight" dir="ltr" :class="s.status === 'paused' && 'text-muted'">
          {{ formatClock(timer.remainingMs) }}
        </span>
        <span class="block truncate text-xs text-muted">{{ s.taskTitle ?? t('now.noTask') }}</span>
      </RouterLink>
      <button
        type="button"
        class="icon-btn shrink-0 border border-line"
        :aria-label="s.status === 'running' ? t('timer.pause') : t('timer.resume')"
        :title="s.status === 'running' ? t('timer.pause') : t('timer.resume')"
        @click="timer.toggle()"
      >
        <Pause v-if="s.status === 'running'" :size="16" :stroke-width="2" />
        <Play v-else :size="16" :stroke-width="2" />
      </button>
    </div>

    <!-- Idle: the primary action, always one click away -->
    <RouterLink
      v-else
      to="/focus"
      class="btn btn-primary w-full max-lg:px-0"
      :title="t('now.start')"
    >
      <Timer :size="16" :stroke-width="2" />
      <span class="max-lg:sr-only">{{ t('now.start') }}</span>
    </RouterLink>
  </div>
</template>
