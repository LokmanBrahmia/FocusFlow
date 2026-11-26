<script setup lang="ts">
import { fill, m } from '../i18n'
// A genuine sequence, so the steps are numbered.
</script>

<template>
  <section id="how-it-works" aria-labelledby="how-title" class="border-y border-line bg-surface/50">
    <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 id="how-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">{{ m.how.title }}</h2>
      <ol class="mt-10 grid gap-10 md:grid-cols-3">
        <li v-for="(s, i) in m.how.steps" :key="s.title">
          <span class="display text-5xl text-accent" aria-hidden="true">{{ i + 1 }}</span>
          <h3 class="mt-3 text-xl font-semibold">
            <span class="sr-only">{{ fill(m.how.step, { n: i + 1 }) }} </span>{{ s.title }}
          </h3>
          <p class="mt-2 text-muted">{{ s.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
