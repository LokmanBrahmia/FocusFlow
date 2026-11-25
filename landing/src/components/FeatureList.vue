<script setup lang="ts">
import { CalendarRange, ChartColumn, HardDrive, ListChecks, Timer, WifiOff } from '@lucide/vue'

// Only features that ship in the current app.
const features = [
  {
    icon: Timer,
    title: 'Pomodoro focus timer',
    body: 'Focus sessions, short and long breaks, sounds and notifications. The timer keeps accurate time when the window is minimised, and a small always-on-top timer stays in view.'
  },
  {
    icon: ListChecks,
    title: 'Study task management',
    body: 'Organise tasks by subject with priorities, deadlines and time estimates. Progress is the focus time you actually spent against your estimate.'
  },
  {
    icon: CalendarRange,
    title: 'Daily and weekly planning',
    body: 'Place study blocks on a day timeline, move tasks between days, and compare planned time with the time you really focused.'
  },
  {
    icon: ChartColumn,
    title: 'Productivity statistics',
    body: 'Focus time per day, completed Pomodoros, time per subject, your most productive days and hours, study streaks, and how focused you felt.'
  },
  {
    icon: WifiOff,
    title: 'Offline-first',
    body: 'No account and no internet connection needed. Your study data is never sent anywhere; the only online request is an optional check for new versions.'
  },
  {
    icon: HardDrive,
    title: 'Local data storage',
    body: 'Everything lives in one database file on your computer. Back it up, restore it, or export it as JSON whenever you like.'
  }
]
</script>

<template>
  <section id="features" aria-labelledby="features-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <h2 id="features-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">What Azm does</h2>
    <p class="mt-3 max-w-[40rem] text-lg text-muted">Everything a student needs to plan study time and stick to it, in one desktop app.</p>

    <ul class="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="f in features" :key="f.title" class="border-t border-line pt-6">
        <component :is="f.icon" :size="22" :stroke-width="1.6" class="text-accent" aria-hidden="true" />
        <h3 class="mt-4 text-lg font-semibold">{{ f.title }}</h3>
        <p class="mt-2 text-muted">{{ f.body }}</p>
      </li>
    </ul>
  </section>
</template>
