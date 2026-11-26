<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TriangleAlert } from '@lucide/vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useSettingsStore } from '@/stores/settings'
import { useTimerStore } from '@/stores/timer'
import { useSubjectStore } from '@/stores/subjects'
import { useUpdateStore } from '@/stores/updates'
import { useTheme } from '@/composables/useTheme'
import { useAppShortcuts } from '@/composables/useShortcuts'
import { useCompletionSounds } from '@/composables/useTimerEvents'
import { useDocumentLanguage, useI18n } from '@/i18n'

// Each window loads the same bundle; the mini timer is identified by its route at load time.
const isMini = window.location.hash.startsWith('#/mini')

const settingsStore = useSettingsStore()
const timerStore = useTimerStore()
const subjectStore = useSubjectStore()
const updateStore = useUpdateStore()
const route = useRoute()

useTheme(() => settingsStore.settings.theme)
useDocumentLanguage()
useAppShortcuts({ navigation: !isMini })
if (!isMini) useCompletionSounds()

onMounted(() => {
  void settingsStore.load()
  void timerStore.load()
  if (!isMini) {
    void subjectStore.load()
    void updateStore.load()
  }
})

const { t } = useI18n()
watch(
  () => (route.meta.titleKey ? t(route.meta.titleKey) : null),
  (title) => {
    document.title = title ? `${title} — ${t('brand.name')}` : t('brand.name')
  },
  { immediate: true }
)
</script>

<template>
  <RouterView v-if="isMini" />
  <template v-else>
    <div
      v-if="settingsStore.error"
      role="alert"
      class="flex items-center gap-2 border-b border-line bg-surface px-5 py-2 text-sm text-danger"
    >
      <TriangleAlert :size="16" aria-hidden="true" />
      {{ t('app.settingsError') }} {{ settingsStore.error }}
    </div>
    <AppLayout />
  </template>
</template>
