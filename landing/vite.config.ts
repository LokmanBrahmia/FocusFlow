import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/**
 * The GitHub repository comes from the app's own package.json ("repository"),
 * the same source the packaging scripts use. VITE_GITHUB_REPOSITORY can
 * override it (e.g. in Cloudflare Pages settings). Neither is a secret.
 */
function repoFromAppPackage(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'))
    const raw: string | undefined = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
    const m = raw?.match(/(?:github:|github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/)
    return m ? `${m[1]}/${m[2]}` : ''
  } catch {
    return ''
  }
}

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const repo = env.VITE_GITHUB_REPOSITORY || repoFromAppPackage()
  // Open Graph needs absolute URLs. VITE_SITE_URL wins; otherwise the host's
  // own production URL is used (Netlify: URL, Cloudflare Pages: CF_PAGES_URL).
  const siteUrl = (env.VITE_SITE_URL || process.env.URL || process.env.CF_PAGES_URL || '').replace(/\/$/, '')

  return {
    plugins: [
      vue(),
      tailwindcss(),
      {
        // The CSP allows the one inline script (theme before first paint) by
        // its hash instead of 'unsafe-inline'. The hash is computed from the
        // built index.html so the two can never drift apart.
        name: 'focusflow-csp-hash',
        apply: 'build',
        closeBundle() {
          const out = resolve(__dirname, 'dist')
          const html = readFileSync(resolve(out, 'index.html'), 'utf8')
          const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
            (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`
          )
          const headersPath = resolve(out, '_headers')
          const headers = readFileSync(headersPath, 'utf8').replace("'sha256-REPLACED_AT_BUILD'", hashes.join(' '))
          writeFileSync(headersPath, headers)
        }
      },
      {
        name: 'focusflow-absolute-meta',
        transformIndexHtml: (html: string) =>
          html.replace(
            '<!--og-absolute-->',
            siteUrl
              ? [
                  `<meta property="og:url" content="${escapeAttr(siteUrl)}/" />`,
                  `<meta property="og:image" content="${escapeAttr(siteUrl)}/og-image.png" />`,
                  '<meta property="og:image:width" content="1200" />',
                  '<meta property="og:image:height" content="630" />',
                  `<link rel="canonical" href="${escapeAttr(siteUrl)}/" />`
                ].join('\n    ')
              : ''
          )
      }
    ],
    define: {
      __GITHUB_REPOSITORY__: JSON.stringify(repo)
    },
    test: { include: ['src/**/*.test.ts'] }
  }
})
