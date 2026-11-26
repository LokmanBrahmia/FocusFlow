<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArchiveRestore,
  DatabaseBackup,
  Download,
  FolderOpen,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  Upload,
  Volume2
} from '@lucide/vue'
import type { AppCapabilities, AppInfo } from '@shared/ipc'
import type { ReplacePreview } from '@shared/data'
import type { AppSettings, SettingKey, ThemePreference, WindowBehavior } from '@shared/settings'
import PageHeader from '@/components/PageHeader.vue'
import AppPanel from '@/components/AppPanel.vue'
import SettingRow from '@/components/SettingRow.vue'
import ShortcutKeys from '@/components/ShortcutKeys.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import MinutesField from '@/components/MinutesField.vue'
import ReplaceDataDialog from '@/components/ReplaceDataDialog.vue'
import BrandMark from '@/components/BrandMark.vue'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toasts'
import { useUpdateStore } from '@/stores/updates'
import { desktop } from '@/services/desktop'
import { SOUND_OPTIONS, playSound } from '@/services/sounds'
import { LANGUAGES, useI18n, type MessageKey } from '@/i18n'
import { BRAND } from '@shared/brand'

const settingsStore = useSettingsStore()
const toasts = useToastStore()
const updates = useUpdateStore()
const { t, f } = useI18n()
const info = ref<AppInfo | null>(null)
const caps = ref<AppCapabilities | null>(null)
const infoError = ref<string | null>(null)
const saveError = ref<string | null>(null)

/** Two-way binding for one setting that saves through the main process. */
function setting<K extends SettingKey>(key: K) {
  return computed<AppSettings[K]>({
    get: () => settingsStore.settings[key],
    set: (value) => {
      saveError.value = null
      settingsStore.update(key, value).catch((err: unknown) => {
        saveError.value = err instanceof Error ? err.message : t('settings.saveError')
      })
    }
  })
}

const theme = setting('theme')
const language = setting('language')
const windowBehavior = setting('windowBehavior')
const launchOnStartup = setting('launchOnStartup')
const closeToTray = setting('closeToTray')
const focusMinutes = setting('focusDurationMinutes')
const shortBreak = setting('shortBreakMinutes')
const longBreak = setting('longBreakMinutes')
const interval = setting('longBreakInterval')
const autoBreaks = setting('autoStartBreaks')
const autoFocus = setting('autoStartFocus')
const dailyGoal = setting('dailyGoalMinutes')
const defaultTask = setting('defaultTaskMinutes')
const streakMinimum = setting('streakMinimumMinutes')
const soundEnabled = setting('soundEnabled')
const focusSound = setting('focusCompleteSound')
const breakSound = setting('breakCompleteSound')
const notifyFocus = setting('notifyFocusComplete')
const notifyBreak = setting('notifyBreakComplete')
const notifyGoal = setting('notifyDailyGoal')
const checkForUpdates = setting('checkForUpdates')

// ── section index ───────────────────────────────────────────────────────────
const SECTIONS: { id: string; label: MessageKey }[] = [
  { id: 'language', label: 'settings.section.language' },
  { id: 'general', label: 'settings.general' },
  { id: 'timer', label: 'settings.pomodoro' },
  { id: 'goals', label: 'settings.productivity' },
  { id: 'alerts', label: 'settings.section.alerts' },
  { id: 'data', label: 'settings.data' },
  { id: 'updates', label: 'settings.updates' },
  { id: 'shortcuts', label: 'settings.shortcuts' },
  { id: 'about', label: 'settings.about' }
]
function jump(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── updates ─────────────────────────────────────────────────────────────────
const updateLine = computed(() => {
  const st = updates.state
  if (!st) return ''
  if (!st.enabled) return t('update.unavailable')
  const s = st.status
  switch (s.kind) {
    case 'idle':
      return t('update.notChecked')
    case 'checking':
      return t('update.checking')
    case 'up-to-date':
      return t('update.upToDate', { time: f.value.time(new Date(s.checkedAt)) })
    case 'available':
      return t('update.versionAvailable', { version: s.update.version })
    case 'downloading':
      return t('update.downloadingVersion', { version: s.update.version, percent: s.percent })
    case 'downloaded':
      return t('update.downloaded', { version: s.update.version })
    case 'error':
      return s.message
  }
  return ''
})

/** How updates arrive on this particular install. */
const updateHow = computed(() => {
  switch (updates.state?.format) {
    case 'nsis':
      return t('update.how.nsis')
    case 'rpm':
      return t('update.how.rpm')
    case 'deb':
      return t('update.how.deb')
    case 'appimage':
      return t('update.how.appimage')
    case 'dev':
      return t('update.how.dev')
    default:
      return t('update.how.other')
  }
})

const themes = computed<{ value: ThemePreference; label: string; icon: typeof Sun }[]>(() => [
  { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
  { value: 'light', label: t('settings.theme.light'), icon: Sun },
  { value: 'system', label: t('settings.theme.system'), icon: Monitor }
])

const windowOptions = computed<{ value: WindowBehavior; label: string }[]>(() => [
  { value: 'remember', label: t('settings.window.remember') },
  { value: 'maximized', label: t('settings.window.maximized') },
  { value: 'default', label: t('settings.window.default') }
])

const shortcuts: { keys: string[]; action: MessageKey }[] = [
  { keys: ['Space'], action: 'shortcut.toggle' },
  { keys: ['Mod', 'Shift', 'F'], action: 'shortcut.focus' },
  { keys: ['Mod', 'N'], action: 'shortcut.newTask' },
  { keys: ['Esc'], action: 'shortcut.close' },
  { keys: ['Mod', '1'], action: 'shortcut.dashboard' },
  { keys: ['Mod', '2'], action: 'shortcut.focusPage' },
  { keys: ['Mod', '3'], action: 'shortcut.tasks' },
  { keys: ['Mod', '4'], action: 'shortcut.statistics' }
]

const sounds = [
  { label: 'settings.sound.afterFocus' as MessageKey, model: focusSound },
  { label: 'settings.sound.afterBreak' as MessageKey, model: breakSound }
]

// ── data ────────────────────────────────────────────────────────────────────
const busy = ref<string | null>(null)
const preview = ref<ReplacePreview | null>(null)
const dialog = ref<InstanceType<typeof ReplaceDataDialog> | null>(null)

async function run(name: string, action: () => Promise<void>): Promise<void> {
  busy.value = name
  try {
    await action()
  } catch (err) {
    toasts.error(err, t('toast.genericError'))
  } finally {
    busy.value = null
  }
}

const exportJson = () =>
  run('export', async () => {
    const r = await desktop().data.exportJson()
    if (r.saved) toasts.show(t('toast.exported', { path: r.path ?? '' }))
  })

const backup = () =>
  run('backup', async () => {
    const r = await desktop().data.backup()
    if (r.saved) toasts.show(t('toast.backedUp', { path: r.path ?? '' }))
  })

const prepare = (kind: 'import' | 'restore') =>
  run(kind, async () => {
    const p = kind === 'import' ? await desktop().data.prepareImport() : await desktop().data.prepareRestore()
    if (p) preview.value = p
  })

async function confirmReplace(): Promise<void> {
  const p = preview.value
  if (!p) return
  try {
    const r = await desktop().data.confirmReplace(p.token)
    preview.value = null
    toasts.show(
      t(p.kind === 'restore' ? 'toast.restored' : 'toast.imported', {
        tasks: r.counts.tasks,
        sessions: r.counts.sessions,
        path: r.safetyBackup
      })
    )
  } catch (err) {
    toasts.error(err, t('toast.replaceFailed'))
    preview.value = null
  } finally {
    dialog.value?.done()
  }
}

function cancelReplace(): void {
  const p = preview.value
  preview.value = null
  if (p) void desktop().data.cancelReplace(p.token)
}

onMounted(async () => {
  try {
    ;[info.value, caps.value] = await Promise.all([desktop().app.getInfo(), desktop().app.getCapabilities()])
  } catch (err) {
    infoError.value = err instanceof Error ? err.message : t('settings.about.unavailable')
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('nav.settings')" :subtitle="t('settings.subtitle')" />

    <p v-if="saveError" role="alert" class="text-danger">{{ saveError }}</p>

    <div class="grid items-start gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <!-- Section index -->
      <nav :aria-label="t('settings.sections')" class="sticky top-0 flex flex-col gap-0.5 max-lg:hidden">
        <button
          v-for="s in SECTIONS"
          :key="s.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-start text-muted transition-colors hover:bg-surface-2 hover:text-text"
          @click="jump(s.id)"
        >
          {{ t(s.label) }}
        </button>
      </nav>

      <div class="flex max-w-3xl flex-col gap-5">
        <!-- Language and appearance -->
        <AppPanel id="language" class="scroll-mt-6" :title="t('settings.section.language')">
          <SettingRow :label="t('settings.language')" :description="t('settings.language.hint')">
            <div role="radiogroup" :aria-label="t('settings.language')" class="seg">
              <button
                v-for="l in LANGUAGES"
                :key="l.code"
                type="button"
                role="radio"
                :lang="l.code"
                :aria-checked="language === l.code"
                @click="language = l.code"
              >
                {{ l.name }}
              </button>
            </div>
          </SettingRow>
          <SettingRow :label="t('settings.appearance')" :description="t('settings.appearance.hint')">
            <div role="radiogroup" :aria-label="t('settings.appearance')" class="seg">
              <button
                v-for="o in themes"
                :key="o.value"
                type="button"
                role="radio"
                :aria-checked="theme === o.value"
                @click="theme = o.value"
              >
                <component :is="o.icon" :size="14" :stroke-width="1.75" aria-hidden="true" />
                {{ o.label }}
              </button>
            </div>
          </SettingRow>
        </AppPanel>

        <!-- General -->
        <AppPanel id="general" class="scroll-mt-6" :title="t('settings.general')">
          <SettingRow :label="t('settings.window')" for-id="window-behavior">
            <select id="window-behavior" v-model="windowBehavior" class="field w-auto">
              <option v-for="o in windowOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </SettingRow>
          <ToggleSwitch
            v-model="launchOnStartup"
            class="border-b border-line/70"
            :label="t('settings.startup')"
            :disabled="!caps?.launchOnStartup.supported"
            :description="caps && !caps.launchOnStartup.supported ? caps.launchOnStartup.reason : undefined"
          />
          <ToggleSwitch v-model="closeToTray" :label="t('settings.tray')" :description="t('settings.tray.hint')" />
        </AppPanel>

        <!-- Timer -->
        <AppPanel id="timer" class="scroll-mt-6" :title="t('settings.pomodoro')">
          <p class="text-sm text-muted">{{ t('settings.pomodoro.hint') }}</p>
          <div class="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <MinutesField v-model="focusMinutes" :label="t('session.focus')" :min="1" :max="180" />
            <MinutesField v-model="shortBreak" :label="t('session.short_break')" :min="1" :max="60" />
            <MinutesField v-model="longBreak" :label="t('session.long_break')" :min="1" :max="120" />
            <MinutesField v-model="interval" :label="t('settings.longAfter')" :unit="t('unit.sessions')" :min="1" :max="12" />
          </div>
          <ToggleSwitch v-model="autoBreaks" class="border-t border-line/70" :label="t('settings.autoBreaks')" />
          <ToggleSwitch v-model="autoFocus" class="border-t border-line/70" :label="t('settings.autoFocus')" />
        </AppPanel>

        <!-- Goals -->
        <AppPanel id="goals" class="scroll-mt-6" :title="t('settings.productivity')">
          <p class="text-sm text-muted">{{ t('settings.productivity.hint') }}</p>
          <div class="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3">
            <MinutesField v-model="dailyGoal" :label="t('settings.goal')" :min="5" :max="1440" />
            <MinutesField v-model="defaultTask" :label="t('settings.defaultTask')" :min="5" :max="1440" />
            <MinutesField v-model="streakMinimum" :label="t('settings.streak')" :min="1" :max="1440" />
          </div>
          <p class="mt-2 text-xs text-faint">{{ t('settings.streak.hint') }}</p>
        </AppPanel>

        <!-- Sounds and notifications -->
        <AppPanel id="alerts" class="scroll-mt-6" :title="t('settings.section.alerts')">
          <ToggleSwitch v-model="soundEnabled" class="border-b border-line/70" :label="t('settings.sound.play')" :description="t('settings.sounds.hint')" />
          <SettingRow v-for="row in sounds" :key="row.label" :label="t(row.label)" :class="!soundEnabled && 'opacity-50'">
            <select v-model="row.model.value" :disabled="!soundEnabled" :aria-label="t(row.label)" class="field w-auto">
              <option v-for="o in SOUND_OPTIONS" :key="o.value" :value="o.value">{{ t(o.label) }}</option>
            </select>
            <button
              type="button"
              :disabled="!soundEnabled"
              :aria-label="t('settings.sound.preview', { sound: t(row.label) })"
              :title="t('settings.sound.previewShort')"
              class="icon-btn"
              @click="playSound(row.model.value)"
            >
              <Volume2 :size="16" :stroke-width="1.75" />
            </button>
          </SettingRow>
          <p class="eyebrow pt-5 pb-1">{{ t('settings.notifications') }}</p>
          <p class="text-sm text-muted">{{ t('settings.notifications.hint') }}</p>
          <ToggleSwitch v-model="notifyFocus" class="border-b border-line/70" :label="t('settings.notify.focus')" />
          <ToggleSwitch v-model="notifyBreak" class="border-b border-line/70" :label="t('settings.notify.break')" />
          <ToggleSwitch v-model="notifyGoal" :label="t('settings.notify.goal')" />
        </AppPanel>

        <!-- Data -->
        <AppPanel id="data" class="scroll-mt-6" :title="t('settings.data')">
          <p class="text-sm text-muted">{{ t('settings.data.hint') }}</p>
          <SettingRow :label="t('settings.data.backupTitle')" :description="t('settings.data.backupHint')">
            <button type="button" class="btn btn-quiet" :disabled="!!busy" @click="backup">
              <DatabaseBackup :size="16" :stroke-width="1.75" /> {{ t('settings.data.backup') }}
            </button>
            <button type="button" class="btn btn-quiet" :disabled="!!busy" @click="prepare('restore')">
              <ArchiveRestore :size="16" :stroke-width="1.75" /> {{ t('settings.data.restore') }}
            </button>
          </SettingRow>
          <SettingRow :label="t('settings.data.jsonTitle')" :description="t('settings.data.jsonHint')">
            <button type="button" class="btn btn-quiet" :disabled="!!busy" @click="exportJson">
              <Download :size="16" :stroke-width="1.75" /> {{ t('settings.data.export') }}
            </button>
            <button type="button" class="btn btn-quiet" :disabled="!!busy" @click="prepare('import')">
              <Upload :size="16" :stroke-width="1.75" /> {{ t('settings.data.import') }}
            </button>
          </SettingRow>
        </AppPanel>

        <!-- Updates -->
        <AppPanel id="updates" class="scroll-mt-6" :title="t('settings.updates')">
          <SettingRow :label="`${t('brand.name')} ${updates.state?.currentVersion ?? ''}`">
            <template #default>
              <button
                type="button"
                class="btn btn-quiet"
                :disabled="!updates.state?.enabled || updates.state?.status.kind === 'checking' || updates.state?.status.kind === 'downloading'"
                @click="updates.check()"
              >
                <RefreshCw :size="15" :stroke-width="1.75" :class="updates.state?.status.kind === 'checking' && 'animate-spin'" />
                {{ t('settings.updates.check') }}
              </button>
            </template>
          </SettingRow>
          <p class="-mt-2 pb-2 text-sm" :class="updates.state?.status.kind === 'error' ? 'text-danger' : 'text-muted'" aria-live="polite">
            {{ updateLine }}
          </p>
          <ToggleSwitch v-model="checkForUpdates" class="border-t border-line/70" :label="t('settings.updates.auto')" :description="t('settings.updates.auto.hint')" />
          <p class="mt-2 text-xs text-faint">{{ updateHow }}</p>
        </AppPanel>

        <!-- Shortcuts -->
        <AppPanel id="shortcuts" class="scroll-mt-6" :title="t('settings.shortcuts')">
          <p class="text-sm text-muted">{{ t('settings.shortcuts.hint') }}</p>
          <dl class="mt-3 grid grid-cols-[1fr_auto] gap-x-6">
            <template v-for="s in shortcuts" :key="s.action">
              <dt class="border-b border-line/60 py-2">{{ t(s.action) }}</dt>
              <dd class="border-b border-line/60 py-2" dir="ltr"><ShortcutKeys :keys="s.keys" /></dd>
            </template>
          </dl>
        </AppPanel>

        <!-- About -->
        <AppPanel id="about" class="scroll-mt-6" :title="t('settings.about')">
          <p v-if="infoError" role="alert" class="text-danger">{{ infoError }}</p>
          <div v-else-if="info">
            <div class="mb-5 flex items-start gap-4 rounded-xl bg-surface-2/50 p-4">
              <BrandMark :size="40" />
              <div>
                <p class="flex items-baseline gap-2">
                  <span lang="ar" dir="rtl" class="text-xl font-medium">{{ BRAND.nameAr }}</span>
                  <span lang="en" dir="ltr" class="text-lg tracking-tight text-muted">{{ BRAND.name }}</span>
                </p>
                <p lang="ar" dir="rtl" class="w-fit text-muted">{{ BRAND.taglineAr }}</p>
                <p lang="en" dir="ltr" class="w-fit text-sm text-faint">{{ BRAND.tagline }}</p>
              </div>
            </div>
            <dl class="grid grid-cols-[9rem_1fr] gap-y-2.5 text-sm">
              <dt class="text-muted">{{ t('settings.about.version') }}</dt>
              <dd dir="ltr" class="text-start">{{ info.version }}</dd>
              <dt class="text-muted">{{ t('settings.about.database') }}</dt>
              <dd dir="ltr" class="selectable text-start break-all">{{ info.databasePath }}</dd>
              <dt class="text-muted">{{ t('settings.about.schema') }}</dt>
              <dd>{{ info.schemaVersion }}</dd>
              <dt class="text-muted">{{ t('settings.about.engine') }}</dt>
              <dd dir="ltr" class="text-start">Electron {{ info.electronVersion }}, SQLite {{ info.sqliteVersion }}</dd>
            </dl>
            <button type="button" class="btn btn-quiet mt-4" @click="desktop().app.openLogFolder()">
              <FolderOpen :size="16" :stroke-width="1.75" /> {{ t('settings.about.logs') }}
            </button>
          </div>
          <p v-else class="text-muted">{{ t('common.loading') }}</p>
        </AppPanel>
      </div>
    </div>

    <ReplaceDataDialog ref="dialog" :preview="preview" @confirm="confirmReplace" @cancel="cancelReplace" />
  </div>
</template>
