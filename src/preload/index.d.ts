import type { DesktopAPI } from './api'

declare global {
  interface Window {
    desktop: DesktopAPI
  }
}

export {}
