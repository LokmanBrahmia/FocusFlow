import { onBeforeUnmount, ref, watchEffect } from 'vue'
import type { ThemePreference } from '@shared/settings'
import { subjectColorFor } from '@shared/tasks'

/** Whether the dark theme is currently applied; shared by charts and colour helpers. */
export const isDark = ref(document.documentElement.classList.contains('dark'))

/** Applies the theme preference to <html>, following the OS when set to "system". */
export function useTheme(preference: () => ThemePreference): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(media.matches)
  const onChange = (e: MediaQueryListEvent): void => {
    systemDark.value = e.matches
  }
  media.addEventListener('change', onChange)
  onBeforeUnmount(() => media.removeEventListener('change', onChange))

  watchEffect(() => {
    const pref = preference()
    const dark = pref === 'dark' || (pref === 'system' && systemDark.value)
    document.documentElement.classList.toggle('dark', dark)
    isDark.value = dark
  })
}

/** A subject's colour stepped for the current theme, with a neutral fallback. */
export function subjectColor(stored: string | null | undefined, fallback = 'var(--faint)'): string {
  return subjectColorFor(stored ?? null, isDark.value) ?? fallback
}
