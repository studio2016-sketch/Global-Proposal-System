-- WGOS task updates/comments and idempotent recurring task rules
CREATE TABLE IF NOT EXISTS wgos.task_comments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES wgos.tasks(id) ON DELETE CASCADE,
 author_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS task_comments_task_created_idx
 ON wgos.task_comments(task_id,created_at);

CREATE TABLE IF NOT EXISTS wgos.recurring_task_rules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES wgos.projects(id) ON DELETE CASCADE,
 name text NOT NULL,
 title text NOT NULL,
 description text,
 group_name text NOT NULL DEFAULT 'General',
 priority text NOT NULL DEFAULT 'MEDIUM'
  CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 assignee_subject text REFERENCES wgos.app_users(auth_user_id) ON DELETE SET NULL,
 cadence text NOT NULL
  CHECK(cadence IN ('DAILY','WEEKLY','MONTHLY')),
 interval_count integer NOT NULL DEFAULT 1 CHECK(interval_count>=1),
 next_run_at timestamptz NOT NULL,
 timezone text NOT NULL DEFAULT 'America/Chicago',
 requires_approval boolean NOT NULL DEFAULT false,
 approval_role text,
 enabled boolean NOT NULL DEFAULT true,
 last_run_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_task_rules_due_idx
 ON wgos.recurring_task_rules(enabled,next_run_at);

CREATE TABLE IF NOT EXISTS wgos.recurring_task_runs(
 rule_id uuid NOT NULL REFERENCES wgos.recurring_task_rules(id) ON DELETE CASCADE,
 scheduled_for timestamptz NOT NULL,
 task_id uuid REFERENCES wgos.tasks(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(rule_id,scheduled_for)
);
