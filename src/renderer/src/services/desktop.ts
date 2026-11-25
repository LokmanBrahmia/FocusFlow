import type { DesktopAPI } from '../../../preload/api'

/**
 * Single access point to the preload bridge. Components and stores import
 * from here instead of touching `window.desktop` directly.
 */
export function desktop(): DesktopAPI {
  if (!window.desktop) {
    throw new Error('The desktop bridge is unavailable. Start FocusFlow through Electron.')
  }
  return window.desktop
}

export const isMac = (): boolean => window.desktop?.platform === 'darwin'
