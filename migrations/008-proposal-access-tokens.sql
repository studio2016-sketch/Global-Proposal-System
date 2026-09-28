-- WGOS retry-safe private proposal access
CREATE TABLE IF NOT EXISTS wgos.proposal_access_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proposal_id uuid NOT NULL REFERENCES wgos.proposals(id) ON DELETE CASCADE,
 proposal_version integer NOT NULL,
 token_hash text NOT NULL UNIQUE,
 purpose text NOT NULL DEFAULT 'CLIENT_PROPOSAL',
 created_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS proposal_access_tokens_lookup_idx ON wgos.proposal_access_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS proposal_access_tokens_proposal_idx ON wgos.proposal_access_tokens(proposal_id,proposal_version) WHERE revoked_at IS NULL;
