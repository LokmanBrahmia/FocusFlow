import type { Migration } from './index'

/**
 * Initial schema.
 *
 * Conventions:
 * - IDs are UUID strings generated in the main process.
 * - Timestamps are ISO-8601 UTC strings (e.g. 2026-11-25T09:30:00.000Z).
 * - Calendar dates (scheduled_date, deadline) are local YYYY-MM-DD strings,
 *   because a deadline is a day on the user's calendar, not an instant.
 * - Derived values (task focus time, statistics) are computed from
 *   focus_sessions and never stored.
 */
export const migration001Initial: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db) => {
    db.exec(`
      CREATE TABLE subjects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
        description TEXT,
        color       TEXT,
        created_at  TEXT NOT NULL
      );

      CREATE TABLE tasks (
        id                         TEXT PRIMARY KEY,
        title                      TEXT NOT NULL CHECK (length(trim(title)) > 0),
        description                TEXT,
        subject_id                 TEXT REFERENCES subjects (id) ON DELETE SET NULL,
        priority                   TEXT NOT NULL DEFAULT 'medium'
                                   CHECK (priority IN ('low', 'medium', 'high')),
        status                     TEXT NOT NULL DEFAULT 'todo'
                                   CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
        estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes >= 0),
        scheduled_date             TEXT,
        deadline                   TEXT,
        created_at                 TEXT NOT NULL,
        updated_at                 TEXT NOT NULL,
        completed_at               TEXT
      );

      CREATE INDEX idx_tasks_status         ON tasks (status);
      CREATE INDEX idx_tasks_subject_id     ON tasks (subject_id);
      CREATE INDEX idx_tasks_scheduled_date ON tasks (scheduled_date);
      CREATE INDEX idx_tasks_deadline       ON tasks (deadline);
      CREATE INDEX idx_tasks_created_at     ON tasks (created_at);

      -- task_title keeps a snapshot so history stays readable after a task is deleted.
      CREATE TABLE focus_sessions (
        id                       TEXT PRIMARY KEY,
        task_id                  TEXT REFERENCES tasks (id) ON DELETE SET NULL,
        task_title               TEXT,
        session_type             TEXT NOT NULL
                                 CHECK (session_type IN ('focus', 'short_break', 'long_break')),
        started_at               TEXT NOT NULL,
        ended_at                 TEXT NOT NULL,
        planned_duration_seconds INTEGER NOT NULL CHECK (planned_duration_seconds > 0),
        actual_duration_seconds  INTEGER NOT NULL CHECK (actual_duration_seconds >= 0),
        status                   TEXT NOT NULL
                                 CHECK (status IN ('completed', 'stopped', 'skipped')),
        focus_rating             INTEGER CHECK (focus_rating IS NULL OR focus_rating BETWEEN 1 AND 5),
        notes                    TEXT
      );

      CREATE INDEX idx_sessions_started_at  ON focus_sessions (started_at);
      CREATE INDEX idx_sessions_task_id     ON focus_sessions (task_id);
      CREATE INDEX idx_sessions_type_status ON focus_sessions (session_type, status);

      CREATE TABLE time_blocks (
        id             TEXT PRIMARY KEY,
        task_id        TEXT REFERENCES tasks (id) ON DELETE CASCADE,
        scheduled_date TEXT NOT NULL,
        start_time     TEXT NOT NULL,
        end_time       TEXT NOT NULL,
        created_at     TEXT NOT NULL,
        CHECK (end_time > start_time)
      );

      CREATE INDEX idx_time_blocks_date ON time_blocks (scheduled_date);
      CREATE INDEX idx_time_blocks_task ON time_blocks (task_id);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
  }
}
