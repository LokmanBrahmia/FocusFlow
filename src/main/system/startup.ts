import { app } from 'electron'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { tl } from '@shared/i18n'

/**
 * Launch at login. macOS and Windows use Electron's login items. Linux has
 * no Electron API, so an XDG autostart entry is written instead, which GNOME,
 * KDE and most desktops honour. Only an installed app (DEB, RPM, AppImage)
 * can be registered; a development build has no stable executable to point at.
 */
export interface StartupSupport {
  supported: boolean
  reason?: string
}

const AUTOSTART_FILE = 'focusflow.desktop'

function autostartDir(): string {
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'autostart')
}

export function startupSupport(): StartupSupport {
  if (!app.isPackaged) return { supported: false, reason: tl('settings.startupInstalledOnly') }
  return { supported: true }
}

export async function applyLaunchOnStartup(enabled: boolean): Promise<void> {
  if (!startupSupport().supported) return

  if (process.platform === 'linux') {
    const file = join(autostartDir(), AUTOSTART_FILE)
    if (!enabled) {
      await rm(file, { force: true })
      return
    }
    // AppImage: the .AppImage file itself; DEB/RPM: the installed binary.
    const exec = (process.env.APPIMAGE || process.execPath).replace(/(["`$\\])/g, '\\$1')
    await mkdir(autostartDir(), { recursive: true })
    await writeFile(
      file,
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Azm',
        'Comment=Pomodoro timer and study planner',
        `Exec="${exec}" --hidden`,
        'X-GNOME-Autostart-enabled=true',
        'Terminal=false',
        ''
      ].join('\n'),
      'utf8'
    )
    return
  }

  app.setLoginItemSettings({ openAtLogin: enabled, args: ['--hidden'] })
}

/** True when the OS started the app at login (it should then stay in the tray). */
export function launchedHidden(): boolean {
  return process.argv.includes('--hidden')
}
