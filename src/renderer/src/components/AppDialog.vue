<script setup lang="ts">
import { useI18n } from '@/i18n'
import { nextTick, onMounted, ref, watch } from 'vue'
import { X } from '@lucide/vue'

const { t } = useI18n()

/**
 * Modal built on the native <dialog>: focus is trapped and Escape closes it
 * without extra code. Clicking the backdrop also closes it.
 */
const props = withDefaults(defineProps<{ title: string; width?: string }>(), { width: '32rem' })
const open = defineModel<boolean>('open', { required: true })
const el = ref<HTMLDialogElement | null>(null)

function sync(value: boolean): void {
  const d = el.value
  if (!d) return
  if (value && !d.open) {
    d.showModal()
    void nextTick(() => d.querySelector<HTMLElement>('[autofocus]')?.focus())
  } else if (!value && d.open) {
    d.close()
  }
}

watch(open, sync)
onMounted(() => sync(open.value))

function onBackdrop(e: MouseEvent): void {
  if (e.target === el.value) open.value = false
}
</script>

<template>
  <dialog
    ref="el"
    class="app-dialog m-auto max-h-[85vh] rounded-2xl border border-line bg-surface p-0 text-text shadow-2xl"
    :style="{ width: `min(${props.width}, calc(100vw - 2rem))` }"
    :aria-label="title"
    @close="open = false"
    @mousedown="onBackdrop"
  >
    <div class="flex items-center justify-between px-6 pt-5">
      <h2 class="text-xl font-semibold">{{ title }}</h2>
      <button
        type="button"
        :aria-label="t('common.close')"
        class="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
        @click="open = false"
      >
        <X :size="16" :stroke-width="1.75" />
      </button>
    </div>
    <div class="px-6 pt-4 pb-6">
      <slot />
    </div>
  </dialog>
</template>

<style>
.app-dialog::backdrop {
  background: rgb(5 6 10 / 0.55);
}
.app-dialog[open] {
  animation: dialog-in 140ms ease-out;
}
@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.99);
  }
}
</style>
