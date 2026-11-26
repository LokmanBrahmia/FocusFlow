import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from '@shared/settings'
import { desktop } from '@/services/desktop'
import { translate } from '@shared/i18n'

/** Language used last time (written by useDocumentLanguage), so the first paint already has the right direction. */
function cachedLanguage(): AppSettings['language'] | null {
  try {
    const v = localStorage.getItem('azm-language')
    return v === 'ar' || v === 'en' ? v : null
  } catch {
    return null
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS, language: cachedLanguage() ?? DEFAULT_SETTINGS.language })
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  async function load(): Promise<void> {
    try {
      settings.value = await desktop().settings.getAll()
      error.value = null
      unsubscribe ??= desktop().settings.onChange((next) => {
        settings.value = next
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : translate(settings.value.language, 'app.settingsLoadError')
    } finally {
      loaded.value = true
    }
  }

  async function update<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<void> {
    const previous = settings.value[key]
    settings.value = { ...settings.value, [key]: value }
    try {
      settings.value = await desktop().settings.update(key, value)
    } catch (err) {
      settings.value = { ...settings.value, [key]: previous }
      throw err
    }
  }

  return { settings, loaded, error, load, update }
})
