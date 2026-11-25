import { BrowserWindow, nativeTheme, screen } from 'electron'
import { join } from 'node:path'
import { hardenWebContents, loadRenderer } from './mainWindow'

export const MINI_WIDTH = 320
export const MINI_HEIGHT = 92

/**
 * Compact always-on-top window. It runs no timer of its own: it renders the
 * state broadcast by the main-process TimerService, like the main window.
 */
export function createMiniTimerWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    x: workArea.x + workArea.width - MINI_WIDTH - 24,
    y: workArea.y + 24,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: 'FocusFlow timer',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#151922' : '#FFFFFF',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.once('ready-to-show', () => win.showInactive())
  hardenWebContents(win)
  loadRenderer(win, '/mini')
  return win
}
