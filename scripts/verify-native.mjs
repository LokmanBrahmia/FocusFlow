// Verifies that better-sqlite3 loads and works under both Node (tests) and
// Electron (the app). better-sqlite3 13 ships N-API prebuilds, so the same
// binary serves both; if a future version needs an ABI-specific rebuild, this
// check fails loudly instead of the packaged app failing on users' machines.
//
// Usage: node scripts/verify-native.mjs
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electron = require('electron') // path to the Electron binary

const probe = `
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('CREATE TABLE t (x INTEGER)');
  db.prepare('INSERT INTO t VALUES (?)').run(42);
  const row = db.prepare('SELECT x, sqlite_version() AS v FROM t').get();
  if (row.x !== 42) throw new Error('read back failed');
  console.log(JSON.stringify({ runtime: process.versions.electron ? 'electron ' + process.versions.electron : 'node ' + process.versions.node, sqlite: row.v, napi: process.versions.napi }));
`

let failed = false
for (const [label, cmd, env] of [
  ['Node', process.execPath, process.env],
  ['Electron', electron, { ...process.env, ELECTRON_RUN_AS_NODE: '1' }]
]) {
  try {
    const out = execFileSync(cmd, ['-e', probe], { env, encoding: 'utf8' }).trim()
    console.log(`✔ ${label}: ${out}`)
  } catch (err) {
    failed = true
    console.error(`✘ ${label}: better-sqlite3 failed to load.\n${err.stderr || err.message}`)
  }
}
process.exit(failed ? 1 : 0)
