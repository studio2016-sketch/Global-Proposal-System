-- WGOS approved, versioned legal terms registry
CREATE TABLE IF NOT EXISTS wgos.agreement_terms(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id),
 terms_version text NOT NULL,
 title text NOT NULL,
 body text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','RETIRED')),
 approved_by_subject text,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(brand_id,terms_version)
);
CREATE INDEX IF NOT EXISTS agreement_terms_brand_status_idx
  ON wgos.agreement_terms(brand_id,status,approved_at DESC);
ALTER TABLE wgos.agreements
  ADD COLUMN IF NOT EXISTS terms_id uuid REFERENCES wgos.agreement_terms(id);
