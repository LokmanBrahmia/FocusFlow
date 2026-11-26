<script setup lang="ts">
import type { TaskPriority } from '@shared/tasks'
import { useI18n } from '@/i18n'

/** Priority as three rising bars (1 low, 2 medium, 3 high): readable without colour. */
const props = defineProps<{ priority: TaskPriority }>()
const { t } = useI18n()
const level = { low: 1, medium: 2, high: 3 }[props.priority]
</script>

<template>
  <span
    class="inline-flex h-4 items-end gap-[3px]"
    role="img"
    :aria-label="t('priority.label', { priority: t(`priority.${priority}`) })"
    :title="t('priority.label', { priority: t(`priority.${priority}`) })"
  >
    <span
      v-for="i in 3"
      :key="i"
      class="w-[3px] rounded-full"
      :style="{ height: `${4 + i * 3}px` }"
      :class="i <= level ? (priority === 'high' ? 'bg-accent' : 'bg-muted') : 'bg-line'"
    />
  </span>
</template>
