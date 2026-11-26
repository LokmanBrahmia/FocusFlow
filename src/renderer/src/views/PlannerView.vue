<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Flag, Plus } from '@lucide/vue'
import type { TimeBlock, TimeBlockInput } from '@shared/planner'
import { isDateString } from '@shared/tasks'
import PageHeader from '@/components/PageHeader.vue'
import AppPanel from '@/components/AppPanel.vue'
import WeekPlanner from '@/components/WeekPlanner.vue'
import DayTimeline from '@/components/DayTimeline.vue'
import TimeBlockDialog from '@/components/TimeBlockDialog.vue'
import TaskList from '@/components/TaskList.vue'
import PlanVsActual from '@/components/PlanVsActual.vue'
import { usePlanRange } from '@/composables/usePlanRange'
import { useTaskList } from '@/composables/useTaskList'
import { useTaskActions } from '@/stores/taskActions'
import { useSettingsStore } from '@/stores/settings'
import { parseDay, todayISO } from '@/utils/dates'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const actions = useTaskActions()
const settings = useSettingsStore()
const { t, f, rtl } = useI18n()

// View and date live in the URL so other screens can deep-link to a day.
const view = computed<'day' | 'week'>(() => (route.query.view === 'day' ? 'day' : 'week'))
const date = computed(() => {
  const q = route.query.date
  return typeof q === 'string' && isDateString(q) ? q : todayISO()
})
const today = todayISO()
const weekStart = computed(() => format(startOfWeek(parseDay(date.value), { weekStartsOn: 1 }), 'yyyy-MM-dd'))
const weekEnd = computed(() => format(addDays(parseDay(weekStart.value), 6), 'yyyy-MM-dd'))
const isThisWeek = computed(() => today >= weekStart.value && today <= weekEnd.value)

const { days, loading, error } = usePlanRange(() =>
  view.value === 'week' ? { from: weekStart.value, days: 7 } : { from: date.value, days: 1 }
)
const day = computed(() => (view.value === 'day' ? days.value[0] : undefined))

const goalMinutes = computed(() => settings.settings.dailyGoalMinutes)
const weekTotals = computed(() => ({
  planned: days.value.reduce((s, d) => s + d.plannedMinutes, 0),
  focused: Math.round(days.value.reduce((s, d) => s + d.focusSeconds, 0) / 60),
  done: days.value.reduce((s, d) => s + d.completedCount, 0),
  total: days.value.reduce((s, d) => s + d.totalCount, 0),
  overloaded: days.value.filter((d) => d.plannedMinutes > goalMinutes.value * 1.25).length
}))

const eyebrow = computed(() =>
  view.value === 'day'
    ? date.value === today
      ? t('date.todayTitle')
      : f.value.weekdayLong(date.value)
    : `${f.value.dayMonth(weekStart.value)} – ${f.value.dayMonth(weekEnd.value)}`
)
const title = computed(() => {
  if (view.value === 'day') return f.value.dayMonthLong(date.value)
  return isThisWeek.value ? t('plan.thisWeek') : t('plan.weekOf', { day: f.value.dayMonthLong(weekStart.value) })
})
const subtitle = computed(() => {
  if (view.value === 'day') return t('plan.daySubtitle')
  const w = weekTotals.value
  return t('plan.weekSubtitle', { planned: f.value.duration(w.planned), focused: f.value.duration(w.focused), done: w.done, total: w.total })
})

function go(next: { view?: 'day' | 'week'; date?: string }): void {
  void router.replace({ query: { view: next.view ?? view.value, date: next.date ?? date.value } })
}
function step(dir: 1 | -1): void {
  const d = parseDay(date.value)
  go({ date: format(view.value === 'week' ? addWeeks(d, dir) : addDays(d, dir), 'yyyy-MM-dd') })
}
const Prev = computed(() => (rtl.value ? ChevronRight : ChevronLeft))
const Next = computed(() => (rtl.value ? ChevronLeft : ChevronRight))

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
  const planned = new Set(day.value?.tasks.map((x) => x.id))
  return openTasks.value.filter((x) => !planned.has(x.id))
})
const planPick = ref('')
async function planExisting(): Promise<void> {
  if (!planPick.value) return
  await actions.update(planPick.value, { scheduledDate: date.value }, t('toast.taskPlanned'))
  planPick.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :eyebrow="eyebrow" :title="title" :subtitle="subtitle">
      <template #actions>
        <div role="radiogroup" :aria-label="t('plan.view')" class="seg">
          <button
            v-for="v in ['day', 'week'] as const"
            :key="v"
            type="button"
            role="radio"
            :aria-checked="view === v"
            @click="go({ view: v })"
          >
            {{ v === 'day' ? t('plan.day') : t('plan.week') }}
          </button>
        </div>
        <div class="flex items-center">
          <button type="button" class="icon-btn" :aria-label="view === 'week' ? t('plan.prevWeek') : t('plan.prevDay')" @click="step(-1)">
            <component :is="Prev" :size="18" />
          </button>
          <button type="button" class="btn btn-ghost px-3" @click="go({ date: today })">{{ t('date.todayTitle') }}</button>
          <button type="button" class="icon-btn" :aria-label="view === 'week' ? t('plan.nextWeek') : t('plan.nextDay')" @click="step(1)">
            <component :is="Next" :size="18" />
          </button>
        </div>
      </template>
    </PageHeader>

    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <p v-else-if="loading && days.length === 0" class="text-muted">{{ t('common.loading') }}</p>

    <template v-else-if="view === 'week'">
      <p v-if="weekTotals.overloaded" class="-mt-2 flex items-center gap-2 text-sm text-danger">
        <span class="size-1.5 rounded-full bg-danger" aria-hidden="true" />
        {{ t('plan.overloaded', { count: weekTotals.overloaded, goal: f.duration(goalMinutes) }) }}
      </p>
      <WeekPlanner :days="days" @open-day="(d) => go({ view: 'day', date: d })" />
      <p class="text-sm text-faint">{{ t('plan.weekHint') }}</p>
    </template>

    <div v-else-if="day" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section class="panel p-5" :aria-label="t('plan.timeline')">
        <DayTimeline :day="day" @create="newBlock" @edit="editBlock" />
      </section>

      <aside class="flex flex-col gap-5">
        <AppPanel :title="t('plan.summary')">
          <PlanVsActual
            :planned-minutes="day.plannedMinutes"
            :focus-minutes="Math.round(day.focusSeconds / 60)"
            :scale-minutes="Math.max(day.plannedMinutes, goalMinutes, day.focusSeconds / 60)"
          />
          <p class="mt-3 text-sm text-muted">
            {{ t('plan.goalLine', { goal: f.duration(goalMinutes) }) }}
            {{ day.focusSeconds / 60 >= goalMinutes ? t('plan.goalReached') : t('plan.goalToGo', { time: f.duration(goalMinutes - Math.floor(day.focusSeconds / 60)) }) }}
          </p>
          <button type="button" class="btn btn-quiet mt-4 w-full" @click="newBlock()">
            <Clock :size="15" :stroke-width="1.75" /> {{ t('plan.addBlock') }}
          </button>
        </AppPanel>

        <AppPanel
          :title="t('plan.tasksForDay')"
          :meta="day.totalCount ? t('common.doneOf', { done: day.completedCount, total: day.totalCount }) : undefined"
          flush
        >
          <div class="px-2">
            <TaskList v-if="day.tasks.length" :tasks="day.tasks" :show-planned="false" compact />
            <p v-else class="px-3 pb-2 text-sm text-muted">{{ t('plan.noTasksDay') }}</p>
          </div>
          <div class="flex flex-col gap-2 px-5 pt-2 pb-5">
            <select
              v-if="unplanned.length"
              v-model="planPick"
              :aria-label="t('plan.planExisting')"
              class="field text-muted"
              @change="planExisting"
            >
              <option value="">{{ t('plan.planExisting') }}</option>
              <option v-for="x in unplanned" :key="x.id" :value="x.id">{{ x.title }}</option>
            </select>
            <button type="button" class="btn btn-ghost justify-start px-2" @click="actions.openCreate({ scheduledDate: date })">
              <Plus :size="16" /> {{ t('plan.newTaskDay') }}
            </button>
          </div>
        </AppPanel>

        <AppPanel v-if="day.deadlines.length" :title="t('plan.dueDay')">
          <ul class="flex flex-col gap-1.5 text-sm">
            <li v-for="x in day.deadlines" :key="x.id" class="flex items-start gap-2 text-danger">
              <Flag :size="13" class="mt-1 shrink-0" aria-hidden="true" /> {{ x.title }}
            </li>
          </ul>
        </AppPanel>
      </aside>
    </div>

    <TimeBlockDialog v-model:open="blockOpen" :block="editingBlock" :defaults="blockDefaults" />
  </div>
</template>
