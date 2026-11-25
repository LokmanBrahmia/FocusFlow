/**
 * Product identity. User-facing names come from here; technical identifiers
 * (package id, database file, IPC channels, env vars) deliberately keep their
 * original "focusflow" names so existing installs and data keep working.
 */
export const BRAND = {
  /** Latin name, used wherever Latin script is required. */
  name: 'Azm',
  /** Arabic name, with the fatha on the ʿayn. */
  nameAr: 'عَزم',
  tagline: 'Steady focus. Meaningful progress.',
  taglineAr: '«بِعزمٍ، خطوةً بعد خطوة»',
  /** Name of earlier versions; used only to find and keep existing user data. */
  legacyName: 'FocusFlow'
} as const
