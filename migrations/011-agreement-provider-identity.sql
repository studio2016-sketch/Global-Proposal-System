-- Freeze the exact contracting-party identity into each agreement
ALTER TABLE wgos.agreements
  ADD COLUMN IF NOT EXISTS provider_identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_identity_hash text;
