-- WGOS native operations-board fields
ALTER TABLE wgos.tasks
  ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'MEDIUM'
    CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS tasks_board_order_idx
 ON wgos.tasks(project_id,group_name,position,created_at);

CREATE INDEX IF NOT EXISTS tasks_assignee_status_idx
 ON wgos.tasks(assignee_subject,status,due_at);
