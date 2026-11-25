# FocusFlow

An offline Pomodoro timer, task manager and study planner for Fedora, Ubuntu and Windows.
Built with Electron, Vue 3, TypeScript, Tailwind CSS and SQLite. Everything is stored locally.
The only network request is the update check against GitHub Releases, which can be turned off
in Settings and sends no personal data.

- **Website and downloads:** https://focusflow-lokman.netlify.app (served from
  [GitHub Releases](https://github.com/LokmanBrahmia/FocusFlow/releases)).
- **Releasing and deploying:** [DISTRIBUTION.md](DISTRIBUTION.md) has every step and command.
- **Specifications:** [writing-block.md](writing-block.md) (app) and
  [writing-block 2.md](writing-block%202.md) (distribution).

## Supported systems

| System | Package | Minimum | Tested |
| --- | --- | --- | --- |
| Fedora (and RHEL family) | RPM, x86_64 | glibc 2.34 (Fedora 35+) | Clean Fedora 41 install + smoke test |
| Ubuntu (and Debian family) | DEB, amd64 | glibc 2.34 (Ubuntu 22.04+, Debian 12+) | Clean Ubuntu 22.04 install + smoke test |
| Windows | NSIS EXE, x64 | Windows 10 or 11 | Install + smoke test runs in CI; not yet run |

The glibc minimum comes from better-sqlite3's prebuilt binary. Ubuntu 24.04 should work (the
package declares the renamed `t64` libraries) but has not been tested. There is no macOS
build. Packages are not code-signed.

## Features

- **Pomodoro timer** that runs in the main process and is calculated from timestamps, so it
  stays accurate when the window is minimised, the app is in the background or the computer
  sleeps. It survives restarts. Includes focus, short and long breaks, auto-start options,
  sounds, desktop notifications and a floating always-on-top mini timer.
- **Tasks and subjects**: priorities, statuses, estimates, deadlines, planned dates, search,
  filters and sorting. Progress is focused time against the estimate. History is kept when a
  task or subject is deleted.
- **Planner**: a week view (drag tasks between days) and a day timeline showing planned study
  blocks next to the focus you actually recorded.
- **Statistics**: daily, weekly, subject and time-of-day charts, streaks, goal rate and focus
  quality, for today, the last 7 or 30 days, this month or a custom range.
- **Focus quality**: an optional 1–5 rating and note after each completed focus session.
- **Data**: JSON export/import, database backup/restore. An automatic safety backup is taken
  before any import or restore replaces your data.
- **Desktop integration**: light/dark/system theme, close to tray, launch at login, remembered
  window size, keyboard shortcuts.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| Space | Start or pause the timer |
| Ctrl/Cmd + Shift + F | Start a focus session |
| Ctrl/Cmd + N | New task |
| Ctrl/Cmd + 1 / 2 / 3 / 4 | Dashboard / Focus / Tasks / Statistics |
| Esc | Close a dialog or menu |

Shortcuts are ignored while you type in a field.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the app with hot reload |
| `npm run typecheck` | Type-check main, preload and renderer |
| `npm run lint` | ESLint |
| `npm test` | Unit and integration tests (Vitest, 81 tests) |
| `npm run test:e2e` | Build, then drive the real app with Playwright (5 UI tests) |
| `npm run build` | Type-check and build to `out/` |
| `npm run preview` | Run the production build |
| `npm run verify:native` | Check better-sqlite3 loads in Node and Electron |
| `npm run dist:linux` | Build `release/FocusFlow-<version>_amd64.deb` and `.x86_64.rpm` |
| `npm run dist:win` | Build `release/FocusFlow-Setup-<version>.exe` (on Windows) |
| `npm run dist:appimage` | Optional AppImage (not part of releases) |
| `npm run release:check -- v0.1.0` | Check a tag matches the package.json version |

The end-to-end tests run in a temporary profile (`FOCUSFLOW_USER_DATA`), so they never touch
your data and can run while FocusFlow is open.

## Packaging and releases

```bash
sudo dnf install rpm-build            # Fedora: needed to build the RPM
npm run dist:linux                    # DEB + RPM in release/
./release/linux-unpacked/focusflow --smoke-test   # packaged app checks itself, exit 0 = pass
scripts/test-linux-packages.sh docker # install both packages in clean Ubuntu/Fedora containers
```

- **Releases are made by GitHub Actions** (`.github/workflows/release.yml`). Pushing a tag
  `vX.Y.Z` that matches package.json runs checks and tests, builds the RPM and DEB on Linux and the
  EXE on Windows, install-tests them, and creates a **draft** GitHub Release. Nothing is public
  until you publish the draft. See [DISTRIBUTION.md](DISTRIBUTION.md).
- **Version:** `version` in package.json is the only source. Use `npm version X.Y.Z`, then push
  the tag.
- **Native module:** better-sqlite3 13 ships N-API prebuilt binaries, so one binary works in
  Node (tests) and Electron and no rebuild step is needed (`npmRebuild: false`). Each package
  contains only its own platform's binary, unpacked from the asar archive. If you ever need to
  compile it, do it from a path **without spaces**, because node-gyp fails on paths like
  `Study DNA`.
- **Launch at login** works from installed packages: it writes
  `~/.config/autostart/focusflow.desktop` on Linux and uses the login items on Windows.
- **Tray icon:** stock GNOME hides tray icons. Install the *AppIndicator and KStatusNotifierItem
  Support* extension to see FocusFlow's tray icon. Closing the window to the tray still works
  without it.

## Updates

FocusFlow checks GitHub Releases for a newer **stable** version about 20 seconds after it starts
and then every 6 hours. Drafts and prereleases are ignored. You can turn automatic checks off,
or check by hand, in **Settings → Updates**. When a newer version exists, a small notice
appears at the bottom of the sidebar with the version number, **What's new**, and **Later**,
which hides it for that version until FocusFlow restarts or you check again. Nothing downloads,
installs or restarts unless you click a button for it.

| Installed from | What happens | Seamless in-app update? |
| --- | --- | --- |
| **Windows NSIS installer** | **Download update** downloads the new installer inside the app, with progress. It is checked against the SHA-512 in the release's `latest.yml`, which is downloaded over HTTPS from this repository. Then **Install and restart**, or **Install when I quit**. If a focus session is running, FocusFlow asks first; the session is saved and continues after the restart. | **Yes** (electron-updater `NsisUpdater`) |
| **Fedora RPM** | The notice links to the new `.rpm` on the release and shows the command to install it: `sudo dnf install ./FocusFlow-<version>.x86_64.rpm`. | **No**: notify and link |
| **Ubuntu DEB** | The same, with `sudo apt install ./FocusFlow-<version>_amd64.deb`. | **No**: notify and link |
| AppImage (optional, not released) | The notice links to the release page; install the DEB or RPM from there. | **No**: notify and link |
| Development build (`npm run dev`) | Checks and notifies only. | No |

**Why not in-app updates for RPM and DEB?** electron-updater does have DEB and RPM updaters, but
they install by running a root shell through `pkexec`, `gksudo`, `kdesudo` or `beesu`, and fall
back to plain `sudo`, which can't prompt from a GUI app. For RPM they run
`dnf install --nogpgcheck -y`, which turns off package signature checks. That is unreliable
across desktops and weakens security, so FocusFlow never runs administrator commands itself.
Your package manager installs the update.

**Trust:** all update logic runs in the main process. The renderer can only call a few
validated actions, and links can only open `https://github.com/LokmanBrahmia/FocusFlow/releases/…`.
Release data from GitHub is validated (version format, URLs on this repository) before it is
shown. The packages are not code-signed, so a Windows update is trusted because its checksum
matches the `latest.yml` on your GitHub release. Protect the GitHub account accordingly.

The repository comes from `repository` in `package.json`. electron-builder writes it into the
Windows app's `app-update.yml`, and the build injects it for the Linux check. Nothing else
hardcodes it.



`landing/` is a separate static site (Vite + Vue + Tailwind) deployed to Netlify
(`netlify.toml`; Cloudflare Pages also works). It
does not include Electron or SQLite. Download buttons come from the latest **stable** GitHub
Release at page load, so publishing a release updates the site without a redeploy. A package
missing from a release is shown as unavailable instead of linking to a file that doesn't exist.
Screenshots on the page are real screenshots of the app with sample data.

```bash
cd landing && npm install
npm run dev        # http://localhost:5173
npm test           # release and asset matching tests
npm run build      # landing/dist
```

Netlify reads its settings from `netlify.toml`: base `landing`, command `npm ci && npm run build`,
publish `dist`, Node 22. Full instructions are in
[DISTRIBUTION.md](DISTRIBUTION.md#8-deploy-the-landing-page).

## Where data lives

On Windows the same files are in `%APPDATA%\FocusFlow\`.

| Path (Linux) | Contents |
| --- | --- |
| `~/.config/FocusFlow/focusflow.sqlite` | The database (WAL mode) |
| `~/.config/FocusFlow/backups/` | Automatic safety copies taken before import/restore |
| `~/.config/FocusFlow/logs/main.log` | Warnings and errors, capped at about 1 MB |

## Architecture

```text
src/
├── main/              Electron main process
│   ├── database/      connection, migrations/ (3 so far), repositories/
│   ├── data/          export, import, backup, restore
│   ├── ipc/           validated invoke handlers (handlers.ts, dataHandlers.ts)
│   ├── timer/         TimerService: the only timer, timestamp-based
│   ├── notifications/ desktop notifications
│   ├── system/        logger, tray, launch at login
│   └── windows/       main window, mini timer window
├── preload/           contextBridge: window.desktop (api.ts is the contract)
├── shared/            types and validation shared by all processes
└── renderer/          Vue app: views, components, Pinia stores, composables, i18n
```

- **Security:** `contextIsolation`, `sandbox`, no `nodeIntegration`, and a strict CSP.
  Navigation and `window.open` are blocked, and permissions are denied except notifications.
  The renderer never sees `ipcRenderer`, SQLite or the filesystem. Every channel is listed in
  `src/shared/ipc.ts`, and handlers check the sender and validate every argument. File access
  only happens through native dialogs the user drives.
- **Data integrity:**
  - Foreign keys and CHECK constraints are enforced, and multi-row changes run in transactions.
  - Each migration runs in its own transaction.
  - Imports are validated in a separate in-memory database with every constraint before
    anything changes.
  - Restores work on a migrated copy of the backup.
  - Replacing data happens in one transaction, after a safety backup.
- **Derived values are never stored:** task focus time, statistics and planner totals are
  calculated from focus sessions every time.
- **Time:** timestamps are stored in UTC. Calendar dates and statistics use local days.

## Design

- Type: Fraunces for page titles, numbers and the timer, and Schibsted Grotesk for the
  interface. Both are bundled for offline use.
- Colour: blue-leaning dark (the default) and a cool light theme. Iris marks focus and tide
  marks breaks. Subject colours come from a palette checked for colour-blind separation on
  both themes.

## Status and known limitations

All six phases of the specification are implemented.

- **Translations:** only English ships. The i18n layer (`src/renderer/src/i18n/`) and
  right-to-left support are in place. Navigation and Settings use it; the other views still
  have inline English strings to move into the catalogue before adding Arabic or French.
- **Platforms tested:** the DEB and RPM were installed and smoke-tested in clean Ubuntu 22.04
  and Fedora 41 containers. The Windows installer can only be built on Windows (or with Wine),
  so it has not been built or run yet; the CI workflow builds, installs and smoke-tests it.
  Ubuntu 24.04 is untested. macOS is configured but not built.
- **Updates:** in-app installs exist only on Windows. Linux users get a notice with a link and
  the install command. The Windows update path is checked in CI (metadata, install and smoke
  test) but has not been exercised end to end, because that needs two published releases.
- **No code signing:** Windows SmartScreen shows "unknown publisher", and `dnf` reports skipped
  signature checks. Signing needs certificates, which cost money and were out of scope.
- **License:** no license has been chosen yet. There is no LICENSE file, package.json has no
  `license` field, and the website footer says "License not chosen yet". Add one before
  publishing if you want others to be able to reuse the code.
- **Daily goal history:** goal figures in Statistics use the *current* daily goal, because
  past goal values are not stored.
- **Bundle size:** the Statistics page bundles ECharts (about 1.3 MB). It is loaded only when
  that page opens.
- **Sounds** are generated in the app and play only while the main window exists (it can be
  hidden in the tray). They are not attached to the OS notification.
