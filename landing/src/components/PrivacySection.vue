<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'
import { m } from '../i18n'
</script>

<template>
  <section id="privacy" aria-labelledby="privacy-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <div class="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <ShieldCheck :size="26" :stroke-width="1.5" class="text-accent" aria-hidden="true" />
        <h2 id="privacy-title" class="display mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)]">{{ m.privacy.title }}</h2>
        <p class="mt-4 max-w-[34rem] text-lg text-muted">{{ m.privacy.intro }}</p>
      </div>
      <div>
        <ul class="flex flex-col divide-y divide-line border-y border-line">
          <li v-for="p in m.privacy.points" :key="p" class="py-4">{{ p }}</li>
        </ul>
        <p class="mt-5 text-sm text-muted">{{ m.privacy.site }}</p>
      </div>
    </div>
  </section>
</template>
