<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'
import BrandMark from './BrandMark.vue'
import { LICENSE_NOTE, REPOSITORY_URL } from '../site'
</script>

<template>
  <footer class="border-t border-line">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-5 py-10 text-sm text-muted sm:px-8">
      <span class="flex items-center gap-2 text-text">
        <BrandMark :size="20" />
        <span class="display text-lg">FocusFlow</span>
      </span>
      <a v-if="REPOSITORY_URL" :href="REPOSITORY_URL" class="inline-flex items-center gap-1.5 hover:text-text">
        Source code on GitHub <ExternalLink :size="13" />
      </a>
      <span>{{ LICENSE_NOTE }}</span>
      <a href="#top" class="ml-auto hover:text-text">Back to top</a>
    </div>
  </footer>
</template>
