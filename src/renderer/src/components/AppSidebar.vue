<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpCircle } from '@lucide/vue'
import { NAV_ITEMS, type NavItem } from '@/router'
import { useI18n, type MessageKey } from '@/i18n'
import { isMac } from '@/services/desktop'
import BrandMark from './BrandMark.vue'
import ShortcutKeys from './ShortcutKeys.vue'
import SidebarTimerStatus from './SidebarTimerStatus.vue'
import UpdateNotice from './UpdateNotice.vue'
import { useUpdateStore } from '@/stores/updates'

const { t, lang } = useI18n()
const updates = useUpdateStore()

/** Navigation grouped by intent: act today, plan ahead, look back. Settings sits apart. */
const groups = computed<{ label: MessageKey; items: NavItem[] }[]>(() => {
  const by = (...names: string[]) => NAV_ITEMS.filter((i) => names.includes(i.name))
  return [
    { label: 'nav.group.today', items: by('dashboard', 'focus') },
    { label: 'nav.group.plan', items: by('tasks', 'planner') },
    { label: 'nav.group.review', items: by('statistics') }
  ]
})
const settingsItem = NAV_ITEMS.find((i) => i.name === 'settings')!
</script>

<template>
  <aside
    class="flex w-16 shrink-0 flex-col border-e border-line bg-surface lg:w-60"
    :aria-label="t('nav.label')"
  >
    <!-- Brand: the active language's name leads, the other follows quietly. -->
    <div class="flex h-[4.25rem] items-center gap-3 px-5 max-lg:justify-center max-lg:px-0">
      <BrandMark :size="26" />
      <span class="flex items-baseline gap-2 max-lg:hidden">
        <template v-if="lang === 'ar'">
          <span class="text-xl font-medium">عَزم</span>
          <span lang="en" dir="ltr" class="text-sm text-faint">Azm</span>
        </template>
        <template v-else>
          <span class="text-lg font-medium tracking-tight">Azm</span>
          <span lang="ar" dir="rtl" class="text-base text-faint">عَزم</span>
        </template>
      </span>
    </div>

    <nav class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pt-3 max-lg:px-2.5">
      <div v-for="g in groups" :key="g.label" class="flex flex-col gap-0.5">
        <p class="eyebrow mb-1 px-2.5 max-lg:sr-only">{{ t(g.label) }}</p>
        <RouterLink
          v-for="item in g.items"
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
              class="absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent"
              aria-hidden="true"
            />
            <component :is="item.icon" :size="18" :stroke-width="1.75" :class="isExactActive && 'text-accent'" />
            <span class="flex-1 max-lg:hidden">{{ t(item.label) }}</span>
            <ShortcutKeys
              v-if="item.shortcut"
              :keys="['Mod', item.shortcut]"
              aria-hidden="true"
              class="opacity-0 transition-opacity group-hover:opacity-100 max-lg:hidden"
            />
          </a>
        </RouterLink>
      </div>
    </nav>

    <div class="flex flex-col gap-2 p-3 max-lg:px-2.5">
      <UpdateNotice />
      <!-- Narrow window: the notice collapses to a badge linking to Settings. -->
      <RouterLink
        v-if="updates.noticeVisible"
        to="/settings#updates"
        :title="t('update.available', { version: updates.update?.version ?? '' })"
        :aria-label="t('update.available', { version: updates.update?.version ?? '' })"
        class="hidden h-9 place-items-center rounded-lg text-accent hover:bg-surface-2 max-lg:grid"
      >
        <ArrowUpCircle :size="18" :stroke-width="1.75" />
      </RouterLink>

      <SidebarTimerStatus />

      <RouterLink
        v-slot="{ href, navigate, isExactActive }"
        :to="settingsItem.path"
        custom
      >
        <a
          :href="href"
          :aria-current="isExactActive ? 'page' : undefined"
          :title="t(settingsItem.label)"
          class="flex h-9 items-center gap-3 rounded-lg px-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-text max-lg:justify-center max-lg:px-0"
          :class="isExactActive && 'bg-surface-2 text-text'"
          @click="navigate"
        >
          <component :is="settingsItem.icon" :size="18" :stroke-width="1.75" :class="isExactActive && 'text-accent'" />
          <span class="max-lg:hidden">{{ t(settingsItem.label) }}</span>
        </a>
      </RouterLink>
    </div>
  </aside>
</template>
