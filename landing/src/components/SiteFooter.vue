<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'
import BrandMark from './BrandMark.vue'
import { REPOSITORY_URL } from '../site'
import { lang, m } from '../i18n'
</script>

<template>
  <footer class="border-t border-line">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-5 py-10 text-sm text-muted sm:px-8">
      <span class="flex items-center gap-2 text-text">
        <BrandMark :size="20" />
        <template v-if="lang === 'ar'">
          <span class="text-lg font-medium">عَزم</span>
          <span lang="en" dir="ltr" class="text-muted">Azm</span>
        </template>
        <template v-else>
          <span class="text-lg font-medium tracking-tight">Azm</span>
          <span lang="ar" dir="rtl" class="text-muted">عَزم</span>
        </template>
      </span>
      <a v-if="REPOSITORY_URL" :href="REPOSITORY_URL" class="inline-flex items-center gap-1.5 hover:text-text">
        {{ m.footer.source }} <ExternalLink :size="13" />
      </a>
      <span>{{ m.footer.license }}</span>
      <a href="#top" class="ms-auto hover:text-text">{{ m.footer.top }}</a>
    </div>
  </footer>
</template>
