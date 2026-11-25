import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

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

async function launch(): Promise<void> {
  app = await electron.launch({
    args: [resolve(__dirname, '..')],
    env: { ...process.env, FOCUSFLOW_USER_DATA: profile, ELECTRON_RENDERER_URL: '' }
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
