-- WGOS application authorization.
-- Neon Auth proves identity; this table grants application authority.
CREATE TABLE IF NOT EXISTS wgos.app_users (
  auth_user_id text PRIMARY KEY,
  email text,
  display_name text,
  role text NOT NULL CHECK (role IN ('OWNER','ADMIN','TEAM')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_users_role_active_idx ON wgos.app_users(role,active);
