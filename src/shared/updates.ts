/**
 * Application updates.
 *
 * Two delivery modes, chosen per installed package format:
 * - 'install' (Windows NSIS): FocusFlow downloads the update, verifies it
 *   against the SHA-512 in the release's latest.yml, and installs it only
 *   after the user clicks "Install and restart".
 * - 'manual' (Linux DEB/RPM/AppImage, development builds): FocusFlow tells
 *   the user a new version exists and links to the official release; the
 *   system package manager installs it. No root commands are run by the app.
 */

export type UpdateMode = 'install' | 'manual'

/** Package format of this installation, used to pick the right download. */
export type PackageFormat = 'nsis' | 'deb' | 'rpm' | 'appimage' | 'dev' | 'other'

export interface AvailableUpdate {
  version: string
  /** Release page on GitHub (validated to belong to FocusFlow's repository). */
  releaseUrl: string
  /** Direct link to this platform's package, when the release has one. */
  assetUrl: string | null
  assetName: string | null
  /** Terminal command to install the downloaded package (Linux only). */
  installCommand: string | null
}

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date'; checkedAt: string }
  | { kind: 'available'; update: AvailableUpdate }
  | { kind: 'downloading'; update: AvailableUpdate; percent: number; transferred: number; total: number }
  | { kind: 'downloaded'; update: AvailableUpdate; installOnQuit: boolean }
  | { kind: 'error'; message: string; during: 'check' | 'download' | 'install'; update: AvailableUpdate | null }

export interface UpdateState {
  currentVersion: string
  mode: UpdateMode
  format: PackageFormat
  /** False when this build cannot check at all (e.g. no repository configured). */
  enabled: boolean
  status: UpdateStatus
  /** The user chose "Later" for this version; the notice stays hidden this session. */
  dismissedVersion: string | null
  lastCheckedAt: string | null
}

// ── versions ────────────────────────────────────────────────────────────────

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function parseVersion(v: string): { main: [number, number, number]; pre: string | null } | null {
  const m = SEMVER.exec(v.trim())
  if (!m) return null
  return { main: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null }
}

/** Semantic-version comparison: negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) throw new Error(`Invalid version: ${!pa ? a : b}`)
  for (let i = 0; i < 3; i++) if (pa.main[i] !== pb.main[i]) return pa.main[i] - pb.main[i]
  if (pa.pre === pb.pre) return 0
  if (pa.pre === null) return 1 // 1.0.0 > 1.0.0-beta
  if (pb.pre === null) return -1
  const xa = pa.pre.split('.')
  const xb = pb.pre.split('.')
  for (let i = 0; i < Math.max(xa.length, xb.length); i++) {
    if (xa[i] === undefined) return -1
    if (xb[i] === undefined) return 1
    const na = /^\d+$/.test(xa[i]) ? Number(xa[i]) : null
    const nb = /^\d+$/.test(xb[i]) ? Number(xb[i]) : null
    if (na !== null && nb !== null && na !== nb) return na - nb
    if (na !== null && nb === null) return -1
    if (na === null && nb !== null) return 1
    if (xa[i] !== xb[i]) return xa[i] < xb[i] ? -1 : 1
  }
  return 0
}

export function isNewer(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0
}

// ── GitHub release metadata (validated, never trusted blindly) ──────────────

export interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
  state?: string
}

export interface GitHubRelease {
  tag_name: string
  html_url: string
  draft: boolean
  prerelease: boolean
  assets: GitHubReleaseAsset[]
}

export class InvalidReleaseError extends Error {
  override name = 'InvalidReleaseError'
}

const ASSET_PATTERNS: Partial<Record<PackageFormat, RegExp>> = {
  rpm: /\.x86_64\.rpm$/i,
  deb: /_amd64\.deb$/i,
  nsis: /-Setup-.*\.exe$/i,
  appimage: /\.AppImage$/i
}

/**
 * Turns the GitHub API's "latest release" into an AvailableUpdate, or null
 * when it is not newer. Every URL must point at this repository on
 * github.com, so a tampered or unexpected response cannot send the user
 * anywhere else.
 */
export function releaseToUpdate(
  raw: unknown,
  repository: string,
  currentVersion: string,
  format: PackageFormat
): AvailableUpdate | null {
  if (typeof raw !== 'object' || raw === null) throw new InvalidReleaseError('The release information is not valid.')
  const r = raw as Partial<GitHubRelease>
  if (typeof r.tag_name !== 'string' || typeof r.html_url !== 'string' || !Array.isArray(r.assets)) {
    throw new InvalidReleaseError('The release information is incomplete.')
  }
  if (r.draft || r.prerelease) return null
  const version = r.tag_name.replace(/^v/, '')
  if (!parseVersion(version)) throw new InvalidReleaseError(`The latest release has an invalid version (${r.tag_name}).`)

  const base = `https://github.com/${repository}/releases/`
  if (!r.html_url.startsWith(base)) throw new InvalidReleaseError('The release page is not on FocusFlow’s repository.')
  if (!isNewer(version, currentVersion)) return null

  const pattern = ASSET_PATTERNS[format]
  const asset = pattern
    ? r.assets.find(
        (a) =>
          typeof a?.name === 'string' &&
          typeof a?.browser_download_url === 'string' &&
          (a.state === undefined || a.state === 'uploaded') &&
          pattern.test(a.name) &&
          a.browser_download_url.startsWith(`${base}download/`)
      )
    : undefined

  const installCommand =
    asset && format === 'rpm'
      ? `sudo dnf install ./${asset.name}`
      : asset && format === 'deb'
        ? `sudo apt install ./${asset.name}`
        : null

  return {
    version,
    releaseUrl: r.html_url,
    assetUrl: asset?.browser_download_url ?? null,
    assetName: asset?.name ?? null,
    installCommand
  }
}

/** True for URLs the app may open in the browser for updates. */
export function isTrustedReleaseUrl(url: string, repository: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'github.com' && u.pathname.startsWith(`/${repository}/releases/`)
  } catch {
    return false
  }
}
