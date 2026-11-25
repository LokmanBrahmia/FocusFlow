# Distributing Azm

Azm (عَزم) was called FocusFlow up to version 0.2.0. The section
[Publishing the Azm rename](#publishing-the-azm-rename) lists the one-time steps for the first
Azm release.

This is the complete path from source code to downloads on the website:

```text
package.json version ──► git tag vX.Y.Z ──► GitHub Actions ──► draft GitHub Release
                                                                   │  (you review and publish)
                                                                   ▼
                     landing page (Netlify) and installed apps read the latest stable release
```

- **One version source:** `version` in `package.json`. Tags, package filenames and the version shown
  on the website all come from it. CI refuses a tag that does not match.
- **One repository source:** `repository` in `package.json` (`LokmanBrahmia/FocusFlow`). Package
  metadata and the website's download links come from it.
- **Nothing becomes public by itself:** CI creates a *draft* release. It only becomes visible, and
  the website only links to it, after you click **Publish release** on GitHub.

## Packages

| Target | File | Built on | Install |
| --- | --- | --- | --- |
| Fedora / RHEL family | `Azm-<version>.x86_64.rpm` | Linux | `sudo dnf install ./Azm-<version>.x86_64.rpm` |
| Ubuntu / Debian family | `Azm-<version>_amd64.deb` | Linux | `sudo apt install ./Azm-<version>_amd64.deb` |
| Windows 10/11 x64 | `Azm-Setup-<version>.exe` | Windows | Run the installer (per-user, no admin rights) |

### Minimum supported systems

| System | Requirement | Status |
| --- | --- | --- |
| Linux (DEB/RPM) | x86_64, **glibc 2.34 or newer** (from better-sqlite3's prebuilt binary). Covers Ubuntu 22.04+, Debian 12+, Fedora 35+. | **Tested:** DEB on a clean Ubuntu 22.04 and RPM on a clean Fedora 41 (installed with the system package manager, app smoke-tested as a normal user). Developed on Fedora 44. |
| Ubuntu 24.04+ | Same as above. The DEB declares the renamed `t64` libraries as alternatives. | **Not tested yet.** |
| Windows | Windows 10 or 11, 64-bit (Electron 45's minimum). | **Not tested locally** (Windows installers can't be built on Linux without Wine). CI installs the EXE on a Windows runner and smoke-tests it on every build. |

Packages are **not code-signed**. Fedora's `dnf` notes that it skipped signature checks, and
Windows SmartScreen shows "unknown publisher". The website's FAQ explains this to users.

### What the packages contain

- The app runs from `/opt/Azm` (Linux) or `%LOCALAPPDATA%\Programs\Azm` (Windows) and never
  writes there. The Linux package is still named `focusflow` and the command is still
  `focusflow`, so the package manager treats Azm as an upgrade of FocusFlow.
- User data lives in the user data directory (`~/.config/Azm`, `%APPDATA%\Azm`). An existing
  `FocusFlow` folder with a database is used instead until the Azm folder has one, so upgrading
  from FocusFlow keeps everything. Upgrading or uninstalling never deletes it.
- **Native module:** better-sqlite3 13 ships N-API prebuilt binaries. One binary works in Node and
  every Electron version, so there is no ABI rebuild (`npmRebuild: false`).
  `npm run verify:native` proves it loads under both runtimes. Each package includes only its own
  platform's binary, unpacked from `app.asar`. The SQLite sources and other platforms' binaries are
  left out. If a future better-sqlite3 drops N-API prebuilds, `verify:native` fails in CI and you
  must add an `@electron/rebuild` step.
- **DEB dependencies** are declared explicitly in `electron-builder.yml`. electron-builder's
  default list omits `libgbm1` and `libasound2`, and without them the app does not start on a clean
  Ubuntu. This was found by the container test.

## 1. Build locally

```bash
npm install
npm run build                 # type-check + production build to out/
```

Checks:

```bash
npm run typecheck
npm run lint
npm test                      # 81 unit/integration tests
npm run test:e2e              # 5 UI tests driving the real app (needs a display)
npm run verify:native         # better-sqlite3 loads in Node and Electron
```

Packages (output in `release/`, which is git-ignored):

```bash
npm run dist:linux            # DEB + RPM   (Linux; needs rpm-build: sudo dnf install rpm-build)
npm run dist:win              # NSIS EXE    (Windows only; on Linux it needs Wine)
npm run dist:appimage         # optional AppImage, not part of releases
```

Every `dist:*` script passes `--publish never`, so electron-builder never uploads anything.

### Verify packages before releasing

```bash
# The packaged binary checks itself in a temporary profile: native SQLite,
# migrations, read/write, backup, renderer + preload bridge. Exit code 0 = pass.
./release/linux-unpacked/focusflow --smoke-test

# Install the DEB on clean Ubuntu 22.04 and the RPM on clean Fedora 41
# (Docker or Podman; nothing is installed on your machine):
scripts/test-linux-packages.sh docker
```

The smoke test leaves its temporary profile (`focusflow-smoke-*`) in the OS temp folder. Chromium
writes to it while shutting down, so the app can't remove it itself.

## 2. Push changes to GitHub

```bash
git add -A
git commit -m "Describe the change"
git push origin main
```

Never commit `release/`, `dist/`, `out/` or `node_modules/`. They are in `.gitignore`. GitHub
rejects files over 100 MB, and packages belong on Releases.

## 3. Create a version tag

```bash
npm version 0.2.0 -m "Release %s"   # updates package.json + package-lock.json, commits, tags v0.2.0
git push origin main
git push origin v0.2.0
```

- Use `npm version patch|minor|major` to bump automatically.
- A version with a suffix (`0.3.0-beta.1`) becomes a **prerelease**. The website ignores
  prereleases and keeps linking to the latest stable release.
- The tag must point at a commit that is already on `main`, or CI refuses to release.

## 4. GitHub Actions

Pushing the tag starts **Actions → Release** (`.github/workflows/release.yml`):

| Job | Runner | Does |
| --- | --- | --- |
| Checks and tests | ubuntu-22.04 | tag = `v` + package.json version, tag commit is on `main`, `verify:native`, typecheck, lint, unit tests |
| Linux packages | ubuntu-22.04 | build, Playwright UI tests (Xvfb), DEB + RPM, smoke test of the packaged app, install test in clean Ubuntu 22.04 and Fedora 41 containers |
| Windows installer | windows-latest | build, NSIS EXE, silent install, smoke test of the installed app |
| Draft GitHub Release | ubuntu-22.04 | only for tags: creates a **draft** release with the RPM, DEB, EXE, `latest.yml` and the EXE's `.blockmap`, and generated notes |

To build without releasing (for example from a branch): **Actions → Release → Run workflow**. The
packages appear as workflow artifacts (`focusflow-linux`, `focusflow-windows`) for 14 days.

The workflow uses only the built-in `GITHUB_TOKEN` (write access only in the release job). There
are no secrets to configure.

## 5. Verify the generated artifacts

1. Open the run in **Actions** and confirm every job is green.
2. Download the artifacts and try them on real machines if you can: install the RPM on Fedora,
   the DEB on Ubuntu and the EXE on Windows, and check the app opens and keeps data after a restart.
3. Open **Releases**, open the draft `vX.Y.Z` and check it has these five files:
   - `Azm-X.Y.Z.x86_64.rpm`
   - `Azm-X.Y.Z_amd64.deb`
   - `Azm-Setup-X.Y.Z.exe`
   - `Azm-Setup-X.Y.Z.exe.blockmap` (Windows in-app updates)
   - `latest.yml` (Windows in-app updates; it names the EXE and its SHA-512)

   Don't rename, delete or re-upload these files by hand. `latest.yml` must match the EXE
   byte for byte, or Windows updates are refused.

## 6. Publish the stable release

On the draft release page, edit the notes if you want, then click **Publish release**. This is
the moment the version becomes public.

### How installed copies find out

Publishing the release is all it takes. Running copies check about 20 seconds after starting
and every 6 hours:
- **Windows** offers **Download update**, then **Install and restart**.
- **Fedora and Ubuntu** show the new version with a link to the package and the `dnf` or
  `apt` command.

Drafts and prereleases are never offered.

To check before telling anyone: on a machine with the previous version, open
**Settings → Updates → Check for updates**.

## 7. Verify the website's download links

The landing page asks GitHub for the latest stable release in the visitor's browser, so a new
release appears **without redeploying the site**.

1. Open the site and go to **Download**. Each card should show the new version, a **Download**
   button with the file size, and the install command.
2. Click each button. The URL should be
   `https://github.com/LokmanBrahmia/FocusFlow/releases/download/vX.Y.Z/<file>`.
3. If a package is missing from the release, that card says "Not included in version X" and links
   to the release page instead of showing a button.
4. Before the first release is published, all cards say "No stable release has been published
   yet." That is expected, not an error.

You can check the source data directly:

```bash
curl -s https://api.github.com/repos/LokmanBrahmia/FocusFlow/releases/latest | grep -E '"tag_name"|browser_download_url'
```

## 8. Deploy the landing page

The site is hosted on **Netlify** (free plan), configured by `netlify.toml` at the repository root:

| Setting | Value (from `netlify.toml`) |
| --- | --- |
| Base directory | `landing` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` (inside `landing/`) |
| Node | 22 |

- **Deploys:** every push to `main` deploys to production. Pull requests get deploy previews.
  Builds are skipped when neither `landing/` nor `package.json` changed.
- **URLs:** HTTPS is automatic on `<site>.netlify.app`. Netlify's own `URL` variable fills in
  the Open Graph image and canonical tags.
- **Headers:** `landing/public/_headers` (CSP and security headers) works on Netlify unchanged.
- **Optional variables:** you can set `VITE_GITHUB_REPOSITORY` in Netlify, but it defaults to
  package.json. There are no secrets.

### The live site

| | |
| --- | --- |
| URL | https://focusflow-lokman.netlify.app |
| Netlify project | `focusflow-lokman` (team `brahmia16-lokman`), ID `7f73785f-1ea3-4520-9016-356714ca2420` |
| Visitor access | Production public; deploy previews require a Netlify login (team default) |

The site is **not linked to the GitHub repository yet**, so pushing to `main` does not redeploy
it. That's fine for releases: the download buttons read GitHub Releases live, so a new release
shows up without a redeploy. Redeploy only when the site itself changes:

```bash
cd landing
VITE_SITE_URL=https://focusflow-lokman.netlify.app npm run build
npx netlify-cli deploy --prod --dir dist --site 7f73785f-1ea3-4520-9016-356714ca2420
```

To deploy on every push instead: Netlify → `focusflow-lokman` → **Project configuration →
Build & deploy → Link repository → GitHub → LokmanBrahmia/FocusFlow**. The settings come from
`netlify.toml`.

On the free plan Netlify injects an HTML comment and a `/.netlify/scripts/hud` script into the
page. The site's CSP blocks that script's inline code, which shows as one console message. It is
Netlify's toolbar, not Azm code, and the page works normally.

### Alternative: Cloudflare Pages (free plan)

The site in `landing/` is a static Vite + Vue build with no server, no secrets and no Electron or
SQLite.

**One-time setup** (needs your Cloudflare account; nothing here was done for you):

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
   Authorise GitHub and choose `LokmanBrahmia/FocusFlow`.
2. Build settings:

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | None |
   | Root directory | `landing` |
   | Build command | `npm ci && npm run build` |
   | Build output directory | `dist` |

3. Environment variables (Production and Preview):

   | Variable | Value | Needed? |
   | --- | --- | --- |
   | `NODE_VERSION` | `22` | Yes |
   | `VITE_SITE_URL` | `https://<your-project>.pages.dev` | Recommended: enables absolute Open Graph image and canonical URL |
   | `VITE_GITHUB_REPOSITORY` | `LokmanBrahmia/FocusFlow` | No: read from `package.json` by default |

   None of these are secrets. Don't add secrets: everything in a Vite build is public.
4. **Save and Deploy.** You get `https://<your-project>.pages.dev` over HTTPS automatically.
5. Optional: **Settings → Build → Build watch paths**, include `landing/*` and `package.json`, so
   app-only commits don't rebuild the site.

**After setup:**

- Every push to `main` deploys to production.
- Every pull request and branch gets its own preview URL, which Cloudflare posts on the PR.
- `landing/public/_headers` sets a strict Content Security Policy (scripts from the site only,
  network calls only to `api.github.com`) plus caching and security headers. The hash for the
  one inline script is computed at build time.

**Develop and check locally:**

```bash
cd landing
npm install
npm run dev                         # http://localhost:5173
npm test                            # release/asset matching tests
npm run build                       # production build to landing/dist
node scripts/serve-dist.mjs 4173    # serve dist/ with _headers applied, like Cloudflare
```

## Publishing the Azm rename

The rename is done in the source only. Nothing was pushed, tagged, released or deployed. To ship it:

1. **Review and commit** the changes on `main`, then push: `git push origin main`.
2. **Bump the version** so installed FocusFlow 0.2.0 apps see an update, for example
   `npm version 0.3.0` (creates the commit and tag `v0.3.0`), then `git push origin main --tags`.
3. **Let CI build the draft release** (section 4). Check the draft has the five files from section 5,
   now named `Azm-…`. Edit the release title and notes; suggested notes:

   > FocusFlow is now **Azm (عَزم)**: steady focus, meaningful progress. New name, new icon and a
   > calmer look. Nothing else changes: your tasks, sessions, plans and settings carry over
   > automatically, and the app keeps reading your existing data folder.

4. **Test the upgrade before publishing** if you can: on Windows, install `FocusFlow-Setup-0.2.0.exe`,
   add some data, then run `Azm-Setup-0.3.0.exe` and check the data is there, there is one Start
   menu entry and one entry in *Installed apps*. This path has **not been tested**. On Fedora/Ubuntu,
   `sudo dnf install ./Azm-0.3.0.x86_64.rpm` or `sudo apt install ./Azm-0.3.0_amd64.deb` over
   FocusFlow 0.2.0 should upgrade the `focusflow` package in place.
5. **Publish the release** (section 6). Installed 0.2.0 apps then show the update notice, and the
   website's download buttons switch to the Azm files by themselves.
6. **Redeploy the website**, because the site itself changed (name, colours, screenshots,
   social image). Use the commands under *The live site* in section 8. The site keeps its current
   address, `https://focusflow-lokman.netlify.app`; renaming it is optional and only done in Netlify
   (Project configuration → Change project name). If you rename it, update the URL in this file,
   README.md and the `VITE_SITE_URL` used for the build.
7. **Optional:** rename the GitHub repository. GitHub redirects the old name, but installed apps
   only accept update links from the repository in `package.json`, so if you rename it, update
   `repository` in `package.json` and ship that in a release while the redirect still exists.

## Testing updates without publishing

- `npm test` covers version comparison, release validation, the update state machine
  (offline, interrupted downloads, Later, install-on-quit) and the check schedule.
- `npm run test:e2e` runs the real app against a local release file
  (`FOCUSFLOW_UPDATE_FIXTURE`, honoured only in unpackaged builds). It checks the notice, Later,
  rejection of tampered metadata and the IPC validation.
- `./release/linux-unpacked/focusflow --smoke-test` reports `updateFormat`. Installed DEB and RPM
  packages report `deb` and `rpm` (checked by `scripts/test-linux-packages.sh`).
- A full Windows update (one version updating to the next) can only be tested with two
  published releases. Do it once, with a throwaway prerelease turned into a stable release on a
  test repository, before relying on it.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| CI: "Tag vX does not match package.json version" | Run `npm version X`, push, then tag again. Delete a wrong tag with `git push origin :refs/tags/vX` and `git tag -d vX`. |
| CI: "points at a commit that is not on main" | Merge to `main` first, then tag that commit. |
| CI: "Release refused", or `gh release create` fails because the release exists | Delete the draft on GitHub and re-run the failed job. |
| `npm run dist:linux` fails with "Please specify project homepage" | `repository` is missing from package.json. |
| Push rejected: file larger than 100 MB | Build output was committed. Remove it from the commit, then push. |
| Windows says "update could not be found" | `latest.yml` or the `.blockmap` is missing from the release, or was edited. Re-run the workflow for that tag. |
| Installed copies don't see a new release | It's still a draft or marked prerelease, or the version isn't higher than the installed one. |
| App won't start on Linux: `cannot open shared object file` | A runtime library is missing from the DEB `depends` list. Add it in `electron-builder.yml`. `scripts/test-linux-packages.sh` catches this. |
