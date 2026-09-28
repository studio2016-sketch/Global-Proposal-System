-- WGOS permits only one active approved terms set per brand
CREATE UNIQUE INDEX IF NOT EXISTS agreement_terms_one_approved_per_brand
  ON wgos.agreement_terms(brand_id)
  WHERE status='APPROVED';
