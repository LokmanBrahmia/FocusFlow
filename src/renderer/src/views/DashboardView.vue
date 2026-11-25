<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { CalendarRange, ChartColumn, ListChecks, Plus, Timer } from '@lucide/vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppButton from '@/components/AppButton.vue'
import TaskList from '@/components/TaskList.vue'
import DailySummary from '@/components/DailySummary.vue'
import { useTaskActions } from '@/stores/taskActions'
import { useTaskList } from '@/composables/useTaskList'
import { todayISO } from '@/utils/dates'

const actions = useTaskActions()
const today = format(new Date(), 'EEEE, d MMMM')
const todayKey = todayISO()

const { tasks, loading } = useTaskList(() => ({ scheduledDate: todayKey, status: 'all', sort: 'priority' }))

// Open tasks first, then what was finished today; cancelled tasks are hidden.
const todays = computed(() => {
  const visible = tasks.value.filter((t) => t.status !== 'cancelled')
  return [...visible.filter((t) => t.status !== 'completed'), ...visible.filter((t) => t.status === 'completed')]
})
const doneCount = computed(() => todays.value.filter((t) => t.status === 'completed').length)

const goalText = 'Plan the day, then focus on one task at a time.'

function addForToday(): void {
  actions.openCreate({ scheduledDate: todayKey })
}
</script>

<template>
  <div>
    <PageHeader :title="today" :subtitle="goalText">
      <template #actions>
        <AppButton variant="primary" :icon="Timer" to="/focus">Start focus</AppButton>
      </template>
    </PageHeader>

    <DailySummary />

    <div class="grid gap-8 lg:grid-cols-[1fr_15rem]">
      <section aria-labelledby="today-heading" class="min-w-0">
        <div class="mb-2 flex items-baseline justify-between gap-4">
          <h2 id="today-heading" class="text-lg font-semibold">Planned for today</h2>
          <p v-if="todays.length" class="text-sm text-muted">{{ doneCount }} of {{ todays.length }} done</p>
        </div>

        <p v-if="loading && todays.length === 0" class="py-4 text-muted">Loading…</p>
        <EmptyState
          v-else-if="todays.length === 0"
          :icon="ListChecks"
          title="Nothing planned for today"
          body="Plan a task for today and it shows up here, with its subject, priority and how much of the estimate you have covered."
        >
          <AppButton :icon="Plus" @click="addForToday">Add a task for today</AppButton>
        </EmptyState>
        <template v-else>
          <TaskList :tasks="todays" :show-planned="false" />
          <button
            type="button"
            class="mt-2 inline-flex h-9 items-center gap-2 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-text"
            @click="addForToday"
          >
            <Plus :size="16" :stroke-width="2" /> Add a task for today
          </button>
        </template>
      </section>

      <nav aria-label="Shortcuts" class="flex flex-col gap-1 text-muted">
        <RouterLink
          to="/tasks"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-2 hover:text-text"
        >
          <ListChecks :size="16" :stroke-width="1.75" /> All tasks
        </RouterLink>
        <RouterLink
          :to="{ path: '/planner', query: { view: 'day' } }"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-2 hover:text-text"
        >
          <CalendarRange :size="16" :stroke-width="1.75" /> Open today's plan
        </RouterLink>
        <RouterLink
          to="/statistics"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-2 hover:text-text"
        >
          <ChartColumn :size="16" :stroke-width="1.75" /> View statistics
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
