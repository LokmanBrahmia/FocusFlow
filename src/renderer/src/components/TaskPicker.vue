<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronDown, Search, Unlink } from '@lucide/vue'
import type { Task } from '@shared/tasks'
import { useTaskList } from '@/composables/useTaskList'
import { useSubjectStore } from '@/stores/subjects'
import { useTimerStore } from '@/stores/timer'
import { useI18n } from '@/i18n'

/** Lets the user link the current (or next) focus session to an open task. */
const timer = useTimerStore()
const subjects = useSubjectStore()
const { t } = useI18n()

const open = ref(false)
const search = ref('')
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

const { tasks, loading } = useTaskList(
  () => ({ status: 'open', search: search.value, sort: 'priority', limit: 50 }),
  { debounceMs: 100 }
)

const current = computed(() => timer.state?.taskTitle ?? null)
const active = ref(0)

watch(open, async (v) => {
  if (v) {
    search.value = ''
    active.value = 0
    await nextTick()
    input.value?.focus()
  }
})
watch(tasks, () => (active.value = 0))

async function choose(task: Task | null): Promise<void> {
  open.value = false
  await timer.setTask(task?.id ?? null)
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation()
    open.value = false
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, tasks.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter' && tasks.value[active.value]) {
    e.preventDefault()
    void choose(tasks.value[active.value])
  }
}

function onOutside(e: MouseEvent): void {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
window.addEventListener('mousedown', onOutside)
onBeforeUnmount(() => window.removeEventListener('mousedown', onOutside))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      class="-ms-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-lg transition-colors hover:bg-surface-2"
      @click="open = !open"
    >
      <span class="truncate" :class="!current && 'text-muted'">{{ current ?? t('picker.choose') }}</span>
      <ChevronDown :size="16" class="shrink-0 text-faint" />
    </button>

    <div
      v-if="open"
      class="absolute start-0 bottom-full z-20 mb-3 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface text-start shadow-2xl"
      @keydown="onKey"
    >
      <label class="flex items-center gap-2 border-b border-line px-3">
        <Search :size="15" class="text-faint" />
        <span class="sr-only">{{ t('picker.search') }}</span>
        <input ref="input" v-model="search" :placeholder="t('picker.search')" class="h-10 flex-1 bg-transparent outline-none" />
      </label>
      <ul role="listbox" :aria-label="t('picker.list')" class="max-h-72 overflow-y-auto p-1">
        <li v-if="loading && tasks.length === 0" class="px-3 py-2 text-muted">{{ t('common.loading') }}</li>
        <li v-else-if="tasks.length === 0" class="px-3 py-2 text-muted">
          {{ search ? t('picker.noMatch') : t('picker.none') }}
        </li>
        <li
          v-for="(task, i) in tasks"
          :key="task.id"
          role="option"
          :aria-selected="timer.state?.taskId === task.id"
          class="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2"
          :class="i === active ? 'bg-surface-2' : ''"
          @mouseenter="active = i"
          @click="choose(task)"
        >
          <span
            class="size-2 shrink-0 rounded-full"
            :style="{ background: subjectColor(task.subjectId ? subjects.byId.get(task.subjectId)?.color : null, 'var(--line)') }"
          />
          <span class="flex-1 truncate">{{ task.title }}</span>
          <span v-if="task.priority === 'high'" class="text-xs text-accent">{{ t('priority.highShort') }}</span>
        </li>
      </ul>
      <button
        v-if="current"
        type="button"
        class="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-muted hover:bg-surface-2 hover:text-text"
        @click="choose(null)"
      >
        <Unlink :size="14" /> {{ t('picker.unlink') }}
      </button>
    </div>
  </div>
</template>
