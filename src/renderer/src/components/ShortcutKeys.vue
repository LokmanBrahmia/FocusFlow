<script setup lang="ts">
import { computed } from 'vue'
import { isMac } from '@/services/desktop'

const props = defineProps<{ keys: string[] }>()

const labels = computed(() =>
  props.keys.map((k) => {
    if (k === 'Mod') return isMac() ? '⌘' : 'Ctrl'
    if (k === 'Shift') return isMac() ? '⇧' : 'Shift'
    return k
  })
)
</script>

<template>
  <span class="inline-flex items-center gap-0.5">
    <kbd
      v-for="label in labels"
      :key="label"
      class="min-w-[1.25rem] rounded border border-line bg-surface px-1 text-center text-[0.6875rem] leading-[1.1rem] text-muted"
    >{{ label }}</kbd>
  </span>
</template>
