<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Languages, Moon, Sun } from '@lucide/vue'
import BrandMark from './BrandMark.vue'
import { lang, m, setLang } from '../i18n'

const links = computed(() => [
  { href: '#features', label: m.value.nav.features },
  { href: '#how-it-works', label: m.value.nav.how },
  { href: '#privacy', label: m.value.nav.privacy },
  { href: '#faq', label: m.value.nav.faq }
])

const dark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme(): void {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
  try {
    localStorage.setItem('focusflow-theme', dark.value ? 'dark' : 'light')
  } catch {
    /* preference simply isn't remembered */
  }
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line/70 bg-bg">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
      <!-- The active language's name leads; the other follows quietly. -->
      <a href="#top" class="flex items-center gap-2.5" :aria-label="m.nav.home">
        <BrandMark />
        <template v-if="lang === 'ar'">
          <span class="text-xl font-medium">عَزم</span>
          <span lang="en" dir="ltr" class="text-sm text-muted">Azm</span>
        </template>
        <template v-else>
          <span class="text-xl font-medium tracking-tight">Azm</span>
          <span lang="ar" dir="rtl" class="text-lg text-muted">عَزم</span>
        </template>
      </a>

      <nav :aria-label="m.nav.sections" class="ms-auto hidden items-center gap-1 md:flex">
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-text"
        >{{ l.label }}</a>
      </nav>

      <div class="ms-auto flex items-center gap-1.5 md:ms-2">
        <button
          type="button"
          :lang="lang === 'ar' ? 'en' : 'ar'"
          :aria-label="m.nav.otherLanguageLabel"
          :title="m.nav.otherLanguageLabel"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          @click="setLang(lang === 'ar' ? 'en' : 'ar')"
        >
          <Languages :size="16" :stroke-width="1.75" aria-hidden="true" />
          {{ m.nav.otherLanguage }}
        </button>
        <button
          type="button"
          :aria-label="dark ? m.nav.toLight : m.nav.toDark"
          :title="dark ? m.nav.light : m.nav.dark"
          class="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          @click="toggleTheme"
        >
          <Sun v-if="dark" :size="17" :stroke-width="1.75" />
          <Moon v-else :size="17" :stroke-width="1.75" />
        </button>
        <a
          href="#download"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 font-medium text-on-accent transition-[filter] hover:brightness-110 max-sm:hidden"
        >
          <Download :size="16" :stroke-width="2" /> {{ m.nav.download }}
        </a>
      </div>
    </div>
  </header>
</template>
