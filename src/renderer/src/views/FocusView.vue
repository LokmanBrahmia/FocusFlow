<script setup lang="ts">
import { PictureInPicture2, X } from '@lucide/vue'
import PomodoroTimer from '@/components/PomodoroTimer.vue'
import { useTimerStore } from '@/stores/timer'
import { desktop } from '@/services/desktop'

const timer = useTimerStore()

function toggleMini(): void {
  void (timer.miniOpen ? desktop().app.closeMiniTimer() : desktop().app.openMiniTimer())
}
</script>

<template>
  <div class="flex min-h-[calc(100vh-5rem)] flex-col">
    <div class="flex justify-end">
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-muted transition-colors hover:bg-surface-2 hover:text-text"
        @click="toggleMini"
      >
        <X v-if="timer.miniOpen" :size="16" :stroke-width="1.75" />
        <PictureInPicture2 v-else :size="16" :stroke-width="1.75" />
        {{ timer.miniOpen ? 'Close mini timer' : 'Mini timer' }}
      </button>
    </div>
    <div class="flex flex-1 items-center justify-center pb-6">
      <PomodoroTimer />
    </div>
  </div>
</template>
