import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@shared': resolve(import.meta.dirname, 'src/shared') }
  },
  define: { __GITHUB_REPOSITORY__: JSON.stringify('LokmanBrahmia/FocusFlow') },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
})
