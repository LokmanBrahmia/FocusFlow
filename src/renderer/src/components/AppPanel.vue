<script setup lang="ts">
/**
 * A framed region with a consistent header: optional eyebrow, title, a short
 * meta line on the far edge, and actions. Body padding can be turned off for
 * lists and charts that run edge to edge.
 */
withDefaults(
  defineProps<{ title?: string; eyebrow?: string; meta?: string; flush?: boolean; tag?: string }>(),
  { title: undefined, eyebrow: undefined, meta: undefined, flush: false, tag: 'section' }
)
</script>

<template>
  <component :is="tag" class="panel flex min-w-0 flex-col">
    <header
      v-if="title || eyebrow || $slots.actions || meta"
      class="flex items-start justify-between gap-4 px-5 pt-4"
      :class="flush ? 'pb-3' : 'pb-1'"
    >
      <div class="min-w-0">
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="truncate text-base font-semibold">{{ title }}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span v-if="meta" class="text-sm text-muted tabular-nums">{{ meta }}</span>
        <slot name="actions" />
      </div>
    </header>
    <div :class="flush ? '' : 'px-5 pt-2 pb-5'" class="min-w-0 flex-1">
      <slot />
    </div>
  </component>
</template>
