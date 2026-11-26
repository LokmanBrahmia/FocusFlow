<script setup lang="ts">
import { useI18n } from '@/i18n'
import { CircleAlert, CircleCheck, X } from '@lucide/vue'
import { useToastStore } from '@/stores/toasts'

const { t } = useI18n()

const store = useToastStore()
</script>

<template>
  <div class="pointer-events-none fixed end-5 bottom-5 z-50 flex w-80 flex-col gap-2" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 py-2.5 ps-3.5 pe-2 shadow-lg"
      >
        <CircleCheck v-if="toast.tone === 'success'" :size="16" class="mt-0.5 shrink-0 text-moss" />
        <CircleAlert v-else :size="16" class="mt-0.5 shrink-0 text-danger" />
        <p class="flex-1">{{ toast.message }}</p>
        <button
          type="button"
          :aria-label="t('common.dismiss')"
          class="grid size-6 place-items-center rounded text-muted hover:text-text"
          @click="store.dismiss(toast.id)"
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
