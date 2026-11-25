import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const shared = resolve(__dirname, 'src/shared')

/** "owner/repo" from package.json "repository": the single source for update checks. */
function githubRepository(): string {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
  const raw: string | undefined = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  const m = raw?.match(/(?:github:|github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/)
  return m ? `${m[1]}/${m[2]}` : ''
}

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': shared } },
    define: { __GITHUB_REPOSITORY__: JSON.stringify(githubRepository()) }
  },
  preload: {
    resolve: { alias: { '@shared': shared } }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': shared
      }
    },
    plugins: [vue(), tailwindcss()]
  }
})
