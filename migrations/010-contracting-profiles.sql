-- WGOS per-brand contracting identity profiles
CREATE TABLE IF NOT EXISTS wgos.contracting_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contracting_name text NOT NULL,
 legal_form text,
 jurisdiction text,
 notice_address text,
 notice_email text,
 default_signer_name text,
 default_signer_title text,
 tax_display_name text,
 complete_for_signing boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO wgos.contracting_profiles(brand_id,contracting_name)
SELECT id,name FROM wgos.brands
ON CONFLICT(brand_id) DO NOTHING;
