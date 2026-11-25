import { join } from 'node:path'

/** Database file name. Unchanged since FocusFlow so existing data is found. */
export const DATABASE_FILE = 'focusflow.sqlite'

/**
 * Picks the user-data folder after the rename from FocusFlow to Azm.
 *
 * Electron names this folder after the product, so a renamed app would start
 * with an empty profile. Instead:
 * 1. the new folder (…/Azm) if it already holds a database,
 * 2. otherwise the old folder (…/FocusFlow) if *it* holds one,
 * 3. otherwise the new folder (fresh install).
 *
 * Nothing is moved, copied or deleted: an existing install simply keeps
 * reading and writing where its data already is.
 */
export function resolveUserDataDir(
  appDataDir: string,
  names: { current: string; legacy: string },
  exists: (path: string) => boolean
): { dir: string; legacy: boolean } {
  const current = join(appDataDir, names.current)
  const legacy = join(appDataDir, names.legacy)
  if (exists(join(current, DATABASE_FILE))) return { dir: current, legacy: false }
  if (exists(join(legacy, DATABASE_FILE))) return { dir: legacy, legacy: true }
  return { dir: current, legacy: false }
}
