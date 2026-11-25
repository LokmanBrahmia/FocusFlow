import { BrowserWindow, nativeTheme, screen, shell, type Rectangle } from 'electron'
import { join } from 'node:path'

const DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']

/** Origins the renderer is allowed to load from. */
export function isAllowedUrl(url: string): boolean {
  if (DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL)) return true
  return url.startsWith('file://')
}

/** Only local app resources may be shown inside a window. */
export function hardenWebContents(win: BrowserWindow): void {
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) event.preventDefault()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
}

/** Loads the renderer at a hash route (hash history works with file://). */
export function loadRenderer(win: BrowserWindow, route = '/'): void {
  if (DEV_SERVER_URL) {
    void win.loadURL(`${DEV_SERVER_URL}#${route}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route })
  }
}

export interface WindowStateOptions {
  /** Last saved bounds, used when the behaviour is "remember". */
  bounds?: Rectangle
  maximized?: boolean
  show?: boolean
}

/** Saved bounds are only reused if they are still on a connected display. */
function visibleBounds(bounds: Rectangle | undefined): Rectangle | undefined {
  if (!bounds) return undefined
  const area = screen.getDisplayMatching(bounds).workArea
  const overlapsX = bounds.x < area.x + area.width && bounds.x + bounds.width > area.x
  const overlapsY = bounds.y < area.y + area.height && bounds.y + bounds.height > area.y
  return overlapsX && overlapsY ? bounds : undefined
}

export function createMainWindow(options: WindowStateOptions = {}): BrowserWindow {
  const bounds = visibleBounds(options.bounds)
  const win = new BrowserWindow({
    width: bounds?.width ?? 1280,
    height: bounds?.height ?? 800,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 720,
    minHeight: 520,
    show: false,
    title: 'Azm',
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#131517' : '#F4F5F4',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  })

  win.once('ready-to-show', () => {
    if (options.maximized) win.maximize()
    if (options.show !== false) win.show()
  })
  hardenWebContents(win)
  loadRenderer(win, '/')
  return win
}
