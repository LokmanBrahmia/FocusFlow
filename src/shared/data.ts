/** Export file format and the summaries shown before data is replaced. */

export const EXPORT_FORMAT = 'focusflow-export'
export const EXPORT_VERSION = 1

export type Row = Record<string, string | number | null>

export interface ExportFile {
  format: typeof EXPORT_FORMAT
  version: number
  schemaVersion: number
  exportedAt: string
  appVersion: string
  data: {
    subjects: Row[]
    tasks: Row[]
    focusSessions: Row[]
    timeBlocks: Row[]
    settings: Record<string, unknown>
  }
}

export interface DataCounts {
  subjects: number
  tasks: number
  sessions: number
  blocks: number
}

/** What the user confirms before their data is replaced. */
export interface ReplacePreview {
  token: string
  kind: 'import' | 'restore'
  fileName: string
  incoming: DataCounts
  current: DataCounts
  /** When the file was exported (imports only). */
  createdAt: string | null
  /** Settings entries ignored because they were invalid or unknown. */
  skippedSettings: number
}

export interface FileResult {
  /** False when the user cancelled the file dialog. */
  saved: boolean
  path?: string
}

export interface ReplaceResult {
  /** Copy of the previous data, taken automatically before replacing it. */
  safetyBackup: string
  counts: DataCounts
}
