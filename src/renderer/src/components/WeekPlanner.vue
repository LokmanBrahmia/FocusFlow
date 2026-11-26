<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed, ref } from 'vue'
import { Check, Flag, GripVertical, Plus } from '@lucide/vue'
import type { DayPlan } from '@shared/planner'
import type { Task } from '@shared/tasks'
import QuickAdd from './QuickAdd.vue'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskActions } from '@/stores/taskActions'
import { useSettingsStore } from '@/stores/settings'
import { useTaskList } from '@/composables/useTaskList'
import { todayISO } from '@/utils/dates'
import { useI18n } from '@/i18n'

/**
 * The week as a planning surface: unscheduled work on one side, seven days
 * on the other. Each day shows its load against the daily goal, so an
 * overfull day is visible before it happens. Drag a card onto a day to
 * plan it; drag it back to the tray to unplan it.
 */
const props = defineProps<{ days: DayPlan[] }>()
const emit = defineEmits<{ openDay: [date: string] }>()

const subjects = useSubjectStore()
const actions = useTaskActions()
const settings = useSettingsStore()
const { t, f } = useI18n()
const today = todayISO()
const dragOver = ref<string | null>(null)
const DRAG_TYPE = 'application/x-focusflow-task'

const goal = computed(() => settings.settings.dailyGoalMinutes)

const { tasks: openTasks } = useTaskList(() => ({ status: 'open', sort: 'priority', limit: 500 }))
const unscheduled = computed(() => openTasks.value.filter((x) => !x.scheduledDate))

function color(task: Task): string {
  return subjectColor(task.subjectId ? subjects.byId.get(task.subjectId)?.color : null, 'var(--line)')
}
function blockTime(day: DayPlan, task: Task): string | null {
  return day.blocks.find((b) => b.taskId === task.id)?.start ?? null
}
function load(day: DayPlan): { fraction: number; over: boolean } {
  return { fraction: day.plannedMinutes / Math.max(1, goal.value), over: day.plannedMinutes > goal.value * 1.25 }
}

function onDragStart(e: DragEvent, task: Task): void {
  e.dataTransfer?.setData(DRAG_TYPE, task.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

async function onDrop(e: DragEvent, date: string | null): Promise<void> {
  dragOver.value = null
  const id = e.dataTransfer?.getData(DRAG_TYPE)
  if (!id) return
  const task = [...props.days.flatMap((d) => d.tasks), ...unscheduled.value].find((x) => x.id === id)
  if (!task || task.scheduledDate === date) return
  await actions.update(
    id,
    { scheduledDate: date },
    date ? t('toast.movedTo', { day: f.value.weekdayLong(date) }) : t('toast.unplanned')
  )
}
</script>

<template>
  <div class="grid gap-4 2xl:grid-cols-[15rem_minmax(0,1fr)]">
    <!-- Unscheduled tray -->
    <section
      class="panel flex flex-col p-3 transition-colors"
      :class="dragOver === 'tray' && 'border-accent bg-accent-soft/40'"
      :aria-label="t('plan.unscheduled')"
      @dragover.prevent="dragOver = 'tray'"
      @dragleave="dragOver === 'tray' && (dragOver = null)"
      @drop.prevent="onDrop($event, null)"
    >
      <header class="flex items-baseline justify-between px-1 pb-2">
        <h2 class="font-semibold">{{ t('plan.unscheduled') }}</h2>
        <span class="text-xs text-faint tabular-nums">{{ unscheduled.length }}</span>
      </header>
      <p class="px-1 pb-2 text-xs text-muted">{{ t('plan.unscheduledHint') }}</p>
      <ul class="flex flex-wrap gap-1.5 2xl:max-h-[28rem] 2xl:flex-col 2xl:flex-nowrap 2xl:overflow-y-auto">
        <li
          v-for="task in unscheduled"
          :key="task.id"
          draggable="true"
          class="group flex max-w-72 cursor-grab items-center gap-1.5 rounded-lg border border-line bg-surface-2/50 py-1.5 ps-1 pe-2 text-sm active:cursor-grabbing 2xl:max-w-none"
          @dragstart="onDragStart($event, task)"
        >
          <GripVertical :size="13" class="shrink-0 text-faint" aria-hidden="true" />
          <span class="size-2 shrink-0 rounded-full" :style="{ background: color(task) }" aria-hidden="true" />
          <button type="button" class="min-w-0 flex-1 truncate text-start" @click="actions.openEdit(task)">{{ task.title }}</button>
          <span v-if="task.estimatedMinutes" class="shrink-0 text-xs text-faint tabular-nums">{{ f.duration(task.estimatedMinutes) }}</span>
        </li>
        <li v-if="!unscheduled.length" class="px-1 py-2 text-sm text-faint">{{ t('plan.unscheduledEmpty') }}</li>
      </ul>
      <QuickAdd class="mt-3 2xl:max-w-none max-w-md" :placeholder="t('plan.unscheduledAdd')" />
    </section>

    <!-- The seven days -->
    <div class="-mx-1 overflow-x-auto px-1 pb-1">
      <ol class="grid min-w-[46rem] grid-cols-7 gap-2">
        <li
          v-for="day in days"
          :key="day.date"
          class="flex min-h-[26rem] flex-col rounded-xl border bg-surface transition-colors"
          :class="[
            dragOver === day.date ? 'border-accent bg-accent-soft/40' : day.date === today ? 'border-accent/60' : 'border-line',
            day.date < today && 'bg-surface/60'
          ]"
          :aria-label="f.dayLong(day.date)"
          @dragover.prevent="dragOver = day.date"
          @dragleave="dragOver === day.date && (dragOver = null)"
          @drop.prevent="onDrop($event, day.date)"
        >
          <!-- Day header -->
          <button
            type="button"
            class="flex flex-col gap-2 rounded-t-xl border-b border-line/70 p-2.5 text-start transition-colors hover:bg-surface-2"
            :title="t('plan.openDay', { day: f.weekdayLong(day.date) })"
            @click="emit('openDay', day.date)"
          >
            <span class="flex items-baseline justify-between gap-1">
              <span class="text-sm" :class="day.date === today ? 'font-medium text-accent' : 'text-muted'">
                {{ day.date === today ? t('date.todayTitle') : f.weekdayShort(day.date) }}
              </span>
              <span class="page-title text-2xl leading-none tabular-nums" :class="day.date < today && 'text-muted'">{{ f.dayNumber(day.date) }}</span>
            </span>
            <!-- Load against the daily goal -->
            <span class="block">
              <span class="track block" aria-hidden="true">
                <span :class="load(day).over && '!bg-danger'" :style="{ width: `${Math.min(1, load(day).fraction) * 100}%` }" />
              </span>
              <span class="mt-1 flex justify-between text-xs tabular-nums" :class="load(day).over ? 'text-danger' : 'text-faint'">
                <span>{{ day.plannedMinutes ? f.duration(day.plannedMinutes) : t('plan.free') }}</span>
                <span v-if="day.focusSeconds" class="text-muted">{{ t('plan.focusedShort', { time: f.duration(Math.round(day.focusSeconds / 60)) }) }}</span>
              </span>
            </span>
          </button>

          <!-- Tasks -->
          <ul class="flex flex-col gap-1.5 p-2">
            <li
              v-for="task in day.tasks"
              :key="task.id"
              :draggable="task.scheduledDate === day.date"
              class="group relative cursor-grab rounded-lg border border-line/70 border-s-[3px] bg-surface-2/50 py-1.5 ps-2 pe-1.5 text-sm active:cursor-grabbing"
              :style="{ borderInlineStartColor: color(task) }"
              @dragstart="onDragStart($event, task)"
            >
              <button type="button" class="block w-full text-start" @click="actions.openEdit(task)">
                <span v-if="blockTime(day, task)" class="block text-xs text-accent tabular-nums">{{ blockTime(day, task) }}</span>
                <span
                  class="line-clamp-2 break-words"
                  :class="(task.status === 'completed' || task.status === 'cancelled') && 'text-muted line-through decoration-faint'"
                >{{ task.title }}</span>
                <span v-if="task.estimatedMinutes && task.status !== 'completed'" class="mt-0.5 block text-xs text-faint tabular-nums">{{ f.duration(task.estimatedMinutes) }}</span>
              </button>
              <Check v-if="task.status === 'completed'" :size="12" class="absolute end-1.5 top-1.5 text-moss" />
            </li>
          </ul>

          <ul v-if="day.deadlines.length" class="flex flex-col gap-1 px-2.5 pb-2">
            <li v-for="d in day.deadlines" :key="`due-${d.id}`" class="flex items-start gap-1 text-xs text-danger">
              <Flag :size="11" class="mt-0.5 shrink-0" aria-hidden="true" />
              <span class="line-clamp-2">{{ d.title }}</span>
            </li>
          </ul>

          <button
            type="button"
            :aria-label="t('plan.addOn', { day: f.weekdayLong(day.date) })"
            class="mx-2 mt-auto mb-2 flex h-8 items-center justify-center gap-1.5 rounded-lg text-sm text-faint transition-colors hover:bg-surface-2 hover:text-text"
            @click="actions.openCreate({ scheduledDate: day.date })"
          >
            <Plus :size="14" /> {{ t('plan.add') }}
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>
