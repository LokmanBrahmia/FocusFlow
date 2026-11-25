import type { Migration } from './index'

/**
 * 1. focus_sessions.subject_id: a snapshot of the task's subject when the
 *    session was recorded, so subject statistics survive task deletion.
 *    Statistics prefer the task's current subject and fall back to this.
 * 2. Subject colours move to a palette validated for colour-blind
 *    separation; the eight previous swatches map one-to-one onto it.
 */
export const migration003SessionSubject: Migration = {
  version: 3,
  name: 'session_subject_and_palette',
  up: (db) => {
    db.exec(`
      ALTER TABLE focus_sessions ADD COLUMN subject_id TEXT REFERENCES subjects (id) ON DELETE SET NULL;

      UPDATE focus_sessions
         SET subject_id = (SELECT t.subject_id FROM tasks t WHERE t.id = focus_sessions.task_id)
       WHERE task_id IS NOT NULL;

      CREATE INDEX idx_sessions_subject_id ON focus_sessions (subject_id);
      CREATE INDEX idx_tasks_completed_at ON tasks (completed_at);

      UPDATE subjects SET color = CASE upper(color)
        WHEN '#5CC8F0' THEN '#2a78d6'
        WHEN '#F08A5D' THEN '#eb6834'
        WHEN '#3ECF8E' THEN '#1baf7a'
        WHEN '#E9B949' THEN '#eda100'
        WHEN '#E46F9B' THEN '#e87ba4'
        WHEN '#6E9BF5' THEN '#008300'
        WHEN '#8F7BFF' THEN '#6250d6'
        WHEN '#A3A9B6' THEN '#e34948'
        ELSE color END;
    `)
  }
}
