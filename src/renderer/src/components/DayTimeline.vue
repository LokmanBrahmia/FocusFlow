<script setup lang="ts">
import { subjectColor } from '@/composables/useTheme'
import { computed, onBeforeUnmount, ref } from 'vue'
import { format } from 'date-fns'
import { minutesOf, type DayPlan, type TimeBlock } from '@shared/planner'
import { formatMinutes } from '@shared/tasks'
import { useSubjectStore } from '@/stores/subjects'
import { parseDay, todayISO } from '@/utils/dates'

/**
 * Two lanes on one clock: "Planned" holds study blocks (outlined), "Focused"
 * holds recorded sessions (solid). Clicking empty planned time creates a block.
 */
const props = defineProps<{ day: DayPlan }>()
const emit = defineEmits<{ create: [start: string, end: string]; edit: [block: TimeBlock] }>()

const subjects = useSubjectStore()
const HOUR_PX = 52
const pad = (n: number): string => String(n).padStart(2, '0')
const hhmm = (min: number): string => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

const dayStart = computed(() => parseDay(props.day.date))

const sessions = computed(() =>
  props.day.sessions.map((s) => {
    const start = Math.max(0, (new Date(s.startedAt).getTime() - dayStart.value.getTime()) / 60000)
    const end = Math.min(24 * 60, (new Date(s.endedAt).getTime() - dayStart.value.getTime()) / 60000)
    return { ...s, start, end: Math.max(end, start + 4) }
  })
)

/** Default 07:00–23:00, widened to fit anything outside it. */
const range = computed(() => {
  const starts = [...props.day.blocks.map((b) => minutesOf(b.start)), ...sessions.value.map((s) => s.start)]
  const ends = [...props.day.blocks.map((b) => minutesOf(b.end)), ...sessions.value.map((s) => s.end)]
  const first = Math.min(7, ...starts.map((m) => Math.floor(m / 60)))
  const last = Math.max(23, ...ends.map((m) => Math.ceil(m / 60)))
  return { first, last: Math.min(24, last) }
})
const hours = computed(() => Array.from({ length: range.value.last - range.value.first }, (_, i) => range.value.first + i))
const height = computed(() => hours.value.length * HOUR_PX)
const y = (min: number): number => ((min - range.value.first * 60) / 60) * HOUR_PX

const now = ref(new Date())
const tick = window.setInterval(() => (now.value = new Date()), 60_000)
onBeforeUnmount(() => window.clearInterval(tick))
const nowY = computed(() =>
  props.day.date === todayISO() ? y(now.value.getHours() * 60 + now.value.getMinutes()) : null
)

function color(b: TimeBlock): string {
  return subjectColor(b.subjectId ? subjects.byId.get(b.subjectId)?.color : null, 'var(--accent)')
}

function onLaneClick(e: MouseEvent): void {
  if (e.target !== e.currentTarget) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const minute = range.value.first * 60 + ((e.clientY - rect.top) / HOUR_PX) * 60
  const start = Math.min(Math.floor(minute / 30) * 30, 23 * 60)
  emit('create', hhmm(start), hhmm(Math.min(start + 60, 23 * 60 + 59)))
}
</script>

<template>
  <div>
    <div class="grid grid-cols-[3rem_1fr_1fr] gap-x-2 pb-2 text-sm text-muted">
      <span />
      <span class="flex items-center gap-2">
        <span class="h-2.5 w-4 rounded-sm border border-dashed border-accent" aria-hidden="true" /> Planned
      </span>
      <span class="flex items-center gap-2">
        <span class="h-2.5 w-4 rounded-sm bg-accent" aria-hidden="true" /> Focused
      </span>
    </div>

    <div class="relative grid grid-cols-[3rem_1fr_1fr] gap-x-2" :style="{ height: `${height}px` }">
      <!-- Hour grid -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          v-for="(h, i) in hours"
          :key="h"
          class="absolute right-0 left-12 border-t border-line/70"
          :style="{ top: `${i * HOUR_PX}px` }"
        />
      </div>

      <div class="relative" aria-hidden="true">
        <span
          v-for="(h, i) in hours"
          :key="h"
          class="absolute right-1 -translate-y-1/2 text-xs text-faint tabular-nums"
          :style="{ top: `${i * HOUR_PX}px` }"
        >{{ pad(h) }}:00</span>
      </div>

      <!-- Planned lane -->
      <div
        class="relative cursor-copy rounded-lg"
        role="group"
        aria-label="Planned study blocks. Click an empty slot to add one."
        @click="onLaneClick"
      >
        <button
          v-for="b in day.blocks"
          :key="b.id"
          type="button"
          class="absolute inset-x-0 overflow-hidden rounded-lg border border-dashed px-2.5 py-1 text-left text-sm transition-colors hover:bg-surface-2"
          :style="{
            top: `${y(minutesOf(b.start))}px`,
            height: `${Math.max(22, y(minutesOf(b.end)) - y(minutesOf(b.start)) - 2)}px`,
            borderColor: color(b),
            background: `color-mix(in srgb, ${color(b)} 10%, transparent)`
          }"
          @click="emit('edit', b)"
        >
          <span class="block truncate font-medium">{{ b.taskTitle }}</span>
          <span class="block text-xs text-muted tabular-nums">{{ b.start }}–{{ b.end }}</span>
        </button>
      </div>

      <!-- Actual lane -->
      <div class="relative" role="list" aria-label="Recorded focus sessions">
        <div
          v-for="s in sessions"
          :key="s.id"
          role="listitem"
          class="absolute inset-x-0 overflow-hidden rounded-md bg-accent px-2.5 py-px text-sm text-on-accent"
          :style="{ top: `${y(s.start)}px`, height: `${Math.max(6, y(s.end) - y(s.start) - 2)}px` }"
          :title="`${s.taskTitle ?? 'Focus'}: ${format(new Date(s.startedAt), 'HH:mm')}, ${formatMinutes(s.seconds / 60)}`"
        >
          <span v-if="y(s.end) - y(s.start) > 16" class="block truncate text-xs leading-4">{{ s.taskTitle ?? 'Focus session' }}</span>
          <span v-if="y(s.end) - y(s.start) > 44" class="block text-xs text-on-accent/75">{{ formatMinutes(s.seconds / 60) }}</span>
        </div>
      </div>

      <div
        v-if="nowY !== null && nowY >= 0 && nowY <= height"
        class="pointer-events-none absolute right-0 left-12 flex items-center"
        :style="{ top: `${nowY}px` }"
        aria-hidden="true"
      >
        <span class="-ml-1 size-2 rounded-full bg-danger" />
        <span class="h-px flex-1 bg-danger" />
      </div>
    </div>
  </div>
</template>
