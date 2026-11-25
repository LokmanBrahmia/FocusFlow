import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey } from '@shared/settings'
import { desktop } from '@/services/desktop'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
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
      error.value = err instanceof Error ? err.message : 'Settings could not be loaded.'
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
