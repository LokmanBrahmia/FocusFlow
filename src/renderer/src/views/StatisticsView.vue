<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { ChartColumn, Timer } from '@lucide/vue'
import type { DateRange } from '@shared/statistics'
import { formatMinutes, isDateString } from '@shared/tasks'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppButton from '@/components/AppButton.vue'
import BaseChart from '@/components/BaseChart.vue'
import BarList from '@/components/BarList.vue'
import StatFigure from '@/components/StatFigure.vue'
import { useStatistics } from '@/composables/useStatistics'
import { subjectColor } from '@/composables/useTheme'
import { barOption, lineOption, type BarItem, type ChartTokens } from '@/utils/charts'
import { parseDay, todayISO } from '@/utils/dates'

type Preset = 'today' | '7d' | '30d' | 'month' | 'custom'
const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' }
]
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const route = useRoute()
const router = useRouter()

const preset = computed<Preset>(() => {
  const q = route.query.range
  return PRESETS.some((p) => p.value === q) ? (q as Preset) : '7d'
})

const iso = (d: Date): string => format(d, 'yyyy-MM-dd')
const customFrom = ref(typeof route.query.from === 'string' && isDateString(route.query.from) ? route.query.from : iso(addDays(new Date(), -13)))
const customTo = ref(typeof route.query.to === 'string' && isDateString(route.query.to) ? route.query.to : todayISO())
const customError = computed(() => (customFrom.value > customTo.value ? 'The start date must be on or before the end date.' : null))

const range = computed<DateRange | null>(() => {
  const today = new Date()
  switch (preset.value) {
    case 'today':
      return { from: todayISO(), to: todayISO() }
    case '30d':
      return { from: iso(addDays(today, -29)), to: todayISO() }
    case 'month':
      return { from: iso(startOfMonth(today)), to: iso(endOfMonth(today)) }
    case 'custom':
      return customError.value || !customFrom.value || !customTo.value ? null : { from: customFrom.value, to: customTo.value }
    default:
      return { from: iso(addDays(today, -6)), to: todayISO() }
  }
})

function choose(p: Preset): void {
  void router.replace({ query: p === 'custom' ? { range: p, from: customFrom.value, to: customTo.value } : { range: p } })
}
function updateCustom(): void {
  if (!customError.value) void router.replace({ query: { range: 'custom', from: customFrom.value, to: customTo.value } })
}

const { stats, loading, error } = useStatistics(() => range.value)

const singleDay = computed(() => !!stats.value && stats.value.days.length === 1)
const hasData = computed(() => !!stats.value && (stats.value.totals.recordedSessions > 0 || stats.value.totals.tasksCompleted > 0))
const rangeLabel = computed(() => {
  const r = range.value
  if (!r) return 'Choose a date range.'
  const f = parseDay(r.from)
  const t = parseDay(r.to)
  return r.from === r.to ? format(f, 'EEEE d MMMM yyyy') : `${format(f, 'd MMM yyyy')} to ${format(t, 'd MMM yyyy')}`
})

const min = (secs: number): number => Math.round(secs / 60)
const fmt = (secs: number): string => formatMinutes(secs / 60)
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

// ── figures ─────────────────────────────────────────────────────────────────
const goalFigure = computed(() => {
  const s = stats.value
  if (!s) return { value: '', detail: '' }
  if (singleDay.value) {
    const pct = Math.round((s.totals.focusSeconds / 60 / Math.max(1, s.goalMinutes)) * 100)
    return { value: `${pct}%`, detail: `of the ${formatMinutes(s.goalMinutes)} goal` }
  }
  return {
    value: `${Math.round(s.totals.goalRate * 100)}%`,
    detail: `goal met on ${s.totals.goalDaysMet} of ${plural(s.elapsedDays, 'day')}`
  }
})

// ── chart builders ──────────────────────────────────────────────────────────
const dayLabels = computed(() =>
  (stats.value?.days ?? []).map((d) => format(parseDay(d.date), (stats.value?.days.length ?? 0) > 10 ? 'd MMM' : 'EEE d'))
)
const labelInterval = computed(() => ((stats.value?.days.length ?? 0) > 20 ? 3 : 0))

const focusChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (t: ChartTokens) =>
    barOption(t, {
      categories: dayLabels.value,
      values: s.days.map((d) => min(d.focusSeconds)),
      format: (v, i) => `<b>${formatMinutes(v)}</b> focused${s.days[i].goalMet ? ', goal met' : ''}`,
      minutes: true,
      reference: { value: s.goalMinutes, label: `Goal ${formatMinutes(s.goalMinutes)}` },
      labelInterval: labelInterval.value
    })
})

const sessionsChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (t: ChartTokens) =>
    barOption(t, {
      categories: dayLabels.value,
      values: s.days.map((d) => d.sessions),
      format: (v) => `<b>${v}</b> ${v === 1 ? 'Pomodoro' : 'Pomodoros'} completed`,
      labelInterval: labelInterval.value
    })
})

const tasksChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (t: ChartTokens) =>
    barOption(t, {
      categories: dayLabels.value,
      values: s.days.map((d) => d.tasksCompleted),
      format: (v) => `<b>${v}</b> ${v === 1 ? 'task' : 'tasks'} completed`,
      labelInterval: labelInterval.value
    })
})

const weekdayChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (t: ChartTokens) =>
    barOption(t, {
      categories: WEEKDAYS.map((d) => d.slice(0, 3)),
      values: s.weekdays.map(min),
      format: (v, i) => `${WEEKDAYS[i]}: <b>${formatMinutes(v)}</b> on average`,
      minutes: true
    })
})

const hourChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (t: ChartTokens) =>
    barOption(t, {
      categories: s.hours.map((_, h) => String(h).padStart(2, '0')),
      values: s.hours.map(min),
      format: (v, i) => `Started ${String(i).padStart(2, '0')}:00–${String(i).padStart(2, '0')}:59: <b>${formatMinutes(v)}</b>`,
      minutes: true,
      labelInterval: 2
    })
})

const ratingChart = computed(() => {
  const q = stats.value?.quality
  if (!q || q.overTime.length < 2) return null
  return (t: ChartTokens) =>
    lineOption(t, {
      categories: q.overTime.map((d) => format(parseDay(d.date), 'd MMM')),
      values: q.overTime.map((d) => d.average),
      min: 1,
      max: 5,
      format: (v, i) => `Average <b>${v}</b> from ${q.overTime[i].count} rated ${q.overTime[i].count === 1 ? 'session' : 'sessions'}`
    })
})

const subjectItems = computed<BarItem[]>(() =>
  (stats.value?.subjects ?? []).map((s) => ({
    key: s.subjectId ?? 'none',
    label: s.name,
    fraction: s.share,
    value: fmt(s.focusSeconds),
    detail: `${Math.round(s.share * 100)}%, ${plural(s.tasksCompleted, 'task')} done`,
    color: s.subjectId ? subjectColor(s.color, 'var(--faint)') : 'var(--faint)'
  }))
)

const ratingItems = (groups: { key: string; label: string; average: number; count: number }[]): BarItem[] =>
  groups.map((g) => ({
    key: g.key,
    label: g.label,
    fraction: g.average / 5,
    value: `${g.average} / 5`,
    detail: plural(g.count, 'session')
  }))
</script>

<template>
  <div>
    <PageHeader :title="$route.meta.title" :subtitle="rangeLabel" />

    <!-- Filters: one row above every chart. -->
    <div class="mb-8 flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label="Date range" class="inline-flex flex-wrap rounded-xl border border-line bg-surface p-1">
        <button
          v-for="p in PRESETS"
          :key="p.value"
          type="button"
          role="radio"
          :aria-checked="preset === p.value"
          class="h-8 rounded-lg px-3 text-muted transition-colors hover:text-text"
          :class="preset === p.value && 'bg-surface-2 text-text'"
          @click="choose(p.value)"
        >
          {{ p.label }}
        </button>
      </div>
      <div v-if="preset === 'custom'" class="flex items-center gap-2">
        <label class="sr-only" for="stats-from">From</label>
        <input id="stats-from" v-model="customFrom" type="date" class="h-9 rounded-lg border border-line bg-surface px-2.5 outline-none focus:border-iris" @change="updateCustom" />
        <span class="text-muted">to</span>
        <label class="sr-only" for="stats-to">To</label>
        <input id="stats-to" v-model="customTo" type="date" class="h-9 rounded-lg border border-line bg-surface px-2.5 outline-none focus:border-iris" @change="updateCustom" />
      </div>
      <p v-if="preset === 'custom' && customError" role="alert" class="w-full text-sm text-danger">{{ customError }}</p>
    </div>

    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <p v-else-if="loading && !stats" class="text-muted">Calculating…</p>

    <EmptyState
      v-else-if="stats && !hasData"
      :icon="ChartColumn"
      title="No focus sessions in this period"
      body="Statistics are calculated from the sessions you record and the tasks you complete. Pick a wider range, or start a session and come back."
    >
      <AppButton :icon="Timer" to="/focus">Start a focus session</AppButton>
    </EmptyState>

    <div v-else-if="stats" class="flex flex-col gap-12" :class="loading && 'opacity-70 transition-opacity'">
      <!-- Headline figures -->
      <dl class="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
        <StatFigure
          label="Focus time"
          :value="fmt(stats.totals.focusSeconds)"
          :detail="singleDay ? undefined : `${fmt(stats.totals.averageDailyFocusSeconds)} a day on average`"
        />
        <StatFigure
          label="Pomodoros"
          :value="String(stats.totals.sessions)"
          :detail="stats.totals.recordedSessions ? `${fmt(stats.totals.averageSessionSeconds)} per session on average` : undefined"
        />
        <StatFigure label="Tasks completed" :value="String(stats.totals.tasksCompleted)" />
        <StatFigure label="Daily goal" :value="goalFigure.value" :detail="goalFigure.detail" />
        <StatFigure
          label="Study streak"
          :value="plural(stats.streak.current, 'day')"
          :detail="`Longest ${plural(stats.streak.longest, 'day')}. A day counts from ${stats.streak.minimumMinutes} min.`"
        />
      </dl>

      <!-- Over time -->
      <section v-if="!singleDay" aria-labelledby="focus-heading">
        <h2 id="focus-heading" class="text-lg font-semibold">Focus time per day</h2>
        <BaseChart class="mt-3" :build="focusChart" label="Bar chart of focus minutes per day with the daily goal as a dashed line" :height="240" />
        <div class="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 class="font-semibold">Pomodoros completed</h3>
            <BaseChart class="mt-2" :build="sessionsChart" label="Bar chart of completed Pomodoros per day" :height="160" />
          </div>
          <div>
            <h3 class="font-semibold">Tasks completed</h3>
            <BaseChart class="mt-2" :build="tasksChart" label="Bar chart of tasks completed per day" :height="160" />
          </div>
        </div>
      </section>

      <!-- Patterns -->
      <section aria-labelledby="pattern-heading" class="grid gap-8 md:grid-cols-2">
        <h2 id="pattern-heading" class="sr-only">Patterns</h2>
        <div v-if="!singleDay">
          <h3 class="font-semibold">By day of the week</h3>
          <p class="text-sm text-muted">
            <template v-if="stats.bestWeekday !== null">
              {{ WEEKDAYS[stats.bestWeekday] }} is your most productive day, averaging {{ fmt(stats.weekdays[stats.bestWeekday]) }}.
            </template>
            <template v-else>Average focus for each weekday in this period.</template>
          </p>
          <BaseChart class="mt-2" :build="weekdayChart" label="Bar chart of average focus minutes for each weekday" :height="180" />
        </div>
        <div :class="singleDay && 'md:col-span-2'">
          <h3 class="font-semibold">By time of day</h3>
          <p class="text-sm text-muted">Focus time by the hour each session started.</p>
          <BaseChart class="mt-2" :build="hourChart" label="Bar chart of focus minutes by starting hour" :height="180" />
        </div>
      </section>

      <!-- Subjects -->
      <section v-if="subjectItems.length" aria-labelledby="subjects-heading">
        <h2 id="subjects-heading" class="text-lg font-semibold">Subjects</h2>
        <p class="text-sm text-muted">Share of focus time, and tasks completed in this period.</p>
        <BarList class="mt-4 max-w-2xl" :items="subjectItems" label="Focus time by subject" />
      </section>

      <!-- Focus quality -->
      <section aria-labelledby="quality-heading">
        <h2 id="quality-heading" class="text-lg font-semibold">Focus quality</h2>
        <p v-if="!stats.quality.ratedSessions" class="mt-1 max-w-[60ch] text-muted">
          After a focus session ends, FocusFlow asks how focused you were. Rate a few sessions and your averages appear here.
        </p>
        <template v-else>
          <dl class="mt-3 grid grid-cols-2 gap-8 sm:grid-cols-3">
            <StatFigure
              label="Average rating"
              :value="`${stats.quality.average} / 5`"
              :detail="`from ${plural(stats.quality.ratedSessions, 'rated session')}`"
            />
          </dl>
          <div v-if="ratingChart" class="mt-6">
            <h3 class="font-semibold">Ratings over time</h3>
            <BaseChart class="mt-2" :build="ratingChart" label="Line chart of average focus rating per day, from 1 to 5" :height="180" />
          </div>
          <div class="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h3 class="mb-3 font-semibold">By subject</h3>
              <BarList :items="ratingItems(stats.quality.bySubject)" label="Average focus rating by subject" />
            </div>
            <div>
              <h3 class="mb-3 font-semibold">By time of day</h3>
              <BarList :items="ratingItems(stats.quality.byTimeOfDay)" label="Average focus rating by time of day" />
            </div>
          </div>
        </template>
      </section>

      <!-- Table view of the daily data -->
      <details class="group">
        <summary class="cursor-pointer text-muted hover:text-text">Show the numbers as a table</summary>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full max-w-2xl text-left tabular-nums">
            <thead class="text-sm text-muted">
              <tr class="border-b border-line">
                <th class="py-2 pr-4 font-normal">Date</th>
                <th class="py-2 pr-4 font-normal">Focus</th>
                <th class="py-2 pr-4 font-normal">Pomodoros</th>
                <th class="py-2 pr-4 font-normal">Tasks completed</th>
                <th class="py-2 font-normal">Goal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in stats.days" :key="d.date" class="border-b border-line/60">
                <td class="py-1.5 pr-4">{{ format(parseDay(d.date), 'EEE d MMM') }}</td>
                <td class="py-1.5 pr-4">{{ fmt(d.focusSeconds) }}</td>
                <td class="py-1.5 pr-4">{{ d.sessions }}</td>
                <td class="py-1.5 pr-4">{{ d.tasksCompleted }}</td>
                <td class="py-1.5">{{ d.goalMet ? 'Met' : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>
