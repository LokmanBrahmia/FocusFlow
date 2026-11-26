<script setup lang="ts">
import { m } from '../i18n'
</script>

<template>
  <section id="faq" aria-labelledby="faq-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <div class="grid gap-10 lg:grid-cols-[1fr_2fr]">
      <h2 id="faq-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">{{ m.faq.title }}</h2>
      <div class="divide-y divide-line border-y border-line">
        <details v-for="f in m.faq.items" :key="f.q" class="group py-1">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg [&::-webkit-details-marker]:hidden">
            {{ f.q }}
            <span class="text-2xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p class="pb-5 text-muted">{{ f.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
