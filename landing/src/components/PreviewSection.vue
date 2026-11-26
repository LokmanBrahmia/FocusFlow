<script setup lang="ts">
import { computed, ref } from 'vue'
// Imported, not served from public/, so each build gives them content-hashed
// URLs: a new screenshot is never hidden behind a browser's cached copy.
import planner from '../assets/screenshots/planner.webp'
import week from '../assets/screenshots/week.webp'
import tasks from '../assets/screenshots/tasks.webp'
import stats from '../assets/screenshots/stats.webp'

/** Real screenshots of the app (sample data), switched by tabs. */
const screens = [
  {
    id: 'planner',
    label: 'Planner',
    src: planner,
    caption: 'Plan study blocks for the day and see, next to them, the focus you actually recorded.',
    alt: 'Day planner: a timeline with planned study blocks on the left, recorded focus sessions on the right, and the day’s tasks with progress bars.'
  },
  {
    id: 'week',
    label: 'Week',
    src: week,
    caption: 'Seven days side by side, with planned and focused time for each. Drag a task to another day to move it.',
    alt: 'Week planner: seven columns with planned and focused time bars and the tasks planned for each day.'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    src: tasks,
    caption: 'Tasks grouped by subject, with priorities, deadlines and focused time against your estimate.',
    alt: 'Task list filtered by subject, showing priorities, deadlines and progress against estimates.'
  },
  {
    id: 'stats',
    label: 'Statistics',
    src: stats,
    caption: 'Focus time per day against your goal, completed Pomodoros, tasks and your study streak.',
    alt: 'Statistics: focus time, Pomodoros, tasks completed and study streak, with a bar chart of focus time per day.'
  }
]

const active = ref(screens[0].id)
const current = computed(() => screens.find((s) => s.id === active.value) ?? screens[0])

function onKey(e: KeyboardEvent): void {
  const i = screens.findIndex((s) => s.id === active.value)
  const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null
  if (next === null) return
  e.preventDefault()
  const s = screens[(next + screens.length) % screens.length]
  active.value = s.id
  document.getElementById(`tab-${s.id}`)?.focus()
}
</script>

<template>
  <section aria-labelledby="preview-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <h2 id="preview-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">See it in use</h2>
    <p class="mt-3 max-w-[40rem] text-lg text-muted">Every screen below is a real screenshot of Azm, filled with sample data.</p>

    <div role="tablist" aria-label="Screens" class="mt-8 flex flex-wrap gap-1" @keydown="onKey">
      <button
        v-for="s in screens"
        :id="`tab-${s.id}`"
        :key="s.id"
        type="button"
        role="tab"
        :aria-selected="active === s.id"
        :aria-controls="`panel-${s.id}`"
        :tabindex="active === s.id ? 0 : -1"
        class="h-10 rounded-lg px-4 transition-colors"
        :class="active === s.id ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'"
        @click="active = s.id"
      >
        {{ s.label }}
      </button>
    </div>

    <figure :id="`panel-${current.id}`" role="tabpanel" :aria-labelledby="`tab-${current.id}`" class="mt-5">
      <div class="overflow-hidden rounded-2xl border border-line bg-surface">
        <img :src="current.src" :alt="current.alt" width="1600" height="1000" loading="lazy" class="block h-auto w-full" />
      </div>
      <figcaption class="mt-3 max-w-[48rem] text-muted">{{ current.caption }}</figcaption>
    </figure>
  </section>
</template>
