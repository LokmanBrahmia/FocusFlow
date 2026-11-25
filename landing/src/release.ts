/**
 * Download links come from the latest *stable* GitHub Release (GitHub's
 * /releases/latest skips drafts and prereleases). Nothing is hardcoded: no
 * version, no file URL. A package that is not attached to that release gets
 * no link.
 */

export type PackageKind = 'rpm' | 'deb' | 'exe'

export interface ReleaseAsset {
  name: string
  url: string
  size: number
}

export interface LatestRelease {
  /** Version without the leading "v", e.g. "0.1.0". */
  version: string
  tag: string
  url: string
  publishedAt: string | null
  assets: Record<PackageKind, ReleaseAsset | null>
}

export type ReleaseState =
  | { status: 'unconfigured' }
  | { status: 'loading' }
  | { status: 'ready'; release: LatestRelease }
  | { status: 'none' }
  | { status: 'error'; message: string }

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
  state?: string
}

interface GitHubRelease {
  tag_name: string
  html_url: string
  published_at: string | null
  draft: boolean
  prerelease: boolean
  assets: GitHubAsset[]
}

const REPO_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/

export function isRepo(value: string | undefined | null): value is string {
  return !!value && REPO_RE.test(value)
}

/** Most specific match first, then any file with the right extension. */
const MATCHERS: Record<PackageKind, RegExp[]> = {
  rpm: [/\.x86_64\.rpm$/i, /\.rpm$/i],
  deb: [/_amd64\.deb$/i, /\.deb$/i],
  exe: [/setup.*\.exe$/i, /\.exe$/i]
}

export function pickAssets(assets: GitHubAsset[]): Record<PackageKind, ReleaseAsset | null> {
  const usable = assets.filter((a) => a.state === undefined || a.state === 'uploaded')
  const pick = (kind: PackageKind): ReleaseAsset | null => {
    for (const re of MATCHERS[kind]) {
      const a = usable.find((x) => re.test(x.name))
      if (a) return { name: a.name, url: a.browser_download_url, size: a.size }
    }
    return null
  }
  return { rpm: pick('rpm'), deb: pick('deb'), exe: pick('exe') }
}

export function toLatestRelease(data: GitHubRelease): LatestRelease | null {
  if (data.draft || data.prerelease) return null
  return {
    version: data.tag_name.replace(/^v/, ''),
    tag: data.tag_name,
    url: data.html_url,
    publishedAt: data.published_at,
    assets: pickAssets(data.assets ?? [])
  }
}

export function releasesPage(repo: string): string {
  return `https://github.com/${repo}/releases`
}

export async function fetchLatestRelease(
  repo: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000
): Promise<ReleaseState> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal
    })
    if (res.status === 404) return { status: 'none' }
    if (res.status === 403 || res.status === 429) {
      return { status: 'error', message: 'GitHub is limiting requests right now.' }
    }
    if (!res.ok) return { status: 'error', message: `GitHub answered with status ${res.status}.` }
    const release = toLatestRelease((await res.json()) as GitHubRelease)
    return release ? { status: 'ready', release } : { status: 'none' }
  } catch {
    return { status: 'error', message: 'The latest release could not be checked.' }
  } finally {
    clearTimeout(timer)
  }
}

export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`
}
