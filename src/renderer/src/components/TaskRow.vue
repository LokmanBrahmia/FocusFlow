<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed } from 'vue'
import { Check, Pencil, Play, Trash2 } from '@lucide/vue'
import { PRIORITY_LABELS, formatMinutes, taskProgress, type Task } from '@shared/tasks'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskActions } from '@/stores/taskActions'
import { formatDay, isPast } from '@/utils/dates'

const props = withDefaults(
  defineProps<{ task: Task; showSubject?: boolean; showPlanned?: boolean; compact?: boolean }>(),
  { showSubject: true, showPlanned: true, compact: false }
)
const emit = defineEmits<{ delete: [task: Task] }>()

const subjects = useSubjectStore()
const actions = useTaskActions()

const subject = computed(() => (props.task.subjectId ? subjects.byId.get(props.task.subjectId) : undefined))
const done = computed(() => props.task.status === 'completed')
const closed = computed(() => done.value || props.task.status === 'cancelled')
const focusedMinutes = computed(() => Math.floor(props.task.focusSeconds / 60))
const progress = computed(() => taskProgress(props.task))
const overdue = computed(() => !!props.task.deadline && !closed.value && isPast(props.task.deadline))
</script>

<template>
  <li class="group relative flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2/60">
    <button
      type="button"
      role="checkbox"
      :aria-checked="done"
      :aria-label="done ? `Reopen ${task.title}` : `Complete ${task.title}`"
      :disabled="task.status === 'cancelled'"
      class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors disabled:opacity-40"
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

    <div class="min-w-0 flex-1">
      <p class="truncate" :class="closed && 'text-muted line-through decoration-faint'">{{ task.title }}</p>
      <p class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <template v-if="!compact">
          <span v-if="showSubject && subject" class="inline-flex items-center gap-1.5">
            <span class="size-2 rounded-full" :style="{ background: subjectColor(subject.color) }" />
            {{ subject.name }}
          </span>
          <span v-if="task.status === 'cancelled'">Cancelled</span>
          <span
            v-else-if="task.priority !== 'medium'"
            :class="task.priority === 'high' ? 'text-text' : 'text-faint'"
          >{{ PRIORITY_LABELS[task.priority] }} priority</span>
          <span v-if="showPlanned && task.scheduledDate && !closed">Planned {{ formatDay(task.scheduledDate) }}</span>
          <span v-if="task.deadline" :class="overdue && 'text-danger'">
            {{ overdue ? 'Was due' : 'Due' }} {{ formatDay(task.deadline) }}
          </span>
        </template>
        <span v-if="task.estimatedMinutes" class="inline-flex items-center gap-2">
          <span class="relative h-1 w-14 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span
              class="absolute inset-y-0 left-0 rounded-full"
              :class="(progress ?? 0) >= 1 ? 'bg-moss' : 'bg-accent'"
              :style="{ width: `${Math.min(1, progress ?? 0) * 100}%` }"
            />
          </span>
          <template v-if="focusedMinutes > 0">{{ formatMinutes(focusedMinutes) }} of {{ formatMinutes(task.estimatedMinutes) }}</template>
          <template v-else>{{ formatMinutes(task.estimatedMinutes) }} estimated</template>
        </span>
        <span v-else-if="focusedMinutes > 0">{{ formatMinutes(focusedMinutes) }} focused</span>
      </p>
    </div>

    <div
      class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      :class="compact && 'absolute top-2 right-2 rounded-lg bg-surface-2 shadow-sm'"
    >
      <button
        v-if="!closed"
        type="button"
        :aria-label="`Focus on ${task.title}`"
        title="Focus on this task"
        class="grid size-8 place-items-center rounded-lg text-accent hover:bg-accent-soft"
        @click="actions.focusOn(task)"
      >
        <Play :size="15" :stroke-width="2" />
      </button>
      <button
        type="button"
        :aria-label="`Edit ${task.title}`"
        title="Edit"
        class="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
        @click="actions.openEdit(task)"
      >
        <Pencil :size="15" :stroke-width="1.75" />
      </button>
      <button
        type="button"
        :aria-label="`Delete ${task.title}`"
        title="Delete"
        class="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
        @click="emit('delete', task)"
      >
        <Trash2 :size="15" :stroke-width="1.75" />
      </button>
    </div>
  </li>
</template>
