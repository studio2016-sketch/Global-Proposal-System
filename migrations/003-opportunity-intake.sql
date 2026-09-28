-- Bridge the public discovery model into the normalized WGOS opportunity pipeline.
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS legacy_key text UNIQUE;
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS discovery jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS recommendation jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS legacy_status text;
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE wgos.opportunities ADD COLUMN IF NOT EXISTS contact_email text;
