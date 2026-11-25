# FocusFlow

An offline Pomodoro timer, task manager and study planner for Linux, Windows and macOS.
Built with Electron, Vue 3, TypeScript, Tailwind CSS and SQLite. Everything is stored locally;
the app makes no network requests.

The full specification is in [writing-block.md](writing-block.md).

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
| `npm run dist:linux` | Build `dist/FocusFlow-<version>.AppImage` |
| `npm run dist:win` / `dist:mac` | Windows installer / macOS DMG (build on that OS) |

The end-to-end tests run in a temporary profile (`FOCUSFLOW_USER_DATA`), so they never touch
your data and can run while FocusFlow is open.

## Building on Fedora

```bash
sudo dnf install nodejs22 fuse fuse-libs
npm install
npm run dist:linux
./dist/FocusFlow-0.1.0.AppImage
```

- `fuse` is needed to run AppImages. Without it, run
  `./dist/FocusFlow-0.1.0.AppImage --appimage-extract-and-run`.
- **Native module:** `better-sqlite3` 13 ships N-API prebuilt binaries, so one binary works in
  Node (tests) and Electron and no `electron-rebuild` step is needed. The build sets
  `npmRebuild: false` and unpacks the module from the asar archive, where native files can't
  load. If you switch to a version without N-API prebuilds, rebuild from a path **without
  spaces**, because node-gyp fails on paths like `Study DNA`.
- **Launch at login** works from the AppImage: it writes `~/.config/autostart/focusflow.desktop`.
- **Tray icon:** stock GNOME hides tray icons. Install the *AppIndicator and KStatusNotifierItem
  Support* extension to see FocusFlow's tray icon. Closing the window to the tray still works
  without it.

## Where data lives

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
- **Platforms tested:** packaging was built and checked on Fedora (AppImage). The Windows and
  macOS targets are configured but not built or tested, and macOS builds need signing to run
  without warnings.
- **Daily goal history:** goal figures in Statistics use the *current* daily goal, because
  past goal values are not stored.
- **Bundle size:** the Statistics page bundles ECharts (about 1.3 MB). It is loaded only when
  that page opens.
- **Sounds** are generated in the app and play only while the main window exists (it can be
  hidden in the tray). They are not attached to the OS notification.
