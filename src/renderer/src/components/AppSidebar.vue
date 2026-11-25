<script setup lang="ts">
import { NAV_ITEMS } from '@/router'
import { useI18n } from '@/i18n'
import { isMac } from '@/services/desktop'
import BrandMark from './BrandMark.vue'
import ShortcutKeys from './ShortcutKeys.vue'
import SidebarTimerStatus from './SidebarTimerStatus.vue'

const { t } = useI18n()
</script>

<template>
  <aside
    class="flex w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-56"
    aria-label="Main navigation"
  >
    <div class="flex h-16 items-center gap-2.5 px-5 max-lg:justify-center max-lg:px-0">
      <BrandMark />
      <span class="page-title text-xl max-lg:hidden">FocusFlow</span>
    </div>

    <nav class="flex flex-1 flex-col gap-0.5 px-3 pt-2 max-lg:px-2.5">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.name"
        v-slot="{ href, navigate, isExactActive }"
        :to="item.path"
        custom
      >
        <a
          :href="href"
          :aria-current="isExactActive ? 'page' : undefined"
          :title="t(item.label)"
          :aria-keyshortcuts="item.shortcut ? `${isMac() ? 'Meta' : 'Control'}+${item.shortcut}` : undefined"
          class="group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-text max-lg:justify-center max-lg:px-0"
          :class="isExactActive && 'bg-surface-2 text-text'"
          @click="navigate"
        >
          <span
            v-if="isExactActive"
            class="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-iris"
            aria-hidden="true"
          />
          <component
            :is="item.icon"
            :size="18"
            :stroke-width="1.75"
            :class="isExactActive ? 'text-iris' : ''"
          />
          <span class="flex-1 max-lg:hidden">{{ t(item.label) }}</span>
          <ShortcutKeys
            v-if="item.shortcut"
            :keys="['Mod', item.shortcut]"
            aria-hidden="true"
            class="opacity-0 transition-opacity group-hover:opacity-100 max-lg:hidden"
            :class="isExactActive && 'opacity-100'"
          />
        </a>
      </RouterLink>
    </nav>

    <div class="border-t border-line p-3 max-lg:px-2.5">
      <SidebarTimerStatus />
    </div>
  </aside>
</template>
