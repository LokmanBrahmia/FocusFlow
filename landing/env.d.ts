/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** "owner/repo", injected at build time from ../package.json or VITE_GITHUB_REPOSITORY. */
declare const __GITHUB_REPOSITORY__: string
