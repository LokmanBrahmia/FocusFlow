<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <!--
    The Azm mark (source: brand/azm-mark.svg): an abstract ع as one continuous
    stroke — a small loop flowing into a wider progress arc — ending in a step dot.
  -->
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14.44 5.69A3.1 3.1 0 1 0 12 10.7A4.5 4.5 0 1 0 15.55 17.97"
      stroke="var(--accent)"
      stroke-width="2.2"
      stroke-linecap="round"
    />
    <circle cx="17.33" cy="15.69" r="1.35" fill="var(--text)" />
  </svg>
</template>
