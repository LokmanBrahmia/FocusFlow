import { computed, watchEffect } from 'vue'
import type { LanguageCode } from '@shared/settings'
import { useSettingsStore } from '@/stores/settings'
import { en, type Messages } from './en'

/**
 * Minimal i18n layer. Each language is a typed catalogue with the same keys
 * as English, so a missing translation is a type error. Adding Arabic or
 * French means: add ar.ts / fr.ts, register it here, widen LanguageCode and
 * the settings validator. `dir` is already applied, so Arabic gets RTL.
 *
 * Migrated so far: navigation and the Settings page. Other views still use
 * inline English and move over one at a time.
 */
const catalogues: Record<LanguageCode, Messages> = { en }
const RTL: ReadonlySet<string> = new Set(['ar'])

export const LANGUAGES: { code: LanguageCode; name: string }[] = [{ code: 'en', name: 'English' }]

type Params = Record<string, string | number>

function interpolate(text: string, params?: Params): string {
  return params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`)) : text
}

export function useI18n() {
  const settings = useSettingsStore()
  const lang = computed<LanguageCode>(() => settings.settings.language)
  const messages = computed(() => catalogues[lang.value] ?? en)
  const t = (key: keyof Messages, params?: Params): string => interpolate(messages.value[key] ?? en[key], params)
  return { t, lang }
}

/** Keeps <html lang> and dir in step with the language setting. */
export function useDocumentLanguage(): void {
  const settings = useSettingsStore()
  watchEffect(() => {
    const lang = settings.settings.language
    document.documentElement.lang = lang
    document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr'
  })
}
