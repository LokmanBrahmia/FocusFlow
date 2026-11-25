<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed, reactive, ref } from 'vue'
import { ListChecks, Plus, Search, Settings2 } from '@lucide/vue'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  formatMinutes,
  type TaskPriority,
  type TaskQuery,
  type TaskSort,
  type TaskStatusFilter
} from '@shared/tasks'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppButton from '@/components/AppButton.vue'
import ShortcutKeys from '@/components/ShortcutKeys.vue'
import TaskList from '@/components/TaskList.vue'
import SubjectManagerDialog from '@/components/SubjectManagerDialog.vue'
import { useTaskList } from '@/composables/useTaskList'
import { useSubjectStore } from '@/stores/subjects'
import { useTaskActions } from '@/stores/taskActions'

const subjects = useSubjectStore()
const actions = useTaskActions()

const filter = reactive({
  search: '',
  status: 'open' as TaskStatusFilter,
  priority: 'all' as TaskPriority | 'all',
  subjectId: 'all',
  sort: 'created' as TaskSort
})

const query = computed<TaskQuery>(() => ({ ...filter }))
const { tasks, total, loading, error } = useTaskList(() => query.value, { debounceMs: 120 })

const manageOpen = ref(false)

const selectedSubject = computed(() => subjects.byId.get(filter.subjectId))
const filtered = computed(
  () => !!filter.search.trim() || filter.status !== 'open' || filter.priority !== 'all' || filter.subjectId !== 'all'
)

const selectClass = 'h-9 rounded-lg border border-line bg-surface px-2.5 text-muted outline-none hover:text-text focus:border-iris'

function addTask(): void {
  const subjectId = filter.subjectId !== 'all' && filter.subjectId !== 'none' ? filter.subjectId : undefined
  actions.openCreate(subjectId ? { subjectId } : {})
}

function clearFilters(): void {
  Object.assign(filter, { search: '', status: 'open', priority: 'all', subjectId: 'all' })
}

function onSubjectDeleted(id: string): void {
  if (filter.subjectId === id) filter.subjectId = 'all'
}
</script>

<template>
  <div>
    <PageHeader :title="$route.meta.title" :subtitle="$route.meta.subtitle">
      <template #actions>
        <AppButton variant="primary" :icon="Plus" @click="addTask">
          New task
          <ShortcutKeys :keys="['Mod', 'N']" class="ml-1 opacity-80 [&_kbd]:border-white/30 [&_kbd]:bg-transparent [&_kbd]:text-white" />
        </AppButton>
      </template>
    </PageHeader>

    <div class="grid gap-8 lg:grid-cols-[13rem_1fr]">
      <!-- Subjects double as the primary filter. -->
      <nav aria-label="Subjects" class="flex flex-col gap-0.5 max-lg:flex-row max-lg:flex-wrap">
        <button
          v-for="opt in [
            { id: 'all', name: 'All subjects' },
            { id: 'none', name: 'No subject' }
          ]"
          :key="opt.id"
          type="button"
          :aria-pressed="filter.subjectId === opt.id"
          class="flex h-9 items-center rounded-lg px-2.5 text-left text-muted transition-colors hover:bg-surface-2 hover:text-text"
          :class="filter.subjectId === opt.id && 'bg-surface-2 text-text'"
          @click="filter.subjectId = opt.id"
        >
          {{ opt.name }}
        </button>
        <button
          v-for="s in subjects.subjects"
          :key="s.id"
          type="button"
          :aria-pressed="filter.subjectId === s.id"
          class="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-muted transition-colors hover:bg-surface-2 hover:text-text"
          :class="filter.subjectId === s.id && 'bg-surface-2 text-text'"
          @click="filter.subjectId = s.id"
        >
          <span class="size-2 shrink-0 rounded-full" :style="{ background: subjectColor(s.color) }" />
          <span class="flex-1 truncate">{{ s.name }}</span>
          <span v-if="s.openTaskCount" class="text-sm text-faint tabular-nums">{{ s.openTaskCount }}</span>
        </button>
        <button
          type="button"
          class="mt-2 flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-muted hover:bg-surface-2 hover:text-text"
          @click="manageOpen = true"
        >
          <Settings2 :size="15" :stroke-width="1.75" /> Manage subjects
        </button>
      </nav>

      <section class="min-w-0">
        <p v-if="selectedSubject" class="mb-4 text-muted">
          {{ formatMinutes(selectedSubject.focusSeconds / 60) }} focused on {{ selectedSubject.name }} so far,
          across {{ selectedSubject.taskCount }} {{ selectedSubject.taskCount === 1 ? 'task' : 'tasks' }}.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <label class="relative min-w-48 flex-1">
            <span class="sr-only">Search tasks</span>
            <Search :size="15" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input
              v-model="filter.search"
              type="search"
              placeholder="Search by title"
              class="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 outline-none focus:border-iris"
            />
          </label>
          <select v-model="filter.status" aria-label="Status" :class="selectClass">
            <option value="open">Open</option>
            <option v-for="s in TASK_STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
            <option value="all">Any status</option>
          </select>
          <select v-model="filter.priority" aria-label="Priority" :class="selectClass">
            <option value="all">Any priority</option>
            <option v-for="p in TASK_PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABELS[p] }}</option>
          </select>
          <select v-model="filter.sort" aria-label="Sort by" :class="selectClass">
            <option value="created">Newest first</option>
            <option value="deadline">By deadline</option>
            <option value="priority">By priority</option>
          </select>
        </div>

        <div class="mt-4">
          <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
          <p v-else-if="loading && tasks.length === 0" class="py-6 text-muted">Loading tasks…</p>

          <template v-else-if="tasks.length === 0">
            <div v-if="filtered" class="py-8 text-muted">
              No tasks match these filters.
              <button type="button" class="ml-1 text-iris hover:underline" @click="clearFilters">Clear filters</button>
            </div>
            <EmptyState
              v-else
              :icon="ListChecks"
              title="No open tasks"
              body="Add what you need to study, estimate how long it will take, and start a focus session straight from the task."
            >
              <AppButton :icon="Plus" @click="addTask">Add a task</AppButton>
            </EmptyState>
          </template>

          <template v-else>
            <TaskList :tasks="tasks" :show-subject="filter.subjectId === 'all'" />
            <p v-if="total > tasks.length" class="mt-3 text-sm text-muted">
              Showing {{ tasks.length }} of {{ total }} tasks. Search or filter to find the rest.
            </p>
          </template>
        </div>
      </section>
    </div>

    <SubjectManagerDialog v-model:open="manageOpen" @deleted="onSubjectDeleted" />
  </div>
</template>
