/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

import 'vue-router'
import type { MessageKey } from '@shared/i18n'
declare module 'vue-router' {
  interface RouteMeta {
    /** Translation key for the window title. */
    titleKey?: MessageKey
  }
}
