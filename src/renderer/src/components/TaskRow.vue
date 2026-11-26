<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed } from 'vue'
import { CalendarDays, Check, Flag, Pencil, Play, Trash2 } from '@lucide/vue'
import { taskProgress, type Task } from '@shared/tasks'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskActions } from '@/stores/taskActions'
import { isPast } from '@/utils/dates'
import { useI18n } from '@/i18n'
import PrioritySignal from './PrioritySignal.vue'

/**
 * One task as aligned columns, so a list can be scanned top to bottom:
 * completion · title and subject · priority · dates · progress · actions.
 * `compact` (narrow side panels) keeps the title, with actions revealed on hover or focus.
 */
const props = withDefaults(
  defineProps<{ task: Task; showSubject?: boolean; showPlanned?: boolean; compact?: boolean }>(),
  { showSubject: true, showPlanned: true, compact: false }
)
const emit = defineEmits<{ delete: [task: Task] }>()

const subjects = useSubjectStore()
const actions = useTaskActions()
const { t, f } = useI18n()

const subject = computed(() => (props.task.subjectId ? subjects.byId.get(props.task.subjectId) : undefined))
const done = computed(() => props.task.status === 'completed')
const closed = computed(() => done.value || props.task.status === 'cancelled')
const focusedMinutes = computed(() => Math.floor(props.task.focusSeconds / 60))
const progress = computed(() => taskProgress(props.task))
const overdue = computed(() => !!props.task.deadline && !closed.value && isPast(props.task.deadline))
</script>

<template>
  <li
    class="group relative grid items-center gap-x-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2/60"
    :class="compact ? 'grid-cols-[1.25rem_minmax(0,1fr)]' : 'grid-cols-[1.25rem_minmax(0,1fr)_auto] @2xl:grid-cols-[1.25rem_minmax(0,1fr)_2rem_9rem_8.5rem_6.5rem]'"
  >
    <!-- Completion -->
    <button
      type="button"
      role="checkbox"
      :aria-checked="done"
      :aria-label="done ? t('task.reopen', { title: task.title }) : t('task.complete', { title: task.title })"
      :disabled="task.status === 'cancelled'"
      class="grid size-5 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-40"
      :class="
        done
          ? 'border-moss bg-moss text-bg'
          : task.status === 'in_progress'
            ? 'border-accent hover:bg-accent-soft'
            : 'border-faint hover:border-text'
      "
      @click="actions.toggleComplete(task)"
    >
      <Check v-if="done" :size="13" :stroke-width="3" />
      <span v-else-if="task.status === 'in_progress'" class="size-2 rounded-full bg-accent" />
    </button>

    <!-- Title, subject, and on narrow screens the dates -->
    <div class="min-w-0">
      <p class="truncate" :class="closed && 'text-muted line-through decoration-faint'">{{ task.title }}</p>
      <p
        v-if="(showSubject && subject) || task.status === 'cancelled' || task.status === 'in_progress'"
        class="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted"
      >
        <span v-if="showSubject && subject" class="inline-flex items-center gap-1.5">
          <span class="size-2 rounded-full" :style="{ background: subjectColor(subject.color) }" aria-hidden="true" />
          {{ subject.name }}
        </span>
        <span v-if="task.status === 'cancelled'">{{ t('status.cancelled') }}</span>
        <span v-else-if="task.status === 'in_progress'" class="text-accent">{{ t('status.in_progress') }}</span>
      </p>
      <p v-if="!compact && (task.deadline || (showPlanned && task.scheduledDate))" class="mt-0.5 flex gap-3 text-sm text-muted @2xl:hidden">
        <span v-if="task.deadline" :class="overdue && 'text-danger'">{{ t(overdue ? 'task.wasDue' : 'task.due', { day: f.relativeDay(task.deadline) }) }}</span>
      </p>
    </div>

    <!-- Priority -->
    <PrioritySignal v-if="!compact" :priority="task.priority" class="@max-2xl:hidden" />

    <!-- Dates: planned day and deadline, each on its own line -->
    <div v-if="!compact" class="flex flex-col gap-0.5 text-sm @max-2xl:hidden">
      <span v-if="showPlanned && task.scheduledDate && !closed" class="inline-flex items-center gap-1.5 text-muted">
        <CalendarDays :size="13" :stroke-width="1.75" class="shrink-0 text-faint" aria-hidden="true" />
        <span class="sr-only">{{ t('task.plannedLabel') }}</span>{{ f.relativeDay(task.scheduledDate) }}
      </span>
      <span v-if="task.deadline" class="inline-flex items-center gap-1.5" :class="overdue ? 'text-danger' : 'text-muted'">
        <Flag :size="13" :stroke-width="1.75" class="shrink-0" :class="!overdue && 'text-faint'" aria-hidden="true" />
        {{ t(overdue ? 'task.wasDue' : 'task.due', { day: f.relativeDay(task.deadline) }) }}
      </span>
    </div>

    <!-- Progress against the estimate -->
    <div v-if="!compact" class="text-sm text-muted tabular-nums @max-2xl:hidden">
      <template v-if="task.estimatedMinutes">
        <div class="track w-full min-w-16" aria-hidden="true">
          <span :class="(progress ?? 0) >= 1 && '!bg-moss'" :style="{ width: `${Math.min(1, progress ?? 0) * 100}%` }" />
        </div>
        <span class="mt-1 block text-xs">
          {{ focusedMinutes > 0 ? t('task.ofEstimate', { done: f.duration(focusedMinutes), total: f.duration(task.estimatedMinutes) }) : t('task.estimated', { total: f.duration(task.estimatedMinutes) }) }}
        </span>
      </template>
      <span v-else-if="focusedMinutes > 0" class="text-xs">{{ t('task.focused', { time: f.duration(focusedMinutes) }) }}</span>
    </div>

    <!-- Actions: visible on hover and keyboard focus -->
    <div
      class="flex shrink-0 items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      :class="compact ? 'absolute end-2 top-1/2 -translate-y-1/2 rounded-lg bg-surface-2 shadow-sm' : '@max-2xl:opacity-100'"
    >
      <button
        v-if="!closed"
        type="button"
        :aria-label="t('task.focusOn', { title: task.title })"
        :title="t('task.focusOnShort')"
        class="icon-btn size-8 text-accent hover:!bg-accent-soft"
        @click="actions.focusOn(task)"
      >
        <Play :size="15" :stroke-width="2" />
      </button>
      <button
        type="button"
        :aria-label="t('task.edit', { title: task.title })"
        :title="t('common.edit')"
        class="icon-btn size-8"
        @click="actions.openEdit(task)"
      >
        <Pencil :size="15" :stroke-width="1.75" />
      </button>
      <button
        type="button"
        :aria-label="t('task.delete', { title: task.title })"
        :title="t('common.delete')"
        class="icon-btn size-8 hover:!text-danger"
        @click="emit('delete', task)"
      >
        <Trash2 :size="15" :stroke-width="1.75" />
      </button>
    </div>
  </li>
</template>
