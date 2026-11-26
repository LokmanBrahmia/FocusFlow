<script setup lang="ts">
import { useI18n } from '@/i18n'
import { computed } from 'vue'
import { Maximize2, Pause, Play, X } from '@lucide/vue'
import TimerDigits from '@/components/TimerDigits.vue'
import TimerRing from '@/components/TimerRing.vue'
import { useTimerStore } from '@/stores/timer'
import { desktop } from '@/services/desktop'

const { t } = useI18n()

const timer = useTimerStore()
const s = computed(() => timer.state)
const label = computed(() => {
  if (!s.value) return ''
  const base = t(`session.${s.value.sessionType}`)
  return s.value.status === 'paused' ? t('now.paused', { session: base }) : base
})
</script>

<template>
  <div
    v-if="s"
    class="drag flex h-screen items-center gap-3 border border-line bg-surface ps-3 pe-2"
  >
    <div class="w-12 shrink-0">
      <TimerRing :progress="timer.progress" :tone="timer.isBreak ? 'break' : 'focus'" :dimmed="s.status === 'paused'" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-xs" :class="timer.isBreak ? 'text-tide' : 'text-accent'">{{ label }}</p>
      <TimerDigits :ms="timer.remainingMs" class="text-[1.9rem]" :class="s.status === 'paused' && 'text-muted'" />
      <p class="truncate text-xs text-muted">{{ s.taskTitle ?? t('now.noTask') }}</p>
    </div>

    <div class="no-drag flex items-center gap-0.5">
      <button
        type="button"
        :aria-label="s.status === 'running' ? t('timer.pause') : s.status === 'paused' ? t('timer.resume') : t('timer.start')"
        class="grid size-9 place-items-center rounded-full text-text hover:bg-surface-2"
        @click="timer.toggle()"
      >
        <Pause v-if="s.status === 'running'" :size="17" :stroke-width="2" />
        <Play v-else :size="17" :stroke-width="2" />
      </button>
      <button
        type="button"
        :aria-label="t('mini.open')"
        :title="t('mini.open')"
        class="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        @click="desktop().app.showMainWindow()"
      >
        <Maximize2 :size="15" :stroke-width="1.75" />
      </button>
      <button
        type="button"
        :aria-label="t('focus.closeMini')"
        :title="t('focus.closeMini')"
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
