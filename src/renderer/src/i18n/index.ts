import { computed, watchEffect } from 'vue'
import {
  LANGS,
  LANGUAGE_NAMES,
  formatDuration,
  formatDurationTick,
  formatTime,
  intlLocale,
  isRtl,
  translate,
  type Lang,
  type MessageKey,
  type Params
} from '@shared/i18n'
import { useSettingsStore } from '@/stores/settings'
import { parseDay } from '@/utils/dates'
import { differenceInCalendarDays } from 'date-fns'

export type { Lang, MessageKey }
export const LANGUAGES = LANGS.map((code) => ({ code, name: LANGUAGE_NAMES[code] }))

/** Last language used (read back by the settings store before settings load). */
const CACHE_KEY = 'azm-language'

const formatters = new Map<string, Intl.DateTimeFormat>()
function dateFormat(lang: Lang, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${lang}|${JSON.stringify(options)}`
  let f = formatters.get(key)
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(intlLocale(lang), options)))
  return f
}

const toDate = (d: Date | string | number): Date => (typeof d === 'string' ? parseDay(d) : new Date(d))

/** Formatting helpers bound to one language. Dates accept a Date, a timestamp or a YYYY-MM-DD day. */
export function formattersFor(lang: Lang) {
  const fmt = (options: Intl.DateTimeFormatOptions) => (d: Date | string | number) => dateFormat(lang, options).format(toDate(d))
  const thisYear = new Date().getFullYear()
  const dayMonth = fmt({ day: 'numeric', month: 'short' })
  const dayMonthYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' })
  return {
    /** "Thursday 26 November" / "الخميس، 26 نوفمبر" */
    dayLong: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
    /** "Thursday 26 November 2026" */
    dayLongYear: fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    /** "26 Nov", with the year when it is not this year. */
    dayMonth: (d: Date | string | number) => (toDate(d).getFullYear() === thisYear ? dayMonth(d) : dayMonthYear(d)),
    dayMonthYear,
    /** "26 November" */
    dayMonthLong: fmt({ day: 'numeric', month: 'long' }),
    /** "Thu" / "الخميس" */
    weekdayShort: fmt({ weekday: 'short' }),
    weekdayLong: fmt({ weekday: 'long' }),
    /** "November 2026" */
    monthYear: fmt({ month: 'long', year: 'numeric' }),
    dayNumber: fmt({ day: 'numeric' }),
    time: (d: Date | number) => formatTime(lang, d),
    duration: (minutes: number) => formatDuration(lang, minutes),
    durationTick: (minutes: number) => formatDurationTick(lang, minutes),
    number: (n: number) => new Intl.NumberFormat(intlLocale(lang)).format(n),
    percent: (fraction: number) =>
      new Intl.NumberFormat(intlLocale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(fraction),
    /** "today" / "tomorrow" / "yesterday" / "26 Nov", for a YYYY-MM-DD day. */
    relativeDay: (day: string) => {
      const diff = differenceInCalendarDays(parseDay(day), new Date())
      if (diff === 0) return translate(lang, 'date.today')
      if (diff === 1) return translate(lang, 'date.tomorrow')
      if (diff === -1) return translate(lang, 'date.yesterday')
      return toDate(day).getFullYear() === thisYear ? dayMonth(day) : dayMonthYear(day)
    }
  }
}

export type Formatters = ReturnType<typeof formattersFor>

export function useI18n() {
  const settings = useSettingsStore()
  const lang = computed<Lang>(() => settings.settings.language)
  const rtl = computed(() => isRtl(lang.value))
  const f = computed(() => formattersFor(lang.value))
  const t = (key: MessageKey, params?: Params): string => translate(lang.value, key, params)
  return { t, lang, rtl, f }
}

/** Keeps <html lang> and dir in step with the language setting. */
export function useDocumentLanguage(): void {
  const settings = useSettingsStore()
  watchEffect(() => {
    const lang = settings.settings.language
    document.documentElement.lang = lang
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(CACHE_KEY, lang)
    } catch {
      /* first paint simply uses the default */
    }
  })
}
