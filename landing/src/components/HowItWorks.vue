<script setup lang="ts">
// A genuine sequence, so the steps are numbered.
const steps = [
  {
    title: 'Plan',
    body: 'Add what you need to study, estimate how long each task takes, and place it on a day. Reserve study blocks on the planner if you like a fixed schedule.'
  },
  {
    title: 'Focus',
    body: 'Start a Pomodoro straight from a task. The time you spend is recorded against that task, and a break follows when the session ends.'
  },
  {
    title: 'Review',
    body: 'Compare what you planned with what you did, see which subjects get your time, and keep your streak going.'
  }
]
</script>

<template>
  <section id="how-it-works" aria-labelledby="how-title" class="border-y border-line bg-surface/50">
    <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h2 id="how-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">How it works</h2>
      <ol class="mt-10 grid gap-10 md:grid-cols-3">
        <li v-for="(s, i) in steps" :key="s.title">
          <span class="display text-5xl text-iris" aria-hidden="true">{{ i + 1 }}</span>
          <h3 class="mt-3 text-xl font-semibold"><span class="sr-only">Step {{ i + 1 }}: </span>{{ s.title }}</h3>
          <p class="mt-2 text-muted">{{ s.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
