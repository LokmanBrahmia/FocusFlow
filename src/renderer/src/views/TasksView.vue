<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed, reactive, ref } from 'vue'
import { addDays, format } from 'date-fns'
import { ListChecks, Plus, Search, Settings2 } from '@lucide/vue'
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskQuery,
  type TaskSort,
  type TaskStatusFilter
} from '@shared/tasks'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ShortcutKeys from '@/components/ShortcutKeys.vue'
import TaskList from '@/components/TaskList.vue'
import QuickAdd from '@/components/QuickAdd.vue'
import SubjectManagerDialog from '@/components/SubjectManagerDialog.vue'
import { useTaskList } from '@/composables/useTaskList'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskActions } from '@/stores/taskActions'
import { todayISO } from '@/utils/dates'
import { useI18n, type MessageKey } from '@/i18n'

const subjects = useSubjectStore()
const actions = useTaskActions()
const { t, f } = useI18n()

type GroupBy = 'date' | 'subject' | 'priority' | 'none'

const filter = reactive({
  search: '',
  status: 'open' as TaskStatusFilter,
  priority: 'all' as TaskPriority | 'all',
  subjectId: 'all',
  sort: 'priority' as TaskSort
})
const groupBy = ref<GroupBy>('date')

const query = computed<TaskQuery>(() => ({ ...filter }))
const { tasks, total, loading, error } = useTaskList(() => query.value, { debounceMs: 120 })

const manageOpen = ref(false)
const selectedSubject = computed(() => subjects.byId.get(filter.subjectId))
const filtered = computed(
  () => !!filter.search.trim() || filter.status !== 'open' || filter.priority !== 'all' || filter.subjectId !== 'all'
)
const quickDefaults = computed(() =>
  filter.subjectId !== 'all' && filter.subjectId !== 'none' ? { subjectId: filter.subjectId } : {}
)

function addTask(): void {
  actions.openCreate(quickDefaults.value)
}
function clearFilters(): void {
  Object.assign(filter, { search: '', status: 'open', priority: 'all', subjectId: 'all' })
}
function onSubjectDeleted(id: string): void {
  if (filter.subjectId === id) filter.subjectId = 'all'
}

// ── grouping ────────────────────────────────────────────────────────────────
interface Group {
  key: string
  label: string
  tone?: 'danger' | 'accent'
  color?: string
  tasks: Task[]
}

const today = todayISO()
const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd')
const closed = (x: Task) => x.status === 'completed' || x.status === 'cancelled'

/** The date that matters most for an open task: the earlier of its plan day and deadline. */
function keyDate(x: Task): string | null {
  const dates = [x.scheduledDate, x.deadline].filter((d): d is string => !!d)
  return dates.length ? dates.sort()[0] : null
}

const groups = computed<Group[]>(() => {
  const list = tasks.value
  const make = (key: string, label: string, items: Task[], extra: Partial<Group> = {}): Group => ({ key, label, tasks: items, ...extra })

  if (groupBy.value === 'none') return [make('all', '', list)]

  if (groupBy.value === 'priority') {
    return [...TASK_PRIORITIES]
      .reverse()
      .map((p) => make(p, t(`priority.${p}`), list.filter((x) => x.priority === p), p === 'high' ? { tone: 'accent' } : {}))
      .filter((g) => g.tasks.length)
  }

  if (groupBy.value === 'subject') {
    const named = subjects.subjects
      .map((s) => make(s.id, s.name, list.filter((x) => x.subjectId === s.id), { color: subjectColor(s.color) }))
      .filter((g) => g.tasks.length)
    const none = list.filter((x) => !x.subjectId || !subjects.byId.has(x.subjectId))
    return none.length ? [...named, make('none', t('tasks.noSubject'), none)] : named
  }

  // By date
  const buckets: Record<string, Task[]> = { overdue: [], today: [], week: [], later: [], none: [], done: [] }
  for (const x of list) {
    if (closed(x)) buckets.done.push(x)
    else if (x.deadline && x.deadline < today) buckets.overdue.push(x)
    else {
      const d = keyDate(x)
      if (!d) buckets.none.push(x)
      else if (d <= today) buckets.today.push(x)
      else if (d <= weekEnd) buckets.week.push(x)
      else buckets.later.push(x)
    }
  }
  const labels: Record<string, MessageKey> = {
    overdue: 'tasks.group.overdue',
    today: 'tasks.group.today',
    week: 'tasks.group.week',
    later: 'tasks.group.later',
    none: 'tasks.group.none',
    done: 'tasks.group.done'
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length)
    .map(([key, items]) => make(key, t(labels[key]), items, key === 'overdue' ? { tone: 'danger' } : key === 'today' ? { tone: 'accent' } : {}))
})

const groupOptions: { value: GroupBy; label: MessageKey }[] = [
  { value: 'date', label: 'tasks.groupBy.date' },
  { value: 'subject', label: 'tasks.groupBy.subject' },
  { value: 'priority', label: 'tasks.groupBy.priority' },
  { value: 'none', label: 'tasks.groupBy.none' }
]
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader
      :eyebrow="t('tasks.eyebrow', { count: subjects.subjects.reduce((n, s) => n + s.openTaskCount, 0) })"
      :title="t('nav.tasks')"
      :subtitle="t('tasks.subtitle')"
    >
      <template #actions>
        <button type="button" class="btn btn-ghost" @click="manageOpen = true">
          <Settings2 :size="16" :stroke-width="1.75" /> {{ t('tasks.manageSubjects') }}
        </button>
        <button type="button" class="btn btn-primary" @click="addTask">
          <Plus :size="16" :stroke-width="2" /> {{ t('tasks.new') }}
          <ShortcutKeys :keys="['Mod', 'N']" class="ms-1 opacity-80 [&_kbd]:border-on-accent/25 [&_kbd]:bg-transparent [&_kbd]:text-on-accent" />
        </button>
      </template>
    </PageHeader>

    <!-- Toolbar: search and filters on one line, subjects as chips beneath -->
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-56 flex-1">
          <span class="sr-only">{{ t('tasks.search') }}</span>
          <Search :size="15" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
          <input v-model="filter.search" type="search" :placeholder="t('tasks.search')" class="field bg-surface ps-9" />
        </label>
        <select v-model="filter.status" :aria-label="t('tasks.filter.status')" class="field w-auto bg-surface text-muted">
          <option value="open">{{ t('tasks.filter.open') }}</option>
          <option v-for="s in TASK_STATUSES" :key="s" :value="s">{{ t(`status.${s}`) }}</option>
          <option value="all">{{ t('tasks.filter.anyStatus') }}</option>
        </select>
        <select v-model="filter.priority" :aria-label="t('tasks.filter.priority')" class="field w-auto bg-surface text-muted">
          <option value="all">{{ t('tasks.filter.anyPriority') }}</option>
          <option v-for="p in TASK_PRIORITIES" :key="p" :value="p">{{ t(`priority.${p}`) }}</option>
        </select>
        <select v-model="filter.sort" :aria-label="t('tasks.filter.sort')" class="field w-auto bg-surface text-muted">
          <option value="priority">{{ t('tasks.sort.priority') }}</option>
          <option value="deadline">{{ t('tasks.sort.deadline') }}</option>
          <option value="created">{{ t('tasks.sort.created') }}</option>
        </select>
      </div>

      <div class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="t('tasks.subjects')">
        <button type="button" class="chip" :aria-pressed="filter.subjectId === 'all'" @click="filter.subjectId = 'all'">
          {{ t('tasks.allSubjects') }}
        </button>
        <button
          v-for="s in subjects.subjects"
          :key="s.id"
          type="button"
          class="chip"
          :aria-pressed="filter.subjectId === s.id"
          @click="filter.subjectId = s.id"
        >
          <span class="size-2 rounded-full" :style="{ background: subjectColor(s.color) }" aria-hidden="true" />
          {{ s.name }}
          <span v-if="s.openTaskCount" class="text-xs text-faint tabular-nums">{{ s.openTaskCount }}</span>
        </button>
        <button type="button" class="chip" :aria-pressed="filter.subjectId === 'none'" @click="filter.subjectId = 'none'">
          {{ t('tasks.noSubject') }}
        </button>
      </div>
    </div>

    <p v-if="selectedSubject" class="-mt-1 text-sm text-muted">
      {{ t('tasks.subjectSummary', { time: f.duration(selectedSubject.focusSeconds / 60), subject: selectedSubject.name, count: selectedSubject.taskCount }) }}
    </p>

    <!-- The list -->
    <section class="panel" :aria-label="t('nav.tasks')">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p class="text-sm text-muted tabular-nums">{{ t('tasks.showing', { count: tasks.length }) }}</p>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted">{{ t('tasks.groupBy') }}</span>
          <div role="radiogroup" :aria-label="t('tasks.groupBy')" class="seg">
            <button
              v-for="o in groupOptions"
              :key="o.value"
              type="button"
              role="radio"
              :aria-checked="groupBy === o.value"
              @click="groupBy = o.value"
            >
              {{ t(o.label) }}
            </button>
          </div>
        </div>
      </div>

      <div class="px-2 pt-2 pb-4">
        <div class="px-3 pt-1 pb-2">
          <QuickAdd :defaults="quickDefaults" />
        </div>

        <p v-if="error" role="alert" class="px-3 text-danger">{{ error }}</p>
        <p v-else-if="loading && tasks.length === 0" class="px-3 py-6 text-muted">{{ t('common.loading') }}</p>

        <template v-else-if="tasks.length === 0">
          <div v-if="filtered" class="px-3 py-8 text-muted">
            {{ t('tasks.noMatch') }}
            <button type="button" class="ms-1 text-accent hover:underline" @click="clearFilters">{{ t('tasks.clearFilters') }}</button>
          </div>
          <div v-else class="px-3 pt-2">
            <EmptyState :icon="ListChecks" :title="t('tasks.empty.title')" :body="t('tasks.empty.body')" />
          </div>
        </template>

        <div v-else class="@container">
          <!-- Column headings, aligned with TaskRow's grid -->
          <div
            class="hidden grid-cols-[1.25rem_minmax(0,1fr)_2rem_9rem_8.5rem_6.5rem] gap-x-4 px-3 pt-2 pb-1 text-xs text-faint @2xl:grid"
            aria-hidden="true"
          >
            <span />
            <span>{{ t('tasks.col.task') }}</span>
            <span />
            <span>{{ t('tasks.col.dates') }}</span>
            <span>{{ t('tasks.col.progress') }}</span>
            <span />
          </div>

          <section v-for="g in groups" :key="g.key" :aria-label="g.label || undefined" class="mt-2 first:mt-0">
            <h3 v-if="g.label" class="flex items-center gap-2 px-3 pt-3 pb-1 text-sm font-medium">
              <span v-if="g.color" class="size-2 rounded-full" :style="{ background: g.color }" aria-hidden="true" />
              <span :class="g.tone === 'danger' ? 'text-danger' : g.tone === 'accent' ? 'text-accent' : 'text-muted'">{{ g.label }}</span>
              <span class="text-xs text-faint tabular-nums">{{ g.tasks.length }}</span>
            </h3>
            <TaskList :tasks="g.tasks" :show-subject="groupBy !== 'subject' && filter.subjectId === 'all'" />
          </section>

          <p v-if="total > tasks.length" class="mt-3 px-3 text-sm text-muted">
            {{ t('tasks.partial', { shown: tasks.length, total }) }}
          </p>
        </div>
      </div>
    </section>

    <SubjectManagerDialog v-model:open="manageOpen" @deleted="onSubjectDeleted" />
  </div>
</template>
