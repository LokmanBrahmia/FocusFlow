// Runs electron-builder with metadata derived from one source of truth.
//
// The GitHub repository ("owner/repo") comes from package.json "repository",
// or from $GITHUB_REPOSITORY in GitHub Actions. It becomes the package
// homepage that DEB/RPM metadata requires. Until a repository exists, local
// builds use an intentionally unresolvable example.invalid URL and warn.
//
// Usage: node scripts/package.mjs <electron-builder args...>
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export function repoFromPackage(repository) {
  const raw = typeof repository === 'string' ? repository : repository?.url
  if (!raw) return null
  const m = raw.match(/(?:github:|github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/)
  return m ? `${m[1]}/${m[2]}` : null
}

// Only build when run directly, so other scripts can import repoFromPackage.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()

function main() {
  const repo = repoFromPackage(pkg.repository) ?? process.env.GITHUB_REPOSITORY ?? null
  let homepage
  if (repo) {
    homepage = `https://github.com/${repo}`
  } else {
    homepage = 'https://example.invalid/focusflow'
    console.warn(
      '\n⚠  No GitHub repository configured. Set "repository" in package.json (e.g. "github:owner/focusflow").\n' +
        '   Using a placeholder homepage; these packages are for local testing only.\n'
    )
  }

  const require = createRequire(import.meta.url)
  const cli = require.resolve('electron-builder/cli.js')
  const args = [cli, ...process.argv.slice(2), `-c.extraMetadata.homepage=${homepage}`]
  console.log(`electron-builder ${process.argv.slice(2).join(' ')}  (homepage: ${homepage})`)
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' })
  process.exit(r.status ?? 1)
}
