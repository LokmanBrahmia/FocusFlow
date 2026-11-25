<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Download, MonitorSmartphone, WifiOff } from '@lucide/vue'
import { useLatestRelease } from '../useLatestRelease'

const release = useLatestRelease()
const version = computed(() => (release.value.status === 'ready' ? release.value.release.version : null))
</script>

<template>
  <section id="top" aria-labelledby="hero-title" class="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8 sm:pt-24">
    <div class="max-w-3xl">
      <p class="flex items-center gap-2 text-muted">
        <span class="display text-lg text-text">FocusFlow</span>
        <span v-if="version" class="rounded-full border border-line px-2 text-sm">v{{ version }}</span>
      </p>
      <h1 id="hero-title" class="display mt-5 text-[clamp(2.6rem,6.4vw,4.75rem)]">
        Take control of your time.<br />
        Focus on what matters.
      </h1>
      <p class="mt-6 max-w-[38rem] text-lg text-muted sm:text-xl">
        FocusFlow helps you organize your tasks, focus with Pomodoro sessions, and understand how you spend your
        time.
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="#download"
          class="inline-flex h-12 items-center gap-2.5 rounded-xl bg-iris px-5 text-lg font-medium text-white transition-[filter] hover:brightness-110"
        >
          <Download :size="19" :stroke-width="2" /> Download FocusFlow
        </a>
        <a
          href="#features"
          class="inline-flex h-12 items-center gap-2.5 rounded-xl border border-line px-5 text-lg transition-colors hover:bg-surface-2"
        >
          Explore Features <ArrowDown :size="17" :stroke-width="1.75" />
        </a>
      </div>

      <ul class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-muted">
        <li class="flex items-center gap-2"><MonitorSmartphone :size="16" :stroke-width="1.75" /> Fedora, Ubuntu and Windows</li>
        <li class="flex items-center gap-2"><WifiOff :size="16" :stroke-width="1.75" /> Works offline, no account</li>
      </ul>
    </div>

    <figure class="hero-shot mt-14">
      <div class="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgb(0_0_0/0.55)]">
        <img
          src="/screenshots/focus.webp"
          width="1600"
          height="1000"
          alt="The FocusFlow Focus screen: a large circular countdown at 23:58 for the task 'Derive backpropagation for a two-layer network', with Pause, Reset and Skip buttons."
          class="block h-auto w-full"
          fetchpriority="high"
        />
      </div>
      <figcaption class="mt-3 text-sm text-faint">The Focus screen. A real screenshot of FocusFlow with sample study data.</figcaption>
    </figure>
  </section>
</template>

<style scoped>
/* The page's one orchestrated moment: the product rises into place on load. */
.hero-shot {
  animation: rise 700ms cubic-bezier(0.2, 0.7, 0.2, 1) 120ms both;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
}
</style>
