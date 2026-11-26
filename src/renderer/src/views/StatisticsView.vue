<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { ChartColumn, ChevronDown, Timer } from '@lucide/vue'
import type { DateRange } from '@shared/statistics'
import { isDateString } from '@shared/tasks'
import PageHeader from '@/components/PageHeader.vue'
import AppPanel from '@/components/AppPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppButton from '@/components/AppButton.vue'
import BaseChart from '@/components/BaseChart.vue'
import BarList from '@/components/BarList.vue'
import StatFigure from '@/components/StatFigure.vue'
import { useStatistics } from '@/composables/useStatistics'
import { subjectColor } from '@/composables/useTheme'
import { barOption, lineOption, type BarItem, type ChartTokens } from '@/utils/charts'
import { todayISO } from '@/utils/dates'
import { useI18n, type MessageKey } from '@/i18n'

const { t, f } = useI18n()

type Preset = 'today' | '7d' | '30d' | 'month' | 'custom'
const PRESETS: { value: Preset; label: MessageKey }[] = [
  { value: 'today', label: 'stats.range.today' },
  { value: '7d', label: 'stats.range.7d' },
  { value: '30d', label: 'stats.range.30d' },
  { value: 'month', label: 'stats.range.month' },
  { value: 'custom', label: 'stats.range.custom' }
]
/** Monday-first, matching the order statistics are calculated in. A known Monday anchors the names. */
const weekdayDates = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i))

const route = useRoute()
const router = useRouter()

const preset = computed<Preset>(() => {
  const q = route.query.range
  return PRESETS.some((p) => p.value === q) ? (q as Preset) : '7d'
})

const iso = (d: Date): string => format(d, 'yyyy-MM-dd')
const customFrom = ref(typeof route.query.from === 'string' && isDateString(route.query.from) ? route.query.from : iso(addDays(new Date(), -13)))
const customTo = ref(typeof route.query.to === 'string' && isDateString(route.query.to) ? route.query.to : todayISO())
const customError = computed(() => (customFrom.value > customTo.value ? t('stats.range.error') : null))

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
  if (!r) return t('stats.range.choose')
  return r.from === r.to ? f.value.dayLongYear(r.from) : t('stats.range.between', { from: f.value.dayMonthYear(r.from), to: f.value.dayMonthYear(r.to) })
})

const min = (secs: number): number => Math.round(secs / 60)
const fmt = (secs: number): string => f.value.duration(secs / 60)

// ── figures ─────────────────────────────────────────────────────────────────
const goalFigure = computed(() => {
  const s = stats.value
  if (!s) return { value: '', detail: '' }
  if (singleDay.value) {
    return {
      value: f.value.percent(s.totals.focusSeconds / 60 / Math.max(1, s.goalMinutes)),
      detail: t('stats.goal.ofGoal', { goal: f.value.duration(s.goalMinutes) })
    }
  }
  return {
    value: f.value.percent(s.totals.goalRate),
    detail: t('stats.goal.daysMet', { met: s.totals.goalDaysMet, count: s.elapsedDays })
  }
})

// ── charts ──────────────────────────────────────────────────────────────────
const dayLabels = computed(() =>
  (stats.value?.days ?? []).map((d) =>
    (stats.value?.days.length ?? 0) > 10 ? f.value.dayMonth(d.date) : `${f.value.weekdayShort(d.date)} ${f.value.dayNumber(d.date)}`
  )
)
const labelInterval = computed(() => ((stats.value?.days.length ?? 0) > 20 ? 3 : 0))

const focusChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (tk: ChartTokens) =>
    barOption(tk, {
      categories: dayLabels.value,
      values: s.days.map((d) => min(d.focusSeconds)),
      format: (v, i) => `<b>${f.value.duration(v)}</b> ${t('stats.tip.focused')}${s.days[i].goalMet ? ` · ${t('stats.tip.goalMet')}` : ''}`,
      minutes: true,
      reference: { value: s.goalMinutes, label: t('stats.goalLine', { goal: f.value.duration(s.goalMinutes) }) },
      labelInterval: labelInterval.value
    })
})

const sessionsChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (tk: ChartTokens) =>
    barOption(tk, {
      categories: dayLabels.value,
      values: s.days.map((d) => d.sessions),
      format: (v) => t('stats.tip.pomodoros', { count: v }),
      labelInterval: labelInterval.value
    })
})

const tasksChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (tk: ChartTokens) =>
    barOption(tk, {
      categories: dayLabels.value,
      values: s.days.map((d) => d.tasksCompleted),
      format: (v) => t('stats.tip.tasks', { count: v }),
      labelInterval: labelInterval.value
    })
})

const weekdayChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  return (tk: ChartTokens) =>
    barOption(tk, {
      categories: weekdayDates.map((d) => f.value.weekdayShort(d)),
      values: s.weekdays.map(min),
      format: (v, i) => t('stats.tip.weekday', { day: f.value.weekdayLong(weekdayDates[i]), time: `<b>${f.value.duration(v)}</b>` }),
      minutes: true
    })
})

const hourChart = computed(() => {
  const s = stats.value
  if (!s) return () => ({})
  const hh = (h: number) => String(h).padStart(2, '0')
  return (tk: ChartTokens) =>
    barOption(tk, {
      categories: s.hours.map((_, h) => hh(h)),
      values: s.hours.map(min),
      format: (v, i) => t('stats.tip.hour', { from: `${hh(i)}:00`, to: `${hh(i)}:59`, time: `<b>${f.value.duration(v)}</b>` }),
      minutes: true,
      labelInterval: 2
    })
})

const ratingChart = computed(() => {
  const q = stats.value?.quality
  if (!q || q.overTime.length < 2) return null
  return (tk: ChartTokens) =>
    lineOption(tk, {
      categories: q.overTime.map((d) => f.value.dayMonth(d.date)),
      values: q.overTime.map((d) => d.average),
      min: 1,
      max: 5,
      format: (v, i) => t('stats.tip.rating', { avg: `<b>${v}</b>`, count: q.overTime[i].count })
    })
})

const subjectItems = computed<BarItem[]>(() =>
  (stats.value?.subjects ?? []).map((s) => ({
    key: s.subjectId ?? 'none',
    label: s.subjectId ? s.name : t('tasks.noSubject'),
    fraction: s.share,
    value: fmt(s.focusSeconds),
    detail: `${f.value.percent(s.share)} · ${t('stats.subjectTasks', { count: s.tasksCompleted })}`,
    color: s.subjectId ? subjectColor(s.color, 'var(--faint)') : 'var(--faint)'
  }))
)

const ratingLabel = (key: string, label: string): string => {
  if (key === 'none') return t('tasks.noSubject')
  if (['morning', 'afternoon', 'evening', 'night'].includes(key)) return t(`stats.tod.${key as 'morning'}`)
  return label
}
const ratingItems = (groups: { key: string; label: string; average: number; count: number }[]): BarItem[] =>
  groups.map((g) => ({
    key: g.key,
    label: ratingLabel(g.key, g.label),
    fraction: g.average / 5,
    value: `${g.average} / 5`,
    detail: t('stats.sessions', { count: g.count })
  }))
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :eyebrow="rangeLabel" :title="t('nav.statistics')" :subtitle="t('stats.subtitle')">
      <template #actions>
        <div role="radiogroup" :aria-label="t('stats.range.label')" class="seg flex-wrap">
          <button
            v-for="p in PRESETS"
            :key="p.value"
            type="button"
            role="radio"
            :aria-checked="preset === p.value"
            @click="choose(p.value)"
          >
            {{ t(p.label) }}
          </button>
        </div>
      </template>
    </PageHeader>

    <div v-if="preset === 'custom'" class="-mt-3 flex flex-wrap items-center gap-2">
      <label class="sr-only" for="stats-from">{{ t('stats.range.from') }}</label>
      <input id="stats-from" v-model="customFrom" type="date" class="field w-auto bg-surface" @change="updateCustom" />
      <span class="text-muted">{{ t('stats.range.to') }}</span>
      <label class="sr-only" for="stats-to">{{ t('stats.range.toLabel') }}</label>
      <input id="stats-to" v-model="customTo" type="date" class="field w-auto bg-surface" @change="updateCustom" />
      <p v-if="customError" role="alert" class="w-full text-sm text-danger">{{ customError }}</p>
    </div>

    <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
    <p v-else-if="loading && !stats" class="text-muted">{{ t('stats.calculating') }}</p>

    <EmptyState v-else-if="stats && !hasData" :icon="ChartColumn" :title="t('stats.empty.title')" :body="t('stats.empty.body')">
      <AppButton :icon="Timer" to="/focus">{{ t('stats.empty.action') }}</AppButton>
    </EmptyState>

    <div v-else-if="stats" class="flex flex-col gap-5" :class="loading && 'opacity-70 transition-opacity'">
      <!-- Headline figures, one framed strip -->
      <dl class="panel grid grid-cols-2 divide-line sm:grid-cols-3 xl:grid-cols-5 xl:divide-x rtl:xl:divide-x-reverse">
        <StatFigure
          :label="t('stats.focusTime')"
          :value="fmt(stats.totals.focusSeconds)"
          :detail="singleDay ? undefined : t('stats.perDay', { time: fmt(stats.totals.averageDailyFocusSeconds) })"
        />
        <StatFigure
          :label="t('stats.pomodoros')"
          :value="f.number(stats.totals.sessions)"
          :detail="stats.totals.recordedSessions ? t('stats.perSession', { time: fmt(stats.totals.averageSessionSeconds) }) : undefined"
        />
        <StatFigure :label="t('stats.tasksCompleted')" :value="f.number(stats.totals.tasksCompleted)" />
        <StatFigure :label="t('stats.dailyGoal')" :value="goalFigure.value" :detail="goalFigure.detail" />
        <StatFigure
          :label="t('stats.streak')"
          :value="t('common.days', { count: stats.streak.current })"
          :detail="t('stats.streakDetail', { longest: t('common.days', { count: stats.streak.longest }), min: stats.streak.minimumMinutes })"
        />
      </dl>

      <!-- Over time -->
      <template v-if="!singleDay">
        <AppPanel :title="t('stats.focusPerDay')" :meta="t('stats.goalLine', { goal: f.duration(stats.goalMinutes) })">
          <BaseChart :build="focusChart" :label="t('stats.aria.focus')" :height="250" />
        </AppPanel>
        <div class="grid gap-5 md:grid-cols-2">
          <AppPanel :title="t('stats.pomodorosCompleted')" :meta="f.number(stats.totals.sessions)">
            <BaseChart :build="sessionsChart" :label="t('stats.aria.pomodoros')" :height="160" />
          </AppPanel>
          <AppPanel :title="t('stats.tasksCompleted')" :meta="f.number(stats.totals.tasksCompleted)">
            <BaseChart :build="tasksChart" :label="t('stats.aria.tasks')" :height="160" />
          </AppPanel>
        </div>
      </template>

      <!-- Patterns -->
      <div class="grid gap-5 md:grid-cols-2">
        <AppPanel v-if="!singleDay" :eyebrow="t('stats.patterns')" :title="t('stats.byWeekday')">
          <p class="mb-2 text-sm text-muted">
            {{
              stats.bestWeekday !== null
                ? t('stats.bestDay', { day: f.weekdayLong(weekdayDates[stats.bestWeekday]), time: fmt(stats.weekdays[stats.bestWeekday]) })
                : t('stats.weekdayHint')
            }}
          </p>
          <BaseChart :build="weekdayChart" :label="t('stats.aria.weekday')" :height="180" />
        </AppPanel>
        <AppPanel :eyebrow="t('stats.patterns')" :title="t('stats.byHour')" :class="singleDay && 'md:col-span-2'">
          <p class="mb-2 text-sm text-muted">{{ t('stats.hourHint') }}</p>
          <BaseChart :build="hourChart" :label="t('stats.aria.hour')" :height="180" />
        </AppPanel>
      </div>

      <!-- Subjects and quality -->
      <div class="grid gap-5 lg:grid-cols-2">
        <AppPanel :title="t('stats.subjects')">
          <p class="mb-4 text-sm text-muted">{{ t('stats.subjectsHint') }}</p>
          <BarList v-if="subjectItems.length" :items="subjectItems" :label="t('stats.aria.subjects')" />
          <p v-else class="text-sm text-faint">{{ t('stats.subjectsEmpty') }}</p>
        </AppPanel>

        <AppPanel :title="t('stats.quality')">
          <p v-if="!stats.quality.ratedSessions" class="max-w-[60ch] text-sm text-muted">{{ t('stats.qualityEmpty') }}</p>
          <template v-else>
            <div class="flex items-baseline gap-3">
              <span class="page-title text-3xl tabular-nums">{{ stats.quality.average }} / 5</span>
              <span class="text-sm text-muted">{{ t('stats.ratedFrom', { count: stats.quality.ratedSessions }) }}</span>
            </div>
            <BaseChart v-if="ratingChart" class="mt-3" :build="ratingChart" :label="t('stats.aria.rating')" :height="150" />
            <div class="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 class="mb-3 text-sm font-medium text-muted">{{ t('stats.bySubject') }}</h3>
                <BarList :items="ratingItems(stats.quality.bySubject)" :label="t('stats.aria.ratingSubject')" />
              </div>
              <div>
                <h3 class="mb-3 text-sm font-medium text-muted">{{ t('stats.byTimeOfDay') }}</h3>
                <BarList :items="ratingItems(stats.quality.byTimeOfDay)" :label="t('stats.aria.ratingTime')" />
              </div>
            </div>
          </template>
        </AppPanel>
      </div>

      <!-- The numbers behind the charts -->
      <details class="panel group">
        <summary class="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
          {{ t('stats.table') }}
          <ChevronDown :size="16" class="text-faint transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div class="overflow-x-auto px-5 pb-5">
          <table class="w-full text-start tabular-nums">
            <thead class="text-sm text-muted">
              <tr class="border-b border-line">
                <th class="py-2 pe-4 text-start font-normal">{{ t('stats.col.date') }}</th>
                <th class="py-2 pe-4 text-start font-normal">{{ t('stats.col.focus') }}</th>
                <th class="py-2 pe-4 text-start font-normal">{{ t('stats.pomodoros') }}</th>
                <th class="py-2 pe-4 text-start font-normal">{{ t('stats.tasksCompleted') }}</th>
                <th class="py-2 text-start font-normal">{{ t('stats.col.goal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in stats.days" :key="d.date" class="border-b border-line/60">
                <td class="py-1.5 pe-4">{{ f.weekdayShort(d.date) }} {{ f.dayMonth(d.date) }}</td>
                <td class="py-1.5 pe-4">{{ fmt(d.focusSeconds) }}</td>
                <td class="py-1.5 pe-4">{{ d.sessions }}</td>
                <td class="py-1.5 pe-4">{{ d.tasksCompleted }}</td>
                <td class="py-1.5">{{ d.goalMet ? t('stats.col.met') : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>
