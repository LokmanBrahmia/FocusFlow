// Guards releases: the git tag must be exactly "v" + package.json version.
// Prints whether the version is a prerelease (contains "-", e.g. 0.2.0-beta.1)
// and, in GitHub Actions, exposes `version` and `prerelease` as step outputs.
//
// Usage: node scripts/check-release-version.mjs v0.1.0
//        (defaults to $GITHUB_REF_NAME in CI)
import { appendFileSync, readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

if (!semver.test(pkg.version)) {
  console.error(`package.json version "${pkg.version}" is not a valid semantic version.`)
  process.exit(1)
}
if (!tag) {
  console.error('No tag given. Pass one (e.g. v0.1.0) or set GITHUB_REF_NAME.')
  process.exit(1)
}
if (tag !== `v${pkg.version}`) {
  console.error(`Tag "${tag}" does not match package.json version "${pkg.version}". Expected "v${pkg.version}".`)
  process.exit(1)
}

const prerelease = pkg.version.includes('-')
console.log(`✔ ${tag} matches package.json (${prerelease ? 'prerelease' : 'stable'})`)
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${pkg.version}\nprerelease=${prerelease}\n`)
}
