<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <!-- The app's mark: a session ring three quarters through. -->
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="var(--line)" stroke-width="2.5" />
    <path d="M12 3a9 9 0 1 1-9 9" stroke="var(--iris)" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="12" cy="12" r="2.25" fill="var(--iris)" />
  </svg>
</template>
