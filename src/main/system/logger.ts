import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Mirrors console warnings and errors into userData/logs/main.log so problems
 * on a user's machine can be diagnosed. Messages only: no task titles or notes
 * are logged by the app, and the file is capped at ~1 MB with one rotation.
 */
const MAX_BYTES = 1_000_000
let logFile: string | null = null

function write(level: string, args: unknown[]): void {
  if (!logFile) return
  try {
    const text = args
      .map((a) => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack ?? ''}` : typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' ')
    try {
      if (statSync(logFile).size > MAX_BYTES) renameSync(logFile, `${logFile}.1`)
    } catch {
      /* file does not exist yet */
    }
    appendFileSync(logFile, `${new Date().toISOString()} ${level} ${text}\n`, 'utf8')
  } catch {
    /* logging must never crash the app */
  }
}

export function initLogger(userData: string): string {
  const dir = join(userData, 'logs')
  mkdirSync(dir, { recursive: true })
  logFile = join(dir, 'main.log')

  const origWarn = console.warn.bind(console)
  const origError = console.error.bind(console)
  console.warn = (...args: unknown[]) => {
    origWarn(...args)
    write('WARN', args)
  }
  console.error = (...args: unknown[]) => {
    origError(...args)
    write('ERROR', args)
  }

  process.on('uncaughtException', (err) => console.error('[uncaught]', err))
  process.on('unhandledRejection', (reason) => console.error('[unhandled rejection]', reason))
  return logFile
}
