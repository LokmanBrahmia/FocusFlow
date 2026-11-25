/** English strings. Other languages must provide every key (enforced by the Messages type). */
export const en = {
  'nav.dashboard': 'Dashboard',
  'nav.focus': 'Focus',
  'nav.tasks': 'Tasks',
  'nav.planner': 'Planner',
  'nav.statistics': 'Statistics',
  'nav.settings': 'Settings',

  'settings.appearance': 'Appearance',
  'settings.appearance.hint': 'Dark is easier on the eyes during evening study.',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.theme.system': 'Match system',

  'settings.general': 'General',
  'settings.general.hint': 'How FocusFlow starts and closes.',
  'settings.language': 'Language',
  'settings.language.hint': 'Arabic and French are planned.',
  'settings.window': 'When FocusFlow opens',
  'settings.window.remember': 'Same size and position as last time',
  'settings.window.maximized': 'Maximised',
  'settings.window.default': 'Default size',
  'settings.startup': 'Open FocusFlow when you log in',
  'settings.tray': 'Keep running in the system tray when the window is closed',
  'settings.tray.hint': 'The timer keeps going. On GNOME, tray icons need the AppIndicator extension.',

  'settings.pomodoro': 'Pomodoro',
  'settings.pomodoro.hint': 'Changes apply from the next session you start.',
  'settings.productivity': 'Productivity',
  'settings.productivity.hint': 'Targets used on the Dashboard and in Statistics.',
  'settings.goal': 'Daily focus goal',
  'settings.defaultTask': 'Default task estimate',
  'settings.streak': 'Streak day minimum',
  'settings.streak.hint': 'Focus needed for a day to count towards your streak.',

  'settings.sounds': 'Sounds',
  'settings.sounds.hint': 'Played when a session finishes.',
  'settings.notifications': 'Notifications',
  'settings.notifications.hint': 'Desktop notifications, shown even when FocusFlow is in the background.',

  'settings.data': 'Your data',
  'settings.data.hint': 'Everything stays on this computer. Keep a copy somewhere safe.',
  'settings.data.export': 'Export as JSON',
  'settings.data.import': 'Import JSON',
  'settings.data.backup': 'Back up database',
  'settings.data.restore': 'Restore backup',

  'settings.shortcuts': 'Keyboard shortcuts',
  'settings.shortcuts.hint': 'Shortcuts pause while you type in a field.',
  'settings.about': 'About',
  'settings.about.hint': 'Your data stays in one file on this computer.',
  'settings.about.logs': 'Open log folder'
} as const

export type Messages = { [K in keyof typeof en]: string }
