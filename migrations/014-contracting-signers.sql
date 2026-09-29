-- WGOS verified signing-authority model
ALTER TABLE wgos.contracting_profiles
  ADD COLUMN IF NOT EXISTS signing_policy text NOT NULL DEFAULT 'SINGLE_AUTHORIZED_SIGNER'
  CHECK(signing_policy IN (
    'SOLE_PROPRIETOR',
    'SINGLE_AUTHORIZED_SIGNER',
    'ANY_AUTHORIZED_SIGNER',
    'ALL_REQUIRED_SIGNERS',
    'CUSTOM'
  ));

CREATE TABLE IF NOT EXISTS wgos.contracting_signers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 signer_name text NOT NULL,
 signer_title text,
 authority_status text NOT NULL DEFAULT 'PENDING'
   CHECK(authority_status IN ('PENDING','VERIFIED','REVOKED')),
 authority_basis text,
 required_to_sign boolean NOT NULL DEFAULT false,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracting_signers_brand_status_idx
 ON wgos.contracting_signers(brand_id,authority_status,required_to_sign);
