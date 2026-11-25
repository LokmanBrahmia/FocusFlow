<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'quiet'
    icon?: Component
    to?: string
    disabled?: boolean
  }>(),
  { variant: 'quiet', icon: undefined, to: undefined, disabled: false }
)
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    :disabled="to ? undefined : disabled"
    class="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="
      variant === 'primary'
        ? 'bg-accent text-on-accent hover:brightness-110'
        : 'border border-line bg-surface text-text hover:bg-surface-2'
    "
  >
    <component :is="icon" v-if="icon" :size="16" :stroke-width="2" aria-hidden="true" />
    <slot />
  </component>
</template>
