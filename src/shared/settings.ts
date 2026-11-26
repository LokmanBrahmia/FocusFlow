/**
 * Settings schema shared by the main process (validation, persistence)
 * and the renderer (typing). Every key has a default and a validator, so a
 * corrupted or unknown value in the database falls back safely.
 */

export type ThemePreference = 'dark' | 'light' | 'system'
/** Arabic is the primary language (default for new installs); English is the secondary one. */
export type LanguageCode = 'ar' | 'en'
/** How the main window opens: last size and position, maximised, or the default 1280 × 800. */
export type WindowBehavior = 'remember' | 'maximized' | 'default'

export interface AppSettings {
  theme: ThemePreference
  language: LanguageCode
  launchOnStartup: boolean
  closeToTray: boolean
  windowBehavior: WindowBehavior
  /** Look for new versions on GitHub Releases (the app's only network request). */
  checkForUpdates: boolean

  focusDurationMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  focusCompleteSound: SoundName
  breakCompleteSound: SoundName

  notifyFocusComplete: boolean
  notifyBreakComplete: boolean
  notifyDailyGoal: boolean

  dailyGoalMinutes: number
  defaultTaskMinutes: number
  streakMinimumMinutes: number
}

export type SettingKey = keyof AppSettings

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  theme: 'dark',
  language: 'ar',
  launchOnStartup: false,
  closeToTray: false,
  windowBehavior: 'remember',
  checkForUpdates: true,

  focusDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  focusCompleteSound: 'chime',
  breakCompleteSound: 'bell',

  notifyFocusComplete: true,
  notifyBreakComplete: true,
  notifyDailyGoal: true,

  dailyGoalMinutes: 120,
  defaultTaskMinutes: 50,
  streakMinimumMinutes: 25
})

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const intIn =
  (min: number, max: number) =>
  (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const oneOf =
  <T extends string>(...values: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as string[]).includes(v)
export const SOUND_NAMES = ['chime', 'bell', 'soft'] as const
export type SoundName = (typeof SOUND_NAMES)[number]

export const SETTING_VALIDATORS: { [K in SettingKey]: (v: unknown) => v is AppSettings[K] } = {
  theme: oneOf('dark', 'light', 'system'),
  language: oneOf('ar', 'en'),
  launchOnStartup: isBool,
  closeToTray: isBool,
  windowBehavior: oneOf('remember', 'maximized', 'default'),
  checkForUpdates: isBool,

  focusDurationMinutes: intIn(1, 180),
  shortBreakMinutes: intIn(1, 60),
  longBreakMinutes: intIn(1, 120),
  longBreakInterval: intIn(1, 12),
  autoStartBreaks: isBool,
  autoStartFocus: isBool,
  soundEnabled: isBool,
  focusCompleteSound: oneOf(...SOUND_NAMES),
  breakCompleteSound: oneOf(...SOUND_NAMES),

  notifyFocusComplete: isBool,
  notifyBreakComplete: isBool,
  notifyDailyGoal: isBool,

  dailyGoalMinutes: intIn(5, 1440),
  defaultTaskMinutes: intIn(5, 1440),
  streakMinimumMinutes: intIn(1, 1440)
}

export function isSettingKey(key: unknown): key is SettingKey {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)
}
