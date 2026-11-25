// Serves dist/ like Cloudflare Pages would, including the "/*" rules from
// dist/_headers, so the Content Security Policy can be checked locally.
// Usage: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.PORT ?? process.argv[2] ?? 4173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' }

// Parse only the global "/*" block, which is what the CSP lives in.
const global = {}
let inGlobal = false
for (const line of readFileSync(join(root, '_headers'), 'utf8').split('\n')) {
  if (/^\S/.test(line)) inGlobal = line.trim() === '/*'
  else if (inGlobal && line.includes(':')) {
    const i = line.indexOf(':')
    global[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}

createServer((req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(root, path)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')
  res.writeHead(200, { ...global, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
}).listen(port, () => console.log(`Serving dist/ with _headers on http://localhost:${port}`))
