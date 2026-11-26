<script setup lang="ts">
import { computed } from 'vue'
import { CalendarRange, ChartColumn, HardDrive, Languages, ListChecks, Timer } from '@lucide/vue'
import { m } from '../i18n'

// Only features that ship in the current app. Icons follow the catalogue's order.
const icons = [Timer, ListChecks, CalendarRange, ChartColumn, Languages, HardDrive]
const features = computed(() => m.value.features.items.map((f, i) => ({ ...f, icon: icons[i] })))
</script>

<template>
  <section id="features" aria-labelledby="features-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <h2 id="features-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">{{ m.features.title }}</h2>
    <p class="mt-3 max-w-[40rem] text-lg text-muted">{{ m.features.intro }}</p>

    <ul class="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="f in features" :key="f.title" class="border-t border-line pt-6">
        <component :is="f.icon" :size="22" :stroke-width="1.6" class="text-accent" aria-hidden="true" />
        <h3 class="mt-4 text-lg font-semibold">{{ f.title }}</h3>
        <p class="mt-2 text-muted">{{ f.body }}</p>
      </li>
    </ul>
  </section>
</template>
