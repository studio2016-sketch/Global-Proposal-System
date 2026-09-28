-- WGOS secure client proposal delivery
ALTER TABLE wgos.proposals
  ADD COLUMN IF NOT EXISTS public_token_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS proposals_public_token_hash_key
  ON wgos.proposals(public_token_hash)
  WHERE public_token_hash IS NOT NULL;
