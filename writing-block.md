# FocusFlow — Desktop Pomodoro & Study Planner

## 1. Project Overview

Build a modern, lightweight, offline-first desktop application for personal productivity, Pomodoro time management, and study planning.

The application is designed primarily for students who need to organize their study sessions, manage academic tasks, track their productivity, and analyze their study habits.

The application must run on Linux (Fedora), Windows, and macOS.

### Technology Stack

- **Frontend:** Vue 3, TypeScript, Vite
- **Desktop framework:** Electron.js
- **Build tooling:** electron-vite
- **UI framework:** Tailwind CSS
- **Component library:** shadcn-vue, where appropriate
- **Icons:** Lucide Vue
- **State management:** Pinia
- **Routing:** Vue Router
- **Database:** SQLite
- **Database driver:** better-sqlite3, running exclusively in the Electron main process
- **Charts:** Apache ECharts or a suitable Vue charting library
- **Date utilities:** date-fns
- **Testing:** Vitest and Playwright, with Electron-compatible integration tests where practical

Use stable, compatible versions of these technologies. Do not introduce unnecessary frameworks or external services.

## 2. Development Objectives

The application must:

1. Provide a reliable Pomodoro timer.
2. Allow users to create and organize study tasks.
3. Allow users to plan their daily and weekly study schedules.
4. Track actual study time and completed Pomodoro sessions.
5. Provide useful productivity statistics.
6. Work entirely offline.
7. Store user data locally.
8. Provide a clean, modern, distraction-free desktop interface.
9. Support light and dark themes.
10. Be easy to extend with future features.

The application must be a functional desktop product, not just a frontend prototype.

## 3. Application Structure

Create the following main pages:

- Dashboard
- Focus
- Tasks
- Planner
- Statistics
- Settings

The application should use a persistent sidebar on desktop, with a compact layout when the window is narrow.

The default window size should be approximately 1280 × 800 pixels.

The application must also support a compact floating timer window that can remain visible above other windows.

## 4. Dashboard

The Dashboard is the main application page.

It should display:

### Daily Summary

- Total focus time today.
- Number of completed Pomodoro sessions.
- Number of completed tasks.
- Daily study goal progress.
- Current productivity streak.

### Today's Tasks

Display tasks scheduled for today.

Each task should show:

- Task title.
- Associated subject or project.
- Priority.
- Estimated duration.
- Completed duration.
- Completion status.

Allow the user to start a focus session directly from a task.

### Quick Actions

Provide buttons for:

- Start a focus session.
- Add a new task.
- Open today's planner.
- View productivity statistics.

### Daily Goal

Allow the user to configure a daily focus goal, such as 120 minutes.

Display progress toward the goal using a circular progress indicator or progress bar.

Do not count break time toward the daily focus goal.

## 5. Pomodoro Timer

The Pomodoro timer is the application's core feature.

### Default Configuration

- Focus duration: 25 minutes.
- Short break: 5 minutes.
- Long break: 15 minutes.
- Long break interval: Every 4 completed focus sessions.

All durations must be configurable in Settings.

### Timer Interface

Display:

- Large circular countdown.
- Current session type.
- Associated task.
- Remaining time.
- Current Pomodoro cycle.
- Start/Pause button.
- Resume button.
- Skip session button.
- Reset timer button.
- End session button.

The interface should clearly distinguish between focus sessions and breaks.

### Timer Behavior

The timer must support:

1. Starting a focus session.
2. Pausing a running session.
3. Resuming a paused session.
4. Skipping a focus session or break.
5. Resetting the current session.
6. Automatically starting a break after a completed focus session, if enabled.
7. Automatically starting the next focus session after a break, if enabled.
8. Displaying a desktop notification when a session ends.
9. Playing a configurable completion sound.
10. Persisting the current session state when the application closes.

### Important Timer Implementation Requirements

Do not implement the timer by simply decrementing a counter every second.

Use timestamps to calculate the remaining duration.

For example:

- Store the session start timestamp.
- Store the session duration.
- Store the accumulated paused duration.
- Store the session status.
- Calculate the remaining time using the current timestamp and the stored session data.

This prevents the timer from drifting when the application is minimized, suspended, or under heavy CPU load.

The timer must continue to represent the correct remaining time when:

- The application window is minimized.
- The application is in the background.
- The user switches to another application.
- The operating system temporarily suspends the application.

Use a reliable main-process timer or deadline-based mechanism to detect session completion.

The renderer must not be the sole authority for timer state.

### Session Completion

When a focus session finishes:

- Save the session in the database.
- Update the associated task's completed focus duration.
- Update the daily productivity statistics.
- Increment the completed Pomodoro count.
- Display a desktop notification.
- Play the completion sound if enabled.
- Transition to the next session according to the configured rules.

Prevent duplicate session records if the completion event is triggered more than once.

### Session History

Every completed focus session must be associated with:

- Session ID.
- Task ID, if applicable.
- Start time.
- End time.
- Duration.
- Session type.
- Completion status.

Do not count incomplete or skipped sessions as completed Pomodoro sessions.

If a session is stopped early, preserve the actual focus duration.

## 6. Task Management

Create a complete task management system.

### Task Properties

Each task should contain:

- Unique ID.
- Title.
- Description.
- Subject or project.
- Priority.
- Status.
- Estimated duration in minutes.
- Actual focus duration in minutes.
- Optional deadline.
- Optional scheduled date.
- Creation timestamp.
- Updated timestamp.
- Completion timestamp.

### Task Statuses

- To Do
- In Progress
- Completed
- Cancelled

### Task Priorities

- Low
- Medium
- High

### Task Features

Users must be able to:

- Create tasks.
- Edit tasks.
- Delete tasks.
- Mark tasks as completed.
- Change task priority.
- Assign tasks to a subject or project.
- Set deadlines.
- Estimate the required time.
- Start a Pomodoro session for a task.
- Filter tasks by status, priority, and subject.
- Search tasks by title.
- Sort tasks by deadline, priority, or creation date.

Ask for confirmation before permanently deleting a task.

Deleting a task must not delete its historical focus sessions. Historical records should remain available even if the associated task is deleted.

### Task Progress

Display task progress using completed focus time versus estimated duration.

For example:

A task estimated at 120 minutes with 60 minutes of completed focus time should show 50% progress.

Do not automatically mark a task as completed just because the estimated duration has been reached.

## 7. Subjects and Projects

Allow users to organize tasks into subjects or projects.

Examples:

- Machine Learning
- Computer Networks
- Artificial Intelligence
- Personal Projects
- Reading
- Research

Each subject should have:

- ID.
- Name.
- Optional description.
- Optional color.
- Creation timestamp.

Users must be able to:

- Create subjects.
- Edit subjects.
- Delete subjects.
- Assign tasks to subjects.
- View tasks associated with a subject.
- View total focus time spent on a subject.

Deleting a subject should not delete its tasks or historical focus sessions.

Instead, allow the user to reassign its tasks or leave them unassigned.

## 8. Daily and Weekly Planner

Create a planner for organizing study time.

### Daily Planner

Display:

- Today's scheduled tasks.
- Task deadlines.
- Planned study sessions.
- Daily focus goal.
- Actual focus time.
- Remaining planned tasks.

Allow users to schedule tasks for a specific date.

### Weekly Planner

Display the seven days of the selected week.

For each day, show:

- Scheduled tasks.
- Planned study duration.
- Actual focus duration.
- Daily completion percentage.

Allow users to navigate between weeks.

### Time Blocking

Allow users to create optional study blocks with:

- Task.
- Start time.
- End time.
- Date.

Time blocks should not require the user to run a Pomodoro session.

The planner is for scheduling; the Pomodoro timer is for tracking actual focus.

The application must clearly distinguish planned time from actual time.

## 9. Productivity Statistics

Create a Statistics page with interactive charts.

### Daily Statistics

Display:

- Total focus time.
- Completed Pomodoro sessions.
- Completed tasks.
- Daily goal completion percentage.

### Weekly Statistics

Display:

- Focus time per day.
- Completed sessions per day.
- Tasks completed per day.
- Most productive day of the week.

### Subject Statistics

Display:

- Total focus time per subject.
- Percentage of total study time spent on each subject.
- Number of completed tasks per subject.

### Productivity Trends

Display:

- Average daily focus time.
- Average focus session duration.
- Daily goal completion rate.
- Current and longest study streak.

### Statistics Filters

Allow users to filter statistics by:

- Today.
- Last 7 days.
- Last 30 days.
- This month.
- Custom date range.

All statistics must be calculated from actual database records.

Do not generate fake statistics or placeholder values in the production application.

If there is no historical data, show a meaningful empty state.

## 10. Focus Analytics

Add a simple focus quality tracking feature.

After a completed focus session, optionally ask the user:

"How focused were you during this session?"

Allow a rating from 1 to 5.

Also allow an optional note.

Store this information with the focus session.

Display:

- Average focus rating.
- Focus ratings over time.
- Focus quality by subject.
- Focus quality by time of day.

The rating prompt must be optional and must not interrupt the timer.

## 11. Floating Mini Timer

Create a separate compact Electron window.

The floating timer should display:

- Current session type.
- Remaining time.
- Current task title.
- Pause/Resume button.
- Return to main application button.

Requirements:

- Always-on-top mode.
- Transparent or minimal background.
- Compact dimensions.
- Draggable window.
- No unnecessary interface elements.
- Synchronization with the main timer state.

The floating timer must not create a second independent timer.

Both windows must use the same authoritative timer state managed by the Electron main process.

## 12. Notifications and Sounds

Provide desktop notifications for:

- Focus session completion.
- Break completion.
- Daily goal completion.

Allow the user to enable or disable each notification type.

Provide configurable sounds for:

- Focus completion.
- Break completion.

The application must respect operating system notification permissions.

If notifications are unavailable, the application should continue working without crashing.

## 13. Settings

Create a Settings page with the following sections.

### General

- Application theme: Light, Dark, System.
- Application language: English, with architecture prepared for future Arabic and French translations.
- Launch on system startup, if supported.
- Close-to-tray behavior, if supported.
- Default application window behavior.

### Pomodoro

- Focus duration.
- Short break duration.
- Long break duration.
- Long break interval.
- Auto-start breaks.
- Auto-start focus sessions.
- Sound preferences.

### Productivity

- Daily focus goal.
- Default task duration.
- Study streak configuration.

### Data

- Export data.
- Import data.
- Create a database backup.
- Restore from a backup.

All settings must persist after application restart.

## 14. Database Design

Use SQLite with migrations.

The database must be created in Electron's user data directory.

Do not store the database inside the application installation directory.

Create the following tables.

### tasks

- id
- title
- description
- subject_id
- priority
- status
- estimated_duration_minutes
- scheduled_date
- deadline
- created_at
- updated_at
- completed_at

### subjects

- id
- name
- description
- color
- created_at

### focus_sessions

- id
- task_id
- session_type
- started_at
- ended_at
- planned_duration_seconds
- actual_duration_seconds
- status
- focus_rating
- notes

### time_blocks

- id
- task_id
- scheduled_date
- start_time
- end_time
- created_at

### settings

- key
- value

### Database Requirements

- Use foreign keys.
- Use appropriate indexes.
- Use parameterized SQL queries.
- Use transactions for operations that modify multiple records.
- Store timestamps in a consistent format.
- Use UTC timestamps internally and convert them to local time for display.
- Use database migrations for schema changes.
- Handle database errors gracefully.

Do not store derived statistics when they can be calculated reliably from the source records.

## 15. Electron Architecture

Use a secure Electron architecture.

### Main Process

Responsible for:

- Creating and managing application windows.
- Managing the authoritative Pomodoro timer.
- Managing notifications.
- Managing application lifecycle.
- Opening and managing the SQLite database.
- Handling database operations.
- Handling secure IPC communication.

### Preload Script

Responsible for exposing a limited, typed API to the renderer.

The preload script must not expose unrestricted Node.js APIs.

### Renderer

Responsible for:

- Vue interface.
- UI interactions.
- Rendering application state.
- Calling the exposed preload API.
- Displaying database results.
- Managing frontend presentation state.

### Security Requirements

Use:

- contextIsolation: true
- nodeIntegration: false
- sandbox: true, where compatible with the selected architecture.

Do not expose `ipcRenderer` directly to the renderer.

Do not expose unrestricted filesystem access.

Do not expose unrestricted shell execution.

Use explicit IPC channels.

Validate IPC arguments in the main process.

Only allow expected navigation and local application resources.

Use a Content Security Policy appropriate for Electron production builds.

Do not use remote code execution or remote web content.

## 16. IPC API

Create a typed API in the preload script.

Example:

```typescript
interface DesktopAPI {
  timer: {
    start(taskId?: string): Promise<TimerState>;
    pause(): Promise<TimerState>;
    resume(): Promise<TimerState>;
    skip(): Promise<TimerState>;
    reset(): Promise<TimerState>;
    getState(): Promise<TimerState>;
    onStateChange(
      callback: (state: TimerState) => void
    ): () => void;
  };

  tasks: {
    getAll(): Promise<Task[]>;
    getById(id: string): Promise<Task | null>;
    create(data: CreateTaskInput): Promise<Task>;
    update(id: string, data: UpdateTaskInput): Promise<Task>;
    delete(id: string): Promise<void>;
  };

  subjects: {
    getAll(): Promise<Subject[]>;
    create(data: CreateSubjectInput): Promise<Subject>;
    update(id: string, data: UpdateSubjectInput): Promise<Subject>;
    delete(id: string): Promise<void>;
  };

  sessions: {
    getAll(): Promise<FocusSession[]>;
    getStatistics(range: DateRange): Promise<Statistics>;
  };

  settings: {
    getAll(): Promise<Record<string, unknown>>;
    update(key: string, value: unknown): Promise<void>;
  };

  app: {
    getVersion(): Promise<string>;
    openMiniTimer(): Promise<void>;
    closeMiniTimer(): Promise<void>;
  };
}
```

This is an example contract, not a complete implementation.

Extend it as needed, but maintain strict TypeScript types.

The renderer must not access SQLite directly.

The renderer must not directly access Node.js filesystem APIs.

The renderer must not manage an independent Pomodoro timer.

## 17. Frontend Architecture

Use Vue 3 Composition API and `<script setup lang="ts">`.

Use Pinia for shared frontend state.

Use Vue Router for navigation.

Use reusable components.

Suggested components:

- AppSidebar
- AppHeader
- PomodoroTimer
- TimerControls
- TaskCard
- TaskForm
- TaskList
- SubjectSelector
- DailyGoalProgress
- StatisticsCard
- FocusChart
- WeeklyPlanner
- MiniTimer
- EmptyState
- ConfirmDialog
- NotificationSettings

Suggested Pinia stores:

- useTimerStore
- useTaskStore
- useSubjectStore
- useSettingsStore
- useStatisticsStore

Keep database access in dedicated frontend services that call the preload API.

Do not put SQL queries inside Vue components.

Do not create giant Vue components containing all application logic.

## 18. Suggested Project Structure

```text
focusflow/
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
├── PROJECT_SPEC.md
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── windows/
│   │   │   ├── mainWindow.ts
│   │   │   └── miniTimerWindow.ts
│   │   ├── timer/
│   │   │   ├── timerService.ts
│   │   │   └── timerTypes.ts
│   │   ├── database/
│   │   │   ├── database.ts
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   ├── ipc/
│   │   │   └── handlers.ts
│   │   └── notifications/
│   │       └── notificationService.ts
│   ├── preload/
│   │   ├── index.ts
│   │   └── api.d.ts
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.ts
│           ├── App.vue
│           ├── router/
│           ├── stores/
│           ├── services/
│           ├── components/
│           ├── layouts/
│           ├── views/
│           ├── types/
│           ├── utils/
│           └── assets/
├── tests/
└── README.md
```

You may adjust this structure when necessary, but maintain clear separation between the main process, preload, renderer, database, and business logic.

## 19. UI and Design Requirements

The application should have a premium, modern productivity-app appearance.

### Visual Style

- Minimalist.
- Calm.
- Professional.
- Distraction-free.
- Dark mode as the default theme.
- Light mode as an alternative.

Use a restrained color palette.

Suggested colors:

- Background: #0B0D12
- Surface: #151922
- Primary accent: #7C5CFC
- Secondary accent: #38BDF8
- Success: #22C55E
- Primary text: #F3F4F6
- Secondary text: #9CA3AF

Use these as starting values, not mandatory fixed colors.

### Layout

- Sidebar navigation.
- Clear page hierarchy.
- Consistent spacing.
- Rounded cards.
- Subtle borders.
- Smooth transitions.
- Large, readable timer.
- Responsive desktop layout.

### Interaction

- Keyboard shortcuts.
- Hover and focus states.
- Loading states.
- Empty states.
- Confirmation dialogs for destructive actions.
- Toast notifications for successful operations and recoverable errors.

Avoid excessive animations and visual clutter.

Do not use emojis as the primary application icons.

Use Lucide icons consistently.

## 20. Keyboard Shortcuts

Implement the following shortcuts:

- Space: Start/Pause timer.
- Ctrl/Cmd + Shift + F: Start a focus session.
- Ctrl/Cmd + N: Create a new task.
- Ctrl/Cmd + 1: Open Dashboard.
- Ctrl/Cmd + 2: Open Focus.
- Ctrl/Cmd + 3: Open Tasks.
- Ctrl/Cmd + 4: Open Statistics.
- Escape: Close dialogs or cancel the current interaction.

Shortcuts must not trigger while the user is typing in an input, textarea, or editable field.

Document all shortcuts in Settings.

## 21. Data Export and Backup

Allow users to export their data as JSON.

The export should include:

- Tasks.
- Subjects.
- Focus sessions.
- Time blocks.
- Settings.

Allow importing a previously exported JSON file.

Validate imported data before writing it to the database.

Provide an explicit confirmation before replacing existing data.

Allow users to create a backup of the SQLite database.

The backup process must not copy a partially written database or corrupt the active database.

Use SQLite's backup functionality or an equivalent safe method.

## 22. Performance Requirements

- The application must start quickly.
- Database operations must not block the UI.
- The timer must remain accurate when the application is in the background.
- The application must not continuously consume excessive CPU resources.
- Charts must handle several thousand historical sessions.
- The application must remain usable with thousands of tasks and focus sessions.
- Use pagination or virtual scrolling if large lists become slow.
- Avoid unnecessary database queries.
- Avoid unnecessary Vue component re-renders.

## 23. Error Handling

Implement graceful handling for:

- Database initialization errors.
- Database migration failures.
- Invalid user input.
- Invalid imported files.
- Failed database operations.
- Notification permission failures.
- Invalid or corrupted settings.
- Unexpected application shutdown.
- Missing task references.
- Timer state recovery after restart.

Do not silently discard user data.

Show meaningful error messages to the user.

Log technical errors in a development-friendly way without exposing sensitive information.

## 24. Testing Requirements

Write tests for critical functionality.

### Timer Tests

- Starting a session.
- Pausing and resuming.
- Calculating remaining time.
- Completing a session.
- Skipping a session.
- Resetting a session.
- Recovering timer state after restart.
- Preventing duplicate completion records.
- Switching between focus and break sessions.

### Database Tests

- Creating tasks.
- Updating tasks.
- Deleting tasks.
- Creating subjects.
- Saving completed sessions.
- Calculating focus duration.
- Calculating statistics.
- Importing and exporting data.

### UI Tests

- Creating a task.
- Starting a Pomodoro session.
- Navigating between pages.
- Updating settings.
- Completing a task.
- Opening the floating timer.

## 25. Build and Distribution

The application must support development and production builds.

Provide scripts for:

- Development mode.
- Type checking.
- Linting.
- Unit tests.
- Production build.
- Packaging for Linux.
- Packaging for Windows.
- Packaging for macOS.

The primary development environment is Fedora Linux.

The application must support creating a Linux AppImage or another suitable Linux distribution package.

Use Electron Builder or another compatible packaging tool.

Ensure native dependencies such as better-sqlite3 are correctly rebuilt for the Electron version.

Do not assume that a package installed through npm will automatically work in a packaged Electron application.

Test the production build, not only the development server.

## 26. Implementation Plan

Build the application in phases.

### Phase 1 — Foundation

- Initialize Electron, Vue, TypeScript, and Vite.
- Configure Electron main and preload processes.
- Configure secure IPC.
- Configure Tailwind CSS.
- Create the application layout.
- Create the navigation system.
- Configure SQLite.
- Implement database migrations.

### Phase 2 — Core Pomodoro

- Implement the main-process timer service.
- Implement timer state persistence.
- Implement the Focus page.
- Implement the floating timer.
- Implement notifications.
- Test timer accuracy and recovery.

### Phase 3 — Task Management

- Implement task CRUD operations.
- Implement subject management.
- Implement task priorities and statuses.
- Implement task filtering and search.
- Connect tasks to focus sessions.

### Phase 4 — Planner

- Implement daily planning.
- Implement weekly planning.
- Implement time blocks.
- Implement planned versus actual time tracking.

### Phase 5 — Statistics

- Implement daily statistics.
- Implement weekly statistics.
- Implement subject statistics.
- Implement productivity charts.
- Implement focus quality tracking.

### Phase 6 — Finalization

- Implement settings.
- Implement keyboard shortcuts.
- Implement import/export.
- Implement backups.
- Add error handling.
- Complete tests.
- Package the application.
- Verify the production build on Fedora.

Do not begin implementing all phases simultaneously.

Complete each phase, verify it, and then continue.

## 27. Definition of Done

The project is complete when:

1. The application launches as a desktop application.
2. The application works without an internet connection.
3. The Pomodoro timer works reliably.
4. The timer remains accurate when the application is minimized.
5. The timer state survives application restart.
6. Tasks and subjects can be created, edited, and deleted.
7. Focus sessions are correctly associated with tasks.
8. Actual study time is tracked accurately.
9. Daily and weekly statistics display real data.
10. The floating timer works independently as a window but shares the main timer state.
11. Settings persist across restarts.
12. Data export and backup work correctly.
13. The application builds successfully for Fedora Linux.
14. No critical TypeScript errors remain.
15. No critical security issues remain.
16. All core workflows have been tested.

## 28. Instructions for Claude

You are the senior software engineer responsible for implementing this project.

Build the actual working application, not merely a plan, tutorial, or UI mockup.

### Before Writing Code

1. Inspect the existing project directory.
2. Determine whether the project already contains code.
3. Preserve existing working code unless a change is necessary.
4. Identify missing dependencies and configuration.
5. Propose a concise implementation plan.
6. Identify any technical incompatibilities before proceeding.

### During Implementation

- Work directly in the project files.
- Use Vue 3 Composition API.
- Use strict TypeScript.
- Follow the Electron security architecture.
- Keep the timer logic in the Electron main process.
- Keep database operations in the main process.
- Use IPC for communication between the renderer and main process.
- Keep components modular and reusable.
- Use a consistent design system.
- Avoid unnecessary dependencies.
- Avoid placeholder functionality.
- Avoid fake statistics and hardcoded production data.
- Avoid `any` unless absolutely necessary.
- Avoid disabling TypeScript checks to make the project compile.
- Do not expose Node.js APIs to the renderer.
- Do not store sensitive or user data in localStorage when SQLite is appropriate.
- Do not implement an AI assistant in the initial version.

### Working Method

Implement one phase at a time.

For each phase:

1. Explain briefly what you are implementing.
2. Create or modify the required files.
3. Run the relevant checks.
4. Fix errors before continuing.
5. Explain what was completed.
6. Identify the next phase.

Do not stop after generating the project structure.

Do not stop after implementing the frontend.

Do not stop after creating the database.

Continue until the application is functional and the core acceptance criteria are satisfied.

If a technical issue prevents implementation, explain the issue and propose a practical solution instead of silently omitting the feature.

### Final Deliverables

Provide:

- Complete source code.
- Working Electron desktop application.
- SQLite database initialization and migrations.
- Secure IPC implementation.
- Functional Pomodoro timer.
- Functional task management.
- Functional daily and weekly planner.
- Functional statistics.
- Application settings.
- Tests for critical functionality.
- README.md with setup and usage instructions.
- Build and packaging instructions for Fedora Linux.
- A summary of completed features and any remaining limitations.

Begin by inspecting the current project directory and preparing the development environment. Then implement Phase 1 and continue through the remaining phases.