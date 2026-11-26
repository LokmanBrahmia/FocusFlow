<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Download, Languages, MonitorSmartphone, WifiOff } from '@lucide/vue'
import { useLatestRelease } from '../useLatestRelease'
import { lang, m } from '../i18n'
import { shots } from '../screenshots'

const release = useLatestRelease()
const version = computed(() => (release.value.status === 'ready' ? release.value.release.version : null))
const titleLines = computed(() => m.value.hero.title.split('\n'))
</script>

<template>
  <section id="top" aria-labelledby="hero-title" class="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8 sm:pt-24">
    <div class="max-w-3xl">
      <p class="flex items-center gap-2 text-muted">
        <template v-if="lang === 'ar'">
          <span class="text-lg font-medium text-text">عَزم</span>
          <span lang="en" dir="ltr">Azm</span>
        </template>
        <template v-else>
          <span class="text-lg font-medium tracking-tight text-text">Azm</span>
          <span lang="ar" dir="rtl" class="text-lg">عَزم</span>
        </template>
        <span v-if="version" dir="ltr" class="rounded-full border border-line px-2 text-sm">v{{ version }}</span>
      </p>
      <h1 id="hero-title" class="display mt-5 text-[clamp(2.6rem,6.4vw,4.75rem)]">
        <template v-for="(line, i) in titleLines" :key="i"><br v-if="i" />{{ line }}</template>
      </h1>
      <p
        :lang="m.hero.secondLang"
        :dir="m.hero.secondLang === 'ar' ? 'rtl' : 'ltr'"
        class="mt-4 w-fit text-xl text-muted sm:text-2xl"
      >{{ m.hero.second }}</p>
      <p class="mt-6 max-w-[38rem] text-lg text-muted sm:text-xl">{{ m.hero.body }}</p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="#download"
          class="inline-flex h-12 items-center gap-2.5 rounded-xl bg-accent px-5 text-lg font-medium text-on-accent transition-[filter] hover:brightness-110"
        >
          <Download :size="19" :stroke-width="2" /> {{ m.hero.download }}
        </a>
        <a
          href="#features"
          class="inline-flex h-12 items-center gap-2.5 rounded-xl border border-line px-5 text-lg transition-colors hover:bg-surface-2"
        >
          {{ m.hero.explore }} <ArrowDown :size="17" :stroke-width="1.75" />
        </a>
      </div>

      <ul class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-muted">
        <li class="flex items-center gap-2"><MonitorSmartphone :size="16" :stroke-width="1.75" /> {{ m.hero.platforms }}</li>
        <li class="flex items-center gap-2"><WifiOff :size="16" :stroke-width="1.75" /> {{ m.hero.offline }}</li>
        <li class="flex items-center gap-2"><Languages :size="16" :stroke-width="1.75" /> {{ m.hero.languages }}</li>
      </ul>
    </div>

    <figure class="hero-shot mt-14">
      <div class="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-36px_rgb(0_0_0/0.5)]">
        <img
          :src="shots.focus"
          width="1600"
          height="1000"
          :alt="m.hero.alt"
          class="block h-auto w-full"
          fetchpriority="high"
        />
      </div>
      <figcaption class="mt-3 text-sm text-faint">{{ m.hero.caption }}</figcaption>
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
