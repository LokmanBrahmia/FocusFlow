<script setup lang="ts">
import { ref } from 'vue'
import { Download, Moon, Sun } from '@lucide/vue'
import BrandMark from './BrandMark.vue'

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' }
]

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
  <header class="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
      <a href="#top" class="flex items-center gap-2.5" aria-label="FocusFlow home">
        <BrandMark />
        <span class="display text-xl">FocusFlow</span>
      </a>

      <nav aria-label="Sections" class="ml-auto hidden items-center gap-1 md:flex">
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="rounded-lg px-3 py-1.5 text-muted transition-colors hover:text-text"
        >{{ l.label }}</a>
      </nav>

      <div class="ml-auto flex items-center gap-2 md:ml-2">
        <button
          type="button"
          :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="dark ? 'Light theme' : 'Dark theme'"
          class="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text"
          @click="toggleTheme"
        >
          <Sun v-if="dark" :size="17" :stroke-width="1.75" />
          <Moon v-else :size="17" :stroke-width="1.75" />
        </button>
        <a
          href="#download"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-iris px-3.5 font-medium text-white transition-[filter] hover:brightness-110"
        >
          <Download :size="16" :stroke-width="2" /> Download
        </a>
      </div>
    </div>
  </header>
</template>
