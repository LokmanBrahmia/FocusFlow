<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue'

const points = [
  'No account, sign-in or subscription.',
  'No analytics, tracking or advertising in the app.',
  'No internet connection needed. The only thing FocusFlow ever asks the internet is whether a newer version is on GitHub, and you can turn that off in Settings. No personal data is sent.',
  'Your tasks, plans and focus history stay in a single file on your computer, which you can back up or export at any time.'
]
</script>

<template>
  <section id="privacy" aria-labelledby="privacy-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <div class="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <ShieldCheck :size="26" :stroke-width="1.5" class="text-iris" aria-hidden="true" />
        <h2 id="privacy-title" class="display mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)]">Your study data stays yours</h2>
        <p class="mt-4 max-w-[34rem] text-lg text-muted">
          FocusFlow is a desktop app that works entirely offline. What you plan and how you study is nobody else’s business.
        </p>
      </div>
      <div>
        <ul class="flex flex-col divide-y divide-line border-y border-line">
          <li v-for="p in points" :key="p" class="py-4">{{ p }}</li>
        </ul>
        <p class="mt-5 text-sm text-muted">
          About this website: it sets no cookies and has no analytics. To show the current version and download
          links, your browser asks GitHub’s public API for the latest FocusFlow release.
        </p>
      </div>
    </div>
  </section>
</template>
