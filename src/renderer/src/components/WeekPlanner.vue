<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed, ref } from 'vue'
import { format } from 'date-fns'
import { Check, Plus } from '@lucide/vue'
import type { DayPlan } from '@shared/planner'
import type { Task } from '@shared/tasks'
import PlanVsActual from './PlanVsActual.vue'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskActions } from '@/stores/taskActions'
import { parseDay, todayISO } from '@/utils/dates'

const props = defineProps<{ days: DayPlan[] }>()
const emit = defineEmits<{ openDay: [date: string] }>()

const subjects = useSubjectStore()
const actions = useTaskActions()
const today = todayISO()
const dragOver = ref<string | null>(null)

/** All columns share one scale so days compare honestly. */
const scale = computed(() =>
  Math.max(60, ...props.days.map((d) => Math.max(d.plannedMinutes, Math.round(d.focusSeconds / 60))))
)

function color(t: Task): string {
  return subjectColor(t.subjectId ? subjects.byId.get(t.subjectId)?.color : null, 'var(--line)')
}

function blockTime(day: DayPlan, t: Task): string | null {
  return day.blocks.find((b) => b.taskId === t.id)?.start ?? null
}

function onDragStart(e: DragEvent, t: Task): void {
  e.dataTransfer?.setData('application/x-focusflow-task', t.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

async function onDrop(e: DragEvent, date: string): Promise<void> {
  dragOver.value = null
  const id = e.dataTransfer?.getData('application/x-focusflow-task')
  if (!id) return
  const task = props.days.flatMap((d) => d.tasks).find((t) => t.id === id)
  if (!task || task.scheduledDate === date) return
  await actions.update(id, { scheduledDate: date }, `Moved to ${format(parseDay(date), 'EEEE')}`)
}
</script>

<template>
  <div class="-mx-2 overflow-x-auto px-2 pb-2">
    <div class="grid min-w-[56rem] grid-cols-7 gap-2">
      <section
        v-for="day in days"
        :key="day.date"
        :aria-label="format(parseDay(day.date), 'EEEE d MMMM')"
        class="flex min-h-[26rem] flex-col rounded-xl border p-2.5 transition-colors"
        :class="[
          dragOver === day.date ? 'border-accent bg-accent-soft/40' : 'border-line',
          day.date < today && 'opacity-80'
        ]"
        @dragover.prevent="dragOver = day.date"
        @dragleave="dragOver === day.date && (dragOver = null)"
        @drop.prevent="onDrop($event, day.date)"
      >
        <button
          type="button"
          class="-m-1 flex items-baseline gap-2 rounded-lg p-1 text-left hover:bg-surface-2"
          :title="`Open ${format(parseDay(day.date), 'EEEE')}`"
          @click="emit('openDay', day.date)"
        >
          <span class="page-title text-3xl leading-none" :class="day.date === today && 'text-accent'">
            {{ format(parseDay(day.date), 'd') }}
          </span>
          <span class="text-sm" :class="day.date === today ? 'text-accent' : 'text-muted'">
            {{ day.date === today ? 'Today' : format(parseDay(day.date), 'EEE') }}
          </span>
        </button>

        <PlanVsActual
          class="mt-3"
          :planned-minutes="day.plannedMinutes"
          :focus-minutes="Math.round(day.focusSeconds / 60)"
          :scale-minutes="scale"
          stacked
        />
        <p v-if="day.totalCount" class="mt-1 text-xs text-muted">
          {{ day.completedCount }} of {{ day.totalCount }} done ({{ Math.round((day.completedCount / day.totalCount) * 100) }}%)
        </p>

        <ul class="mt-3 flex flex-col gap-1.5">
          <li
            v-for="t in day.tasks"
            :key="t.id"
            :draggable="t.scheduledDate === day.date"
            class="group relative cursor-grab rounded-lg border-l-2 bg-surface-2/70 py-1.5 pr-1.5 pl-2 text-sm active:cursor-grabbing"
            :style="{ borderLeftColor: color(t) }"
            @dragstart="onDragStart($event, t)"
          >
            <button type="button" class="block w-full text-left" @click="actions.openEdit(t)">
              <span v-if="blockTime(day, t)" class="text-xs text-accent tabular-nums">{{ blockTime(day, t) }}</span>
              <span
                class="line-clamp-2 break-words"
                :class="(t.status === 'completed' || t.status === 'cancelled') && 'text-muted line-through decoration-faint'"
              >{{ t.title }}</span>
            </button>
            <Check v-if="t.status === 'completed'" :size="12" class="absolute top-1.5 right-1.5 text-moss" />
          </li>
        </ul>

        <ul v-if="day.deadlines.length" class="mt-2 flex flex-col gap-1">
          <li v-for="t in day.deadlines" :key="`due-${t.id}`" class="line-clamp-2 text-xs text-danger">
            Due: {{ t.title }}
          </li>
        </ul>

        <button
          type="button"
          :aria-label="`Add a task on ${format(parseDay(day.date), 'EEEE')}`"
          class="mt-auto flex h-8 items-center justify-center gap-1.5 rounded-lg text-sm text-faint opacity-0 transition-opacity hover:bg-surface-2 hover:text-text focus-visible:opacity-100 [section:hover_&]:opacity-100"
          @click="actions.openCreate({ scheduledDate: day.date })"
        >
          <Plus :size="14" /> Add
        </button>
      </section>
    </div>
  </div>
</template>
