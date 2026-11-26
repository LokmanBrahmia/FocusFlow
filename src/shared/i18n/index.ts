import { ar } from './ar'
import { en, type MessageKey, type Messages, type PluralMessage } from './en'

/**
 * Azm's localization core, shared by the main process (notifications, tray,
 * dialogs) and the renderer. Arabic is the primary language; English is the
 * complete secondary one. Every catalogue has exactly the keys of `en`
 * (enforced by the Messages type), so a missing translation is a type error.
 */
export type Lang = 'ar' | 'en'
export const LANGS: readonly Lang[] = ['ar', 'en']
export type { MessageKey, Messages }

export const CATALOGUES: Record<Lang, Messages> = { ar, en }

/** Names shown in the language picker, each in its own language. */
export const LANGUAGE_NAMES: Record<Lang, string> = { ar: 'العربية', en: 'English' }

export const isRtl = (lang: Lang): boolean => lang === 'ar'

/**
 * Locale for Intl formatting. Arabic uses Western digits (0–9), as is usual
 * across the Maghreb and in technical interfaces, so times and durations
 * read the same in both languages.
 */
export function intlLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB'
}

export type Params = Record<string, string | number>

const pluralRules = new Map<Lang, Intl.PluralRules>()
function pluralCategory(lang: Lang, n: number): Intl.LDMLPluralRule {
  let rules = pluralRules.get(lang)
  if (!rules) pluralRules.set(lang, (rules = new Intl.PluralRules(intlLocale(lang))))
  return rules.select(n)
}

function interpolate(text: string, params?: Params): string {
  return params ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`)) : text
}

/**
 * Looks up a message. Plural messages pick their form from `params.count`
 * using the language's CLDR plural rules (Arabic has six forms).
 */
export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const entry: string | PluralMessage = CATALOGUES[lang]?.[key] ?? en[key]
  if (typeof entry === 'string') return interpolate(entry, params)
  const count = Number(params?.count ?? 0)
  const form = entry[pluralCategory(lang, count)] ?? entry.other
  return interpolate(form, params)
}

/** Compact duration: "1 h 30 min" / "1 س 30 د". */
export function formatDuration(lang: Lang, totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (lang === 'ar') {
    if (h === 0) return `${r} د`
    return r === 0 ? `${h} س` : `${h} س ${r} د`
  }
  if (h === 0) return `${r} min`
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

/** Axis ticks for minute charts: "30m", "1.5 h" / "30 د", "1.5 س". */
export function formatDurationTick(lang: Lang, v: number): string {
  if (v < 60) return lang === 'ar' ? `${v} د` : `${v}m`
  const h = v / 60
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1)
  return lang === 'ar' ? `${n} س` : `${n} h`
}

/** 24-hour clock time, the same in both languages (matches study block times). */
export function formatTime(lang: Lang, date: Date | number): string {
  return new Intl.DateTimeFormat(intlLocale(lang), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}

/** Validates a stored or incoming language value. */
export function isLang(v: unknown): v is Lang {
  return v === 'ar' || v === 'en'
}

// ── process-wide language (main process) ───────────────────────────────────
let languageSource: () => Lang = () => 'en'

/**
 * Points `tl` at the user's current language. The main process wires this to
 * its settings at start-up; anything else (tests, scripts) stays in English.
 */
export function setLanguageSource(source: () => Lang): void {
  languageSource = source
}

/** Translate in the process's current language (notifications, dialogs, errors from main). */
export function tl(key: MessageKey, params?: Params): string {
  return translate(languageSource(), key, params)
}
