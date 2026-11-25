import { defineConfig } from '@playwright/test'

/** End-to-end tests drive the built Electron app (run `npm run test:e2e`). */
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' }
})
