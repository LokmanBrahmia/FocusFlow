<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { X } from '@lucide/vue'
import { MAX_NOTE } from '@shared/statistics'
import { desktop } from '@/services/desktop'
import { useToastStore } from '@/stores/toasts'

/**
 * Optional, non-modal check-in after a completed focus session. It never
 * blocks or pauses the timer: the next break runs underneath it, and a newer
 * session simply replaces an unanswered prompt.
 */
const toasts = useToastStore()
const sessionId = ref<string | null>(null)
const rating = ref<number | null>(null)
const note = ref('')
const saving = ref(false)

const LABELS = ['Very distracted', 'Distracted', 'Okay', 'Focused', 'Deeply focused']

const off = desktop().timer.onEvent((e) => {
  if (e.type !== 'session-finished' || e.sessionType !== 'focus' || e.outcome !== 'completed' || e.recovered) return
  sessionId.value = e.sessionId
  rating.value = null
  note.value = ''
})
onBeforeUnmount(off)

function dismiss(): void {
  sessionId.value = null
}

async function save(): Promise<void> {
  if (!sessionId.value || rating.value === null) return
  saving.value = true
  try {
    await desktop().sessions.rate(sessionId.value, rating.value, note.value || null)
    toasts.show('Rating saved')
    dismiss()
  } catch (err) {
    toasts.error(err, 'The rating could not be saved.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Transition name="prompt">
    <section
      v-if="sessionId"
      aria-labelledby="rating-title"
      class="fixed bottom-5 left-5 z-40 w-[22rem] rounded-2xl border border-line bg-surface p-4 shadow-2xl max-lg:left-20"
      @keydown.esc.stop="dismiss"
    >
      <div class="flex items-start justify-between gap-3">
        <h2 id="rating-title" class="font-semibold">How focused were you during this session?</h2>
        <button
          type="button"
          aria-label="Skip rating"
          class="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          @click="dismiss"
        >
          <X :size="15" />
        </button>
      </div>

      <div role="radiogroup" aria-label="Focus rating" class="mt-3 grid grid-cols-5 gap-1.5">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          role="radio"
          :aria-checked="rating === n"
          :aria-label="`${n}: ${LABELS[n - 1]}`"
          :title="LABELS[n - 1]"
          class="h-10 rounded-lg border text-lg tabular-nums transition-colors"
          :class="rating === n ? 'border-accent bg-accent text-on-accent' : 'border-line hover:bg-surface-2'"
          @click="rating = n"
        >
          {{ n }}
        </button>
      </div>
      <p class="mt-1.5 flex justify-between text-xs text-faint" aria-hidden="true">
        <span>{{ LABELS[0] }}</span><span>{{ LABELS[4] }}</span>
      </p>

      <template v-if="rating !== null">
        <label class="mt-3 block">
          <span class="sr-only">Note (optional)</span>
          <textarea
            v-model="note"
            rows="2"
            :maxlength="MAX_NOTE"
            placeholder="Anything worth remembering? (optional)"
            class="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <div class="mt-2 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-lg px-3 text-muted hover:bg-surface-2" @click="dismiss">Skip</button>
          <button
            type="button"
            :disabled="saving"
            class="h-8 rounded-lg bg-accent px-3 font-medium text-on-accent hover:brightness-110 disabled:opacity-50"
            @click="save"
          >
            Save rating
          </button>
        </div>
      </template>
    </section>
  </Transition>
</template>

<style scoped>
.prompt-enter-active,
.prompt-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
