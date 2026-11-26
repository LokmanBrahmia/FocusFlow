<script setup lang="ts">
import { computed } from 'vue'
import { addDays, format, startOfWeek } from 'date-fns'
import { ArrowLeft, ArrowRight, CalendarPlus, Check, Clock, Flag, Play, Plus, Timer } from '@lucide/vue'
import { taskProgress, type Task } from '@shared/tasks'
import { formatClock } from '@shared/timer'
import AppPanel from '@/components/AppPanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import ProgressRing from '@/components/ProgressRing.vue'
import QuickAdd from '@/components/QuickAdd.vue'
import TaskList from '@/components/TaskList.vue'
import { useTaskActions } from '@/stores/taskActions'
import { useTimerStore } from '@/stores/timer'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskList } from '@/composables/useTaskList'
import { usePlanRange } from '@/composables/usePlanRange'
import { useStatistics } from '@/composables/useStatistics'
import { subjectColor } from '@/composables/useTheme'
import { isPast, parseDay, todayISO } from '@/utils/dates'
import { useI18n } from '@/i18n'

/**
 * Today, in order of what you need: the next step and the button that starts
 * it; how the day is going; the plan for the day and its schedule; the week.
 */
const actions = useTaskActions()
const timer = useTimerStore()
const subjects = useSubjectStore()
const { t, f, rtl } = useI18n()

const today = todayISO()
const now = new Date()

// ── data ────────────────────────────────────────────────────────────────────
const { tasks: todayTasks, loading } = useTaskList(() => ({ scheduledDate: today, status: 'all', sort: 'priority' }))
const { tasks: openTasks } = useTaskList(() => ({ status: 'open', sort: 'priority', limit: 50 }))
const { tasks: dueTasks } = useTaskList(() => ({
  status: 'open',
  sort: 'deadline',
  deadlineTo: format(addDays(now, 14), 'yyyy-MM-dd'),
  limit: 6
}))
const { stats } = useStatistics(() => ({ from: today, to: today }))
const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
const { days: week } = usePlanRange(() => ({ from: weekStart, days: 7 }))

// ── today's plan ────────────────────────────────────────────────────────────
const plan = computed(() => {
  const visible = todayTasks.value.filter((x) => x.status !== 'cancelled')
  const rank = (x: Task) => (x.status === 'in_progress' ? 0 : x.status === 'todo' ? 1 : 2)
  return [...visible].sort((a, b) => rank(a) - rank(b))
})
const doneCount = computed(() => plan.value.filter((x) => x.status === 'completed').length)

/** The next step: what is in progress, else the top open task planned today, else the top open task. */
const next = computed<{ task: Task; planned: boolean } | null>(() => {
  const open = plan.value.find((x) => x.status !== 'completed')
  if (open) return { task: open, planned: true }
  const any = openTasks.value[0]
  return any ? { task: any, planned: false } : null
})
const nextSubject = computed(() => {
  const id = next.value?.task.subjectId
  return id ? subjects.byId.get(id) : undefined
})
const sessionActive = computed(() => !!timer.state && timer.state.status !== 'idle')

// ── today's figures ─────────────────────────────────────────────────────────
const focusMin = computed(() => Math.floor((stats.value?.totals.focusSeconds ?? 0) / 60))
const goal = computed(() => stats.value?.goalMinutes ?? 0)
const goalReached = computed(() => goal.value > 0 && focusMin.value >= goal.value)

const greeting = computed(() => {
  const h = now.getHours()
  return t(h < 12 ? 'dash.greeting.morning' : h < 18 ? 'dash.greeting.afternoon' : 'dash.greeting.evening')
})
const summary = computed(() => {
  if (!plan.value.length) return t('dash.summary.empty')
  return t('dash.summary', { count: plan.value.length, done: doneCount.value })
})

// ── schedule ────────────────────────────────────────────────────────────────
const todayPlan = computed(() => week.value.find((d) => d.date === today))
const blocks = computed(() => [...(todayPlan.value?.blocks ?? [])].sort((a, b) => a.start.localeCompare(b.start)))
const nowHHMM = format(now, 'HH:mm')

// ── week ────────────────────────────────────────────────────────────────────
const weekScale = computed(() =>
  Math.max(60, goal.value, ...week.value.map((d) => Math.max(d.plannedMinutes, Math.round(d.focusSeconds / 60))))
)
const weekFocused = computed(() => Math.round(week.value.reduce((s, d) => s + d.focusSeconds, 0) / 60))
const weekPlanned = computed(() => week.value.reduce((s, d) => s + d.plannedMinutes, 0))

const Forward = computed(() => (rtl.value ? ArrowLeft : ArrowRight))
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :eyebrow="f.dayLong(now)" :title="greeting" :subtitle="summary">
      <template #actions>
        <button type="button" class="btn btn-quiet" @click="actions.openCreate({ scheduledDate: today })">
          <Plus :size="16" :stroke-width="2" /> {{ t('dash.addTask') }}
        </button>
      </template>
    </PageHeader>

    <!-- Row 1: the next step (primary action) and today's progress -->
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="panel relative flex flex-col justify-between gap-6 overflow-hidden p-6" aria-labelledby="next-title">
        <span class="absolute inset-y-6 start-0 w-[3px] rounded-e-full bg-accent" aria-hidden="true" />

        <!-- A session is running: the next step is to go back to it -->
        <template v-if="sessionActive && timer.state">
          <div>
            <p class="eyebrow">{{ t('dash.next.inSession') }}</p>
            <h2 id="next-title" class="mt-2 text-2xl leading-snug">{{ timer.state.taskTitle ?? t('now.noTask') }}</h2>
            <p class="mt-1 text-muted">
              {{ t(`session.${timer.state.sessionType}`) }} ·
              <span class="timer-digits" dir="ltr">{{ formatClock(timer.remainingMs) }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink to="/focus" class="btn btn-primary h-11 px-5 text-base">
              <Timer :size="17" :stroke-width="2" /> {{ t('dash.next.return') }}
            </RouterLink>
          </div>
        </template>

        <!-- The next task -->
        <template v-else-if="next">
          <div>
            <p class="eyebrow">{{ next.planned ? t('dash.next.label') : t('dash.next.suggested') }}</p>
            <h2 id="next-title" class="mt-2 text-2xl leading-snug">{{ next.task.title }}</h2>
            <p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span v-if="nextSubject" class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full" :style="{ background: subjectColor(nextSubject.color) }" aria-hidden="true" />
                {{ nextSubject.name }}
              </span>
              <span v-if="next.task.priority === 'high'" class="text-accent">{{ t('priority.highShort') }}</span>
              <span v-if="next.task.deadline" class="inline-flex items-center gap-1" :class="isPast(next.task.deadline) && 'text-danger'">
                <Flag :size="12" aria-hidden="true" />
                {{ t(isPast(next.task.deadline) ? 'task.wasDue' : 'task.due', { day: f.relativeDay(next.task.deadline) }) }}
              </span>
            </p>
            <div v-if="next.task.estimatedMinutes" class="mt-4 max-w-sm">
              <div class="track"><span :style="{ width: `${Math.min(1, taskProgress(next.task) ?? 0) * 100}%` }" /></div>
              <p class="mt-1.5 text-xs text-muted tabular-nums">
                {{ t('task.ofEstimate', { done: f.duration(Math.floor(next.task.focusSeconds / 60)), total: f.duration(next.task.estimatedMinutes) }) }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn btn-primary h-11 px-5 text-base" @click="actions.focusOn(next.task)">
              <Play :size="17" :stroke-width="2.25" /> {{ t('dash.next.start') }}
            </button>
            <button
              v-if="!next.planned"
              type="button"
              class="btn btn-quiet h-11"
              @click="actions.update(next.task.id, { scheduledDate: today }, t('toast.taskPlannedToday'))"
            >
              <CalendarPlus :size="16" :stroke-width="1.75" /> {{ t('dash.next.planToday') }}
            </button>
            <button v-else type="button" class="btn btn-ghost h-11" @click="actions.toggleComplete(next.task)">
              <Check :size="16" :stroke-width="2" /> {{ t('dash.next.markDone') }}
            </button>
          </div>
        </template>

        <!-- Nothing to do yet -->
        <template v-else>
          <div>
            <p class="eyebrow">{{ t('dash.next.label') }}</p>
            <h2 id="next-title" class="mt-2 text-2xl leading-snug">{{ t('dash.next.emptyTitle') }}</h2>
            <p class="mt-1 max-w-[52ch] text-muted">{{ t('dash.next.emptyBody') }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary h-11 px-5 text-base" @click="actions.openCreate({ scheduledDate: today })">
              <Plus :size="17" :stroke-width="2" /> {{ t('dash.addTask') }}
            </button>
            <RouterLink to="/focus" class="btn btn-quiet h-11">
              <Timer :size="16" :stroke-width="1.75" /> {{ t('dash.next.freeFocus') }}
            </RouterLink>
          </div>
        </template>
      </section>

      <!-- Today's progress -->
      <AppPanel :eyebrow="t('dash.progress.eyebrow')" tag="section">
        <div class="flex items-center gap-5 pt-1">
          <ProgressRing :value="goal ? focusMin / goal : 0" :done="goalReached" :size="116">
            <span class="page-title text-2xl tabular-nums">{{ f.duration(focusMin) }}</span>
            <span class="text-xs text-muted">{{ t('dash.progress.ofGoal', { goal: f.duration(goal) }) }}</span>
          </ProgressRing>
          <dl class="flex flex-1 flex-col gap-3 text-sm">
            <div>
              <dt class="text-muted">{{ t('stats.pomodoros') }}</dt>
              <dd class="text-lg tabular-nums">{{ f.number(stats?.totals.sessions ?? 0) }}</dd>
            </div>
            <div>
              <dt class="text-muted">{{ t('dash.progress.tasksDone') }}</dt>
              <dd class="text-lg tabular-nums">{{ f.number(doneCount) }}<span class="text-sm text-faint"> / {{ f.number(plan.length) }}</span></dd>
            </div>
            <div>
              <dt class="text-muted">{{ t('stats.streak') }}</dt>
              <dd class="text-lg">{{ t('common.days', { count: stats?.streak.current ?? 0 }) }}</dd>
            </div>
          </dl>
        </div>
        <p class="mt-4 text-sm" :class="goalReached ? 'text-moss' : 'text-muted'">
          {{ goalReached ? t('dash.progress.reached') : t('dash.progress.toGo', { time: f.duration(Math.max(0, goal - focusMin)) }) }}
        </p>
      </AppPanel>
    </div>

    <!-- Row 2: the day's plan and its schedule -->
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <AppPanel :title="t('dash.plan.title')" :meta="plan.length ? t('common.doneOf', { done: doneCount, total: plan.length }) : undefined" flush>
        <div class="px-2">
          <p v-if="loading && !plan.length" class="px-3 py-4 text-muted">{{ t('common.loading') }}</p>
          <p v-else-if="!plan.length" class="px-3 pt-1 pb-3 text-muted">{{ t('dash.plan.empty') }}</p>
          <TaskList v-else :tasks="plan" :show-planned="false" />
        </div>
        <div class="px-5 pt-2 pb-5">
          <QuickAdd :defaults="{ scheduledDate: today }" :placeholder="t('dash.plan.quickAdd')" />
        </div>
      </AppPanel>

      <div class="flex flex-col gap-5">
        <AppPanel :title="t('dash.schedule.title')">
          <template #actions>
            <RouterLink :to="{ path: '/planner', query: { view: 'day', date: today } }" class="text-sm text-muted hover:text-text">
              {{ t('dash.schedule.open') }}
            </RouterLink>
          </template>
          <ol v-if="blocks.length" class="flex flex-col">
            <li
              v-for="b in blocks"
              :key="b.id"
              class="flex items-start gap-3 border-b border-line/60 py-2 last:border-b-0"
              :class="b.end < nowHHMM && 'opacity-60'"
            >
              <span class="w-[5.5rem] shrink-0 text-sm text-muted tabular-nums" dir="ltr">{{ b.start }}–{{ b.end }}</span>
              <span class="min-w-0 flex-1 truncate">{{ b.taskTitle }}</span>
              <span v-if="b.start <= nowHHMM && b.end > nowHHMM" class="text-xs text-accent">{{ t('dash.schedule.now') }}</span>
            </li>
          </ol>
          <p v-else class="flex items-center gap-2 text-sm text-muted">
            <Clock :size="14" class="shrink-0 text-faint" /> {{ t('dash.schedule.empty') }}
          </p>
        </AppPanel>

        <AppPanel :title="t('dash.due.title')">
          <ul v-if="dueTasks.length" class="flex flex-col gap-2">
            <li v-for="d in dueTasks" :key="d.id" class="flex items-baseline justify-between gap-3">
              <button type="button" class="min-w-0 truncate text-start hover:underline" @click="actions.openEdit(d)">{{ d.title }}</button>
              <span class="shrink-0 text-sm" :class="isPast(d.deadline!) ? 'text-danger' : 'text-muted'">{{ f.relativeDay(d.deadline!) }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-muted">{{ t('dash.due.empty') }}</p>
        </AppPanel>
      </div>
    </div>

    <!-- Row 3: the week at a glance -->
    <AppPanel
      :title="t('dash.week.title')"
      :meta="t('dash.week.meta', { focused: f.duration(weekFocused), planned: f.duration(weekPlanned) })"
    >
      <template #actions>
        <RouterLink to="/planner" class="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          {{ t('dash.week.open') }} <component :is="Forward" :size="14" />
        </RouterLink>
      </template>
      <ol class="grid grid-cols-7 gap-2">
        <li v-for="d in week" :key="d.date">
          <RouterLink
            :to="{ path: '/planner', query: { view: 'day', date: d.date } }"
            class="flex h-full flex-col gap-2 rounded-xl border p-2.5 transition-colors hover:bg-surface-2"
            :class="d.date === today ? 'border-accent/60 bg-accent-soft/40' : 'border-transparent'"
            :aria-label="f.dayLong(d.date)"
          >
            <span class="flex items-baseline justify-between gap-1">
              <span class="truncate text-xs" :class="d.date === today ? 'text-accent' : 'text-muted'">{{ f.weekdayShort(d.date) }}</span>
              <span class="text-sm tabular-nums" :class="d.date === today ? 'text-text' : 'text-faint'">{{ f.dayNumber(d.date) }}</span>
            </span>
            <!-- Planned (outlined) and focused (filled) on one shared scale -->
            <span class="relative h-16 w-full" aria-hidden="true">
              <span class="absolute inset-x-[30%] bottom-0 rounded-t-md border border-b-0 border-dashed border-accent/50" :style="{ height: `${(d.plannedMinutes / weekScale) * 100}%` }" />
              <span class="absolute inset-x-[30%] bottom-0 rounded-t-md bg-accent" :class="parseDay(d.date) > now && 'opacity-0'" :style="{ height: `${(Math.round(d.focusSeconds / 60) / weekScale) * 100}%` }" />
            </span>
            <span class="text-center text-xs text-muted tabular-nums">{{ d.focusSeconds ? f.duration(Math.round(d.focusSeconds / 60)) : '–' }}</span>
          </RouterLink>
        </li>
      </ol>
      <p class="mt-3 flex items-center gap-4 text-xs text-faint">
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3 rounded-sm border border-dashed border-accent/60" />{{ t('plan.planned') }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3 rounded-sm bg-accent" />{{ t('plan.focused') }}</span>
      </p>
    </AppPanel>
  </div>
</template>
