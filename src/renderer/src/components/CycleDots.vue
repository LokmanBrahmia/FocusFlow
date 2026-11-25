<script setup lang="ts">
defineProps<{ completed: number; total: number; current: boolean }>()
</script>

<template>
  <!-- One dot per focus session in the set; filled = done, ringed = the one in progress. -->
  <span class="inline-flex items-center gap-1.5" aria-hidden="true">
    <span
      v-for="i in total"
      :key="i"
      class="size-1.5 rounded-full"
      :class="
        i <= completed
          ? 'bg-accent'
          : i === completed + 1 && current
            ? 'ring-1 ring-accent'
            : 'bg-line'
      "
    />
  </span>
</template>
