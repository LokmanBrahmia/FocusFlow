<script setup lang="ts">
import type { BarItem } from '@/utils/charts'
/**
 * Horizontal bars as an HTML list: every bar is directly labelled with its
 * name and value, so identity never depends on colour alone.
 */

defineProps<{ items: BarItem[]; label: string }>()
</script>

<template>
  <ul class="flex flex-col gap-3" :aria-label="label">
    <li v-for="item in items" :key="item.key">
      <div class="flex items-baseline justify-between gap-3">
        <span class="flex min-w-0 items-center gap-2">
          <span v-if="item.color" class="size-2.5 shrink-0 rounded-full" :style="{ background: item.color }" aria-hidden="true" />
          <span class="truncate">{{ item.label }}</span>
        </span>
        <span class="shrink-0">
          {{ item.value }}<span v-if="item.detail" class="ml-2 text-sm text-muted">{{ item.detail }}</span>
        </span>
      </div>
      <div class="mt-1.5 h-1.5 rounded-full bg-line/50" aria-hidden="true">
        <div
          class="h-full rounded-full"
          :style="{ width: `${Math.max(item.fraction > 0 ? 1.5 : 0, Math.min(1, item.fraction) * 100)}%`, background: item.color ?? 'var(--iris)' }"
        />
      </div>
    </li>
  </ul>
</template>
