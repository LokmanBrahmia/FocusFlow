<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArchiveRestore, DatabaseBackup, Download, FolderOpen, Monitor, Moon, Sun, Upload, Volume2 } from '@lucide/vue'
import type { AppCapabilities, AppInfo } from '@shared/ipc'
import type { ReplacePreview } from '@shared/data'
import type { AppSettings, SettingKey, ThemePreference, WindowBehavior } from '@shared/settings'
import PageHeader from '@/components/PageHeader.vue'
import ShortcutKeys from '@/components/ShortcutKeys.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import MinutesField from '@/components/MinutesField.vue'
import ReplaceDataDialog from '@/components/ReplaceDataDialog.vue'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toasts'
import { desktop } from '@/services/desktop'
import { SOUND_OPTIONS, playSound } from '@/services/sounds'
import { LANGUAGES, useI18n } from '@/i18n'
import { useUpdateStore } from '@/stores/updates'
import { RefreshCw } from '@lucide/vue'

const settingsStore = useSettingsStore()
const toasts = useToastStore()
const { t } = useI18n()
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
        saveError.value = err instanceof Error ? err.message : 'That setting could not be saved.'
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

// ── updates ─────────────────────────────────────────────────────────────────
const updates = useUpdateStore()

const updateLine = computed(() => {
  const st = updates.state
  if (!st) return ''
  if (!st.enabled) return 'Update checks are not available in this build.'
  const s = st.status
  switch (s.kind) {
    case 'idle':
      return 'Not checked yet.'
    case 'checking':
      return 'Checking…'
    case 'up-to-date':
      return `You have the latest version. Checked ${new Date(s.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
    case 'available':
      return `Version ${s.update.version} is available.`
    case 'downloading':
      return `Downloading version ${s.update.version}… ${s.percent}%`
    case 'downloaded':
      return `Version ${s.update.version} is downloaded and ready to install.`
    case 'error':
      return s.message
  }
  return ''
})

/** How updates arrive on this particular install. */
const updateHow = computed(() => {
  switch (updates.state?.format) {
    case 'nsis':
      return 'On Windows, FocusFlow downloads the new installer, checks it against the release’s checksum, and installs it when you choose “Install and restart” (or when you quit, if you prefer).'
    case 'rpm':
      return 'This copy was installed from an RPM package. FocusFlow tells you when a new version is out and links to it; install it with “sudo dnf install ./<file>.rpm”. FocusFlow never runs administrator commands itself.'
    case 'deb':
      return 'This copy was installed from a DEB package. FocusFlow tells you when a new version is out and links to it; install it with “sudo apt install ./<file>.deb”. FocusFlow never runs administrator commands itself.'
    case 'appimage':
      return 'AppImages are not part of FocusFlow releases. FocusFlow tells you when a new version is out; install the DEB or RPM from the release page.'
    case 'dev':
      return 'This is a development build. It can check for new versions, but updates are installed by building from source.'
    default:
      return 'FocusFlow tells you when a new version is out and links to the release page.'
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

const shortcuts: { keys: string[]; action: string }[] = [
  { keys: ['Space'], action: 'Start or pause the timer' },
  { keys: ['Mod', 'Shift', 'F'], action: 'Start a focus session' },
  { keys: ['Mod', 'N'], action: 'New task' },
  { keys: ['Esc'], action: 'Close a dialog or menu' },
  { keys: ['Mod', '1'], action: 'Open Dashboard' },
  { keys: ['Mod', '2'], action: 'Open Focus' },
  { keys: ['Mod', '3'], action: 'Open Tasks' },
  { keys: ['Mod', '4'], action: 'Open Statistics' }
]

const sounds = [
  { label: 'After focus', model: focusSound },
  { label: 'After a break', model: breakSound }
]

const selectClass = 'h-9 rounded-lg border border-line bg-surface px-2.5 outline-none focus:border-iris'

// ── data ────────────────────────────────────────────────────────────────────
const busy = ref<string | null>(null)
const preview = ref<ReplacePreview | null>(null)
const dialog = ref<InstanceType<typeof ReplaceDataDialog> | null>(null)

async function run(name: string, action: () => Promise<void>): Promise<void> {
  busy.value = name
  try {
    await action()
  } catch (err) {
    toasts.error(err, 'That did not work. Try again.')
  } finally {
    busy.value = null
  }
}

const exportJson = () =>
  run('export', async () => {
    const r = await desktop().data.exportJson()
    if (r.saved) toasts.show(`Exported to ${r.path}`)
  })

const backup = () =>
  run('backup', async () => {
    const r = await desktop().data.backup()
    if (r.saved) toasts.show(`Backup saved to ${r.path}`)
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
      `${p.kind === 'restore' ? 'Backup restored' : 'Data imported'}: ${r.counts.tasks} tasks, ${r.counts.sessions} sessions. Your previous data was saved to ${r.safetyBackup}`
    )
  } catch (err) {
    toasts.error(err, 'Your data could not be replaced. Nothing was changed.')
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
    infoError.value = err instanceof Error ? err.message : 'App details are unavailable.'
  }
})
</script>

<template>
  <div>
    <PageHeader :title="$route.meta.title" :subtitle="$route.meta.subtitle" />

    <p v-if="saveError" role="alert" class="mb-6 text-danger">{{ saveError }}</p>

    <div class="flex flex-col divide-y divide-line">
      <section class="settings-row pb-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.appearance') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.appearance.hint') }}</p>
        </div>
        <div role="radiogroup" aria-label="Theme" class="inline-flex self-start justify-self-start rounded-xl border border-line bg-surface p-1">
          <button
            v-for="o in themes"
            :key="o.value"
            type="button"
            role="radio"
            :aria-checked="theme === o.value"
            class="flex h-8 items-center gap-2 rounded-lg px-3 text-muted transition-colors hover:text-text"
            :class="theme === o.value && 'bg-surface-2 text-text'"
            @click="theme = o.value"
          >
            <component :is="o.icon" :size="15" :stroke-width="1.75" aria-hidden="true" />
            {{ o.label }}
          </button>
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.general') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.general.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-5">
          <label class="flex items-center justify-between gap-4">
            <span>
              <span class="block">{{ t('settings.language') }}</span>
              <span class="block text-sm text-muted">{{ t('settings.language.hint') }}</span>
            </span>
            <select v-model="language" :class="selectClass">
              <option v-for="l in LANGUAGES" :key="l.code" :value="l.code">{{ l.name }}</option>
            </select>
          </label>
          <label class="flex items-center justify-between gap-4">
            <span>{{ t('settings.window') }}</span>
            <select v-model="windowBehavior" :class="selectClass">
              <option v-for="o in windowOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
          <ToggleSwitch
            v-model="launchOnStartup"
            :label="t('settings.startup')"
            :disabled="!caps?.launchOnStartup.supported"
            :description="caps && !caps.launchOnStartup.supported ? caps.launchOnStartup.reason : undefined"
          />
          <ToggleSwitch v-model="closeToTray" :label="t('settings.tray')" :description="t('settings.tray.hint')" />
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.pomodoro') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.pomodoro.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-6">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MinutesField v-model="focusMinutes" label="Focus" :min="1" :max="180" />
            <MinutesField v-model="shortBreak" label="Short break" :min="1" :max="60" />
            <MinutesField v-model="longBreak" label="Long break" :min="1" :max="120" />
            <MinutesField v-model="interval" label="Long break after" unit="sessions" :min="1" :max="12" />
          </div>
          <div class="flex flex-col gap-3">
            <ToggleSwitch v-model="autoBreaks" label="Start breaks automatically" />
            <ToggleSwitch v-model="autoFocus" label="Start the next focus session automatically" />
          </div>
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.productivity') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.productivity.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-2">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MinutesField v-model="dailyGoal" :label="t('settings.goal')" :min="5" :max="1440" />
            <MinutesField v-model="defaultTask" :label="t('settings.defaultTask')" :min="5" :max="1440" />
            <MinutesField v-model="streakMinimum" :label="t('settings.streak')" :min="1" :max="1440" />
          </div>
          <p class="text-sm text-faint">{{ t('settings.streak.hint') }}</p>
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.sounds') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.sounds.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-4">
          <ToggleSwitch v-model="soundEnabled" label="Play a sound" />
          <div v-for="row in sounds" :key="row.label" class="flex items-center justify-between gap-4" :class="!soundEnabled && 'opacity-50'">
            <span>{{ row.label }}</span>
            <span class="flex items-center gap-1">
              <select
                v-model="row.model.value"
                :disabled="!soundEnabled"
                :aria-label="`Sound ${row.label.toLowerCase()}`"
                :class="selectClass"
              >
                <option v-for="o in SOUND_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
              <button
                type="button"
                :disabled="!soundEnabled"
                :aria-label="`Preview ${row.label.toLowerCase()} sound`"
                title="Preview"
                class="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
                @click="playSound(row.model.value)"
              >
                <Volume2 :size="16" :stroke-width="1.75" />
              </button>
            </span>
          </div>
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.notifications') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.notifications.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-3">
          <ToggleSwitch v-model="notifyFocus" label="Focus session finished" />
          <ToggleSwitch v-model="notifyBreak" label="Break finished" />
          <ToggleSwitch v-model="notifyGoal" label="Daily goal reached" />
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.data') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.data.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-5">
          <div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="data-btn" :disabled="!!busy" @click="backup">
                <DatabaseBackup :size="16" :stroke-width="1.75" /> {{ t('settings.data.backup') }}
              </button>
              <button type="button" class="data-btn" :disabled="!!busy" @click="prepare('restore')">
                <ArchiveRestore :size="16" :stroke-width="1.75" /> {{ t('settings.data.restore') }}
              </button>
            </div>
            <p class="mt-2 text-sm text-faint">A backup is a complete copy of the database, safe to take while the app is running.</p>
          </div>
          <div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="data-btn" :disabled="!!busy" @click="exportJson">
                <Download :size="16" :stroke-width="1.75" /> {{ t('settings.data.export') }}
              </button>
              <button type="button" class="data-btn" :disabled="!!busy" @click="prepare('import')">
                <Upload :size="16" :stroke-width="1.75" /> {{ t('settings.data.import') }}
              </button>
            </div>
            <p class="mt-2 text-sm text-faint">JSON includes tasks, subjects, focus sessions, study blocks and settings, readable by other tools.</p>
          </div>
        </div>
      </section>

      <section id="updates" class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.updates') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.updates.hint') }}</p>
        </div>
        <div class="flex max-w-lg flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p>
              <span class="block">FocusFlow {{ updates.state?.currentVersion ?? '' }}</span>
              <span class="block text-sm" :class="updates.state?.status.kind === 'error' ? 'text-danger' : 'text-muted'" aria-live="polite">{{ updateLine }}</span>
            </p>
            <button
              type="button"
              class="data-btn"
              :disabled="!updates.state?.enabled || updates.state?.status.kind === 'checking' || updates.state?.status.kind === 'downloading'"
              @click="updates.check()"
            >
              <RefreshCw :size="15" :stroke-width="1.75" :class="updates.state?.status.kind === 'checking' && 'animate-spin'" />
              {{ t('settings.updates.check') }}
            </button>
          </div>
          <ToggleSwitch v-model="checkForUpdates" :label="t('settings.updates.auto')" :description="t('settings.updates.auto.hint')" />
          <p class="text-sm text-faint">{{ updateHow }}</p>
        </div>
      </section>

      <section class="settings-row py-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.shortcuts') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.shortcuts.hint') }}</p>
        </div>
        <dl class="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2.5">
          <template v-for="s in shortcuts" :key="s.action">
            <dt>{{ s.action }}</dt>
            <dd><ShortcutKeys :keys="s.keys" /></dd>
          </template>
        </dl>
      </section>

      <section class="settings-row pt-8">
        <div>
          <h2 class="text-lg font-semibold">{{ t('settings.about') }}</h2>
          <p class="mt-1 text-muted">{{ t('settings.about.hint') }}</p>
        </div>
        <p v-if="infoError" role="alert" class="text-danger">{{ infoError }}</p>
        <div v-else-if="info">
          <dl class="grid grid-cols-[9rem_1fr] gap-y-2.5">
            <dt class="text-muted">Version</dt>
            <dd>{{ info.version }}</dd>
            <dt class="text-muted">Database</dt>
            <dd class="selectable break-all">{{ info.databasePath }}</dd>
            <dt class="text-muted">Schema version</dt>
            <dd>{{ info.schemaVersion }}</dd>
            <dt class="text-muted">Engine</dt>
            <dd>Electron {{ info.electronVersion }}, SQLite {{ info.sqliteVersion }}</dd>
          </dl>
          <button type="button" class="data-btn mt-4" @click="desktop().app.openLogFolder()">
            <FolderOpen :size="16" :stroke-width="1.75" /> {{ t('settings.about.logs') }}
          </button>
        </div>
        <p v-else class="text-muted">Loading…</p>
      </section>
    </div>

    <ReplaceDataDialog ref="dialog" :preview="preview" @confirm="confirmReplace" @cancel="cancelReplace" />
  </div>
</template>

<style scoped>
.settings-row {
  display: grid;
  gap: 1rem;
}
@media (min-width: 1024px) {
  .settings-row {
    grid-template-columns: 14rem 1fr;
  }
}
.data-btn {
  display: inline-flex;
  height: 2.25rem;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 0 0.875rem;
  transition: background-color 150ms;
}
.data-btn:hover:not(:disabled) {
  background: var(--surface-2);
}
.data-btn:disabled {
  opacity: 0.5;
}
</style>
