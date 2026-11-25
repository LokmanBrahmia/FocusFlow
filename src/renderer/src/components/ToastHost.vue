<script setup lang="ts">
import { CircleAlert, CircleCheck, X } from '@lucide/vue'
import { useToastStore } from '@/stores/toasts'

const store = useToastStore()
</script>

<template>
  <div class="pointer-events-none fixed right-5 bottom-5 z-50 flex w-80 flex-col gap-2" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in store.toasts"
        :key="t.id"
        :role="t.tone === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 py-2.5 pr-2 pl-3.5 shadow-lg"
      >
        <CircleCheck v-if="t.tone === 'success'" :size="16" class="mt-0.5 shrink-0 text-moss" />
        <CircleAlert v-else :size="16" class="mt-0.5 shrink-0 text-danger" />
        <p class="flex-1">{{ t.message }}</p>
        <button
          type="button"
          aria-label="Dismiss"
          class="grid size-6 place-items-center rounded text-muted hover:text-text"
          @click="store.dismiss(t.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
