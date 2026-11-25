<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Plus } from '@lucide/vue'
import type { TimeBlock, TimeBlockInput } from '@shared/planner'
import { formatMinutes } from '@shared/tasks'
import PageHeader from '@/components/PageHeader.vue'
import WeekPlanner from '@/components/WeekPlanner.vue'
import DayTimeline from '@/components/DayTimeline.vue'
import TimeBlockDialog from '@/components/TimeBlockDialog.vue'
import TaskList from '@/components/TaskList.vue'
import PlanVsActual from '@/components/PlanVsActual.vue'
import { usePlanRange } from '@/composables/usePlanRange'
import { useTaskList } from '@/composables/useTaskList'
import { useTaskActions } from '@/stores/taskActions'
import { useSettingsStore } from '@/stores/settings'
import { isDateString } from '@shared/tasks'
import { parseDay, todayISO } from '@/utils/dates'

const route = useRoute()
const router = useRouter()
const actions = useTaskActions()
const settings = useSettingsStore()

// View and date live in the URL so "Open today's plan" can deep-link.
const view = computed<'day' | 'week'>(() => (route.query.view === 'day' ? 'day' : 'week'))
const date = computed(() => {
  const q = route.query.date
  return typeof q === 'string' && isDateString(q) ? q : todayISO()
})
const weekStart = computed(() => format(startOfWeek(parseDay(date.value), { weekStartsOn: 1 }), 'yyyy-MM-dd'))

const { days, loading, error } = usePlanRange(() =>
  view.value === 'week' ? { from: weekStart.value, days: 7 } : { from: date.value, days: 1 }
)
const day = computed(() => (view.value === 'day' ? days.value[0] : undefined))

const title = computed(() => {
  if (view.value === 'day') return format(parseDay(date.value), 'EEEE, d MMMM')
  const start = parseDay(weekStart.value)
  const end = addDays(start, 6)
  return start.getMonth() === end.getMonth()
    ? `${format(start, 'd')}–${format(end, 'd MMMM')}`
    : `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
})

const weekTotals = computed(() => ({
  planned: days.value.reduce((s, d) => s + d.plannedMinutes, 0),
  focused: Math.round(days.value.reduce((s, d) => s + d.focusSeconds, 0) / 60)
}))

const subtitle = computed(() => {
  if (view.value === 'week') {
    const { planned, focused } = weekTotals.value
    return `${formatMinutes(planned)} planned, ${formatMinutes(focused)} focused this week.`
  }
  return 'Planned blocks on the left, the focus you actually recorded on the right.'
})

function go(next: { view?: 'day' | 'week'; date?: string }): void {
  void router.replace({ query: { view: next.view ?? view.value, date: next.date ?? date.value } })
}

function step(dir: 1 | -1): void {
  const d = parseDay(date.value)
  go({ date: format(view.value === 'week' ? addWeeks(d, dir) : addDays(d, dir), 'yyyy-MM-dd') })
}

// ── day view: blocks and planning ───────────────────────────────────────────
const blockOpen = ref(false)
const editingBlock = ref<TimeBlock | null>(null)
const blockDefaults = ref<Partial<TimeBlockInput>>({})

function newBlock(start = '09:00', end = '10:00'): void {
  editingBlock.value = null
  blockDefaults.value = { date: date.value, start, end }
  blockOpen.value = true
}

function editBlock(b: TimeBlock): void {
  editingBlock.value = b
  blockOpen.value = true
}

const { tasks: openTasks } = useTaskList(() => ({ status: 'open', sort: 'priority', limit: 500 }))
const unplanned = computed(() => {
  const planned = new Set(day.value?.tasks.map((t) => t.id))
  return openTasks.value.filter((t) => !planned.has(t.id))
})
const planPick = ref('')

async function planExisting(): Promise<void> {
  if (!planPick.value) return
  await actions.update(planPick.value, { scheduledDate: date.value }, 'Task planned')
  planPick.value = ''
}

const goalMinutes = computed(() => settings.settings.dailyGoalMinutes)
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle">
      <template #actions>
        <div role="radiogroup" aria-label="View" class="inline-flex rounded-xl border border-line bg-surface p-1">
          <button
            v-for="v in ['day', 'week'] as const"
            :key="v"
            type="button"
            role="radio"
            :aria-checked="view === v"
            class="h-7 rounded-lg px-3 text-muted transition-colors hover:text-text"
            :class="view === v && 'bg-surface-2 text-text'"
            @click="go({ view: v })"
          >
            {{ v === 'day' ? 'Day' : 'Week' }}
          </button>
        </div>
        <div class="flex items-center">
          <button
            type="button"
            :aria-label="view === 'week' ? 'Previous week' : 'Previous day'"
            class="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
            @click="step(-1)"
          >
            <ChevronLeft :size="18" />
          </button>
          <button type="button" class="h-9 rounded-lg px-3 hover:bg-surface-2" @click="go({ date: todayISO() })">Today</button>
          <button
            type="button"
            :aria-label="view === 'week' ? 'Next week' : 'Next day'"
            class="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
            @click="step(1)"
          >
            <ChevronRight :size="18" />
          </button>
        </div>
      </template>
    </PageHeader>

    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <p v-else-if="loading && days.length === 0" class="text-muted">Loading the plan…</p>

    <template v-else-if="view === 'week'">
      <WeekPlanner :days="days" @open-day="(d) => go({ view: 'day', date: d })" />
      <p class="mt-3 text-sm text-faint">Drag a task to another day to reschedule it. Planned time is study blocks plus estimates of tasks without a block.</p>
    </template>

    <div v-else-if="day" class="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <DayTimeline :day="day" @create="newBlock" @edit="editBlock" />

      <aside class="flex flex-col gap-8">
        <section aria-labelledby="day-summary">
          <h2 id="day-summary" class="sr-only">Summary</h2>
          <PlanVsActual
            :planned-minutes="day.plannedMinutes"
            :focus-minutes="Math.round(day.focusSeconds / 60)"
            :scale-minutes="Math.max(day.plannedMinutes, goalMinutes, day.focusSeconds / 60)"
          />
          <p class="mt-3 text-sm text-muted">
            Daily goal {{ formatMinutes(goalMinutes) }}.
            <template v-if="day.focusSeconds / 60 >= goalMinutes">Reached.</template>
            <template v-else>{{ formatMinutes(goalMinutes - Math.floor(day.focusSeconds / 60)) }} to go.</template>
          </p>
          <button
            type="button"
            class="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 hover:bg-surface-2"
            @click="newBlock()"
          >
            <Clock :size="15" :stroke-width="1.75" /> Add study block
          </button>
        </section>

        <section aria-labelledby="day-tasks">
          <div class="flex items-baseline justify-between">
            <h2 id="day-tasks" class="font-semibold">Planned tasks</h2>
            <span v-if="day.totalCount" class="text-sm text-muted">{{ day.completedCount }} of {{ day.totalCount }} done</span>
          </div>
          <TaskList v-if="day.tasks.length" :tasks="day.tasks" :show-planned="false" compact class="mt-1" />
          <p v-else class="mt-2 text-sm text-muted">No tasks planned for this day yet.</p>

          <div class="mt-3 flex flex-col gap-2">
            <select
              v-if="unplanned.length"
              v-model="planPick"
              aria-label="Plan an existing task for this day"
              class="h-9 rounded-lg border border-line bg-surface px-2.5 text-muted outline-none focus:border-iris"
              @change="planExisting"
            >
              <option value="">Plan an existing task…</option>
              <option v-for="t in unplanned" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-text"
              @click="actions.openCreate({ scheduledDate: date })"
            >
              <Plus :size="16" /> New task for this day
            </button>
          </div>
        </section>

        <section v-if="day.deadlines.length" aria-labelledby="day-due">
          <h2 id="day-due" class="font-semibold">Due this day</h2>
          <ul class="mt-2 flex flex-col gap-1.5 text-sm">
            <li v-for="t in day.deadlines" :key="t.id" class="text-danger">{{ t.title }}</li>
          </ul>
        </section>
      </aside>
    </div>

    <TimeBlockDialog v-model:open="blockOpen" :block="editingBlock" :defaults="blockDefaults" />
  </div>
</template>
