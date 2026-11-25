import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { DesktopAPI } from '../src/preload/api'

/**
 * Drives the built app (out/) in a throwaway profile, so it never touches
 * real data and can run while FocusFlow is open.
 */
let profile: string
let app: ElectronApplication
let page: Page

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

/** A sidebar navigation link (other links on a page may share words). */
const nav = (name: string) => page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name, exact: true })
const goalField = () => page.getByRole('spinbutton', { name: 'Daily focus goal' })

async function launch(extraEnv: Record<string, string> = {}): Promise<void> {
  app = await electron.launch({
    args: [resolve(__dirname, '..')],
    env: { ...process.env, FOCUSFLOW_USER_DATA: profile, ELECTRON_RENDERER_URL: '', ...extraEnv }
  })
  page = await app.firstWindow()
  await page.waitForSelector('nav[aria-label="Main navigation"], aside[aria-label="Main navigation"]')
}

test.beforeEach(async () => {
  profile = mkdtempSync(join(tmpdir(), 'focusflow-e2e-'))
  await launch()
})

test.afterEach(async () => {
  await app?.close()
  rmSync(profile, { recursive: true, force: true })
})

test('navigates with the sidebar and keyboard shortcuts', async () => {
  await nav('Tasks').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible()

  await page.keyboard.press(`${MOD}+4`)
  await expect(page.getByRole('heading', { level: 1, name: 'Statistics' })).toBeVisible()

  await page.keyboard.press(`${MOD}+2`)
  await expect(page.getByRole('timer')).toBeVisible()

  await nav('Planner').click()
  await expect(page.getByRole('radiogroup', { name: 'View' })).toBeVisible()
})

test('creates a task, then completes it', async () => {
  await nav('Tasks').click()
  await page.keyboard.press(`${MOD}+n`)
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Title').fill('Revise TCP handshake')
  await dialog.getByRole('button', { name: 'Add task' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Revise TCP handshake')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Complete Revise TCP handshake' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Task completed' })).toBeVisible()
  // The default filter shows open tasks, so it disappears from the list.
  await expect(page.getByText('Revise TCP handshake')).toBeHidden()
})

test('starts a focus session from a task and pauses it', async () => {
  await nav('Tasks').click()
  await page.getByRole('button', { name: 'Add a task' }).click()
  await page.getByRole('dialog', { name: 'New task' }).getByLabel('Title').fill('Read chapter 5')
  await page.getByRole('button', { name: 'Add task' }).click()

  const row = page.getByRole('listitem').filter({ hasText: 'Read chapter 5' })
  await row.hover()
  await row.getByRole('button', { name: 'Focus on Read chapter 5' }).click()

  await expect(page).toHaveURL(/#\/focus/)
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Read chapter 5/ })).toBeVisible()

  const before = await page.getByRole('timer').getAttribute('aria-label')
  await page.waitForTimeout(1500)
  expect(await page.getByRole('timer').getAttribute('aria-label')).not.toBe(before)

  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByText('Paused', { exact: true })).toBeVisible()
})

test('settings persist across a restart', async () => {
  await nav('Settings').click()
  await page.getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  const goal = goalField()
  await goal.fill('90')
  await goal.press('Enter')
  await expect(goalField()).toHaveValue('90')

  await app.close()
  await launch()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await nav('Settings').click()
  await expect(goalField()).toHaveValue('90')
})

test('opens the floating timer, which shows the same timer', async () => {
  await page.keyboard.press(`${MOD}+2`)
  await page.getByRole('button', { name: 'Start focus' }).click()
  const windowPromise = app.waitForEvent('window')
  await page.getByRole('button', { name: 'Mini timer' }).click()
  const mini = await windowPromise
  await mini.waitForLoadState('domcontentloaded')
  await expect(mini.getByRole('button', { name: 'Pause' })).toBeVisible()

  // Pausing from the mini window pauses the one shared timer.
  await mini.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  const main = await page.getByRole('timer').getAttribute('aria-label')
  await expect(mini.getByRole('timer')).toHaveAttribute('aria-label', main ?? '')
  await expect(page.getByRole('button', { name: 'Close mini timer' })).toBeVisible()
})

// ── updates ────────────────────────────────────────────────────────────────
// A development build reads a local "latest release" file instead of GitHub
// (FOCUSFLOW_UPDATE_FIXTURE, ignored in packaged builds), through the same
// validation as the real API response.

const REPO = 'LokmanBrahmia/FocusFlow'
function releaseFixture(overrides: Record<string, unknown> = {}): string {
  const file = join(profile, 'release.json')
  writeFileSync(
    file,
    JSON.stringify({
      tag_name: 'v9.9.9',
      html_url: `https://github.com/${REPO}/releases/tag/v9.9.9`,
      draft: false,
      prerelease: false,
      assets: [{ name: 'FocusFlow-9.9.9.x86_64.rpm', browser_download_url: `https://github.com/${REPO}/releases/download/v9.9.9/FocusFlow-9.9.9.x86_64.rpm` }],
      ...overrides
    })
  )
  return file
}

async function relaunchWithFixture(overrides: Record<string, unknown> = {}): Promise<void> {
  const fixture = releaseFixture(overrides)
  await app.close()
  await launch({ FOCUSFLOW_UPDATE_FIXTURE: fixture })
}

test('shows an available update, hides it with Later, and shows it again on a manual check', async () => {
  await relaunchWithFixture()
  await nav('Settings').click()
  await page.getByRole('button', { name: 'Check for updates' }).click()

  const notice = page.getByRole('region', { name: 'FocusFlow 9.9.9 is available' })
  await expect(notice).toBeVisible()
  await expect(page.getByText('Version 9.9.9 is available.')).toBeVisible()
  // Development builds are updated manually: no in-app install is offered.
  await expect(notice.getByRole('button', { name: 'Install and restart' })).toHaveCount(0)

  await notice.getByRole('button', { name: 'Later' }).click()
  await expect(notice).toBeHidden()

  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByRole('region', { name: 'FocusFlow 9.9.9 is available' })).toBeVisible()
})

test('rejects release metadata that points outside the repository', async () => {
  await relaunchWithFixture({ html_url: 'https://evil.example/releases/tag/v9.9.9' })
  await nav('Settings').click()
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText('The release page is not on FocusFlow’s repository.')).toBeVisible()
  await expect(page.getByRole('region', { name: /is available/ })).toHaveCount(0)
})

test('the update bridge only accepts valid requests', async () => {
  const results = await page.evaluate(async () => {
    // Runs in the renderer; typed loosely because this file is checked as Node code.
    const window = globalThis as unknown as { desktop: DesktopAPI; require?: unknown }
    const outcome = async (p: Promise<unknown>) => p.then(() => 'ok', (e: Error) => e.message)
    return {
      foreignLink: await outcome(window.desktop.updates.openRelease('https://evil.example/FocusFlow.exe')),
      fileLink: await outcome(window.desktop.updates.openRelease('file:///etc/passwd')),
      badVersion: await outcome(window.desktop.updates.dismiss('not-a-version')),
      installTooEarly: await outcome(window.desktop.updates.install()),
      noNodeInRenderer: typeof window.require
    }
  })
  expect(results.foreignLink).toBe('That link is not a FocusFlow release.')
  expect(results.fileLink).toBe('That link is not a FocusFlow release.')
  expect(results.badVersion).toBe('Invalid version.')
  expect(results.installTooEarly).toBe('The update has not been downloaded yet.')
  expect(results.noNodeInRenderer).toBe('undefined')
})
