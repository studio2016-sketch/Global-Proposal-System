-- WGOS idempotent project template task seeding
CREATE UNIQUE INDEX IF NOT EXISTS tasks_project_title_key
  ON wgos.tasks(project_id,title);
