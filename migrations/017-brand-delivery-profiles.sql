-- WGOS per-brand proposal delivery identity
CREATE TABLE IF NOT EXISTS wgos.brand_delivery_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 delivery_mode text NOT NULL DEFAULT 'DISABLED'
   CHECK(delivery_mode IN ('RESEND','EXTERNAL','DISABLED')),
 from_name text,
 from_email text,
 reply_to_email text,
 complete_for_delivery boolean NOT NULL DEFAULT false,
 governance_notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO wgos.brand_delivery_profiles(
 brand_id,delivery_mode,complete_for_delivery,governance_notes
)
SELECT b.id,
       CASE WHEN bg.relationship_type='EXTERNAL_PARTNER' THEN 'EXTERNAL' ELSE 'DISABLED' END,
       false,
       CASE WHEN bg.relationship_type='EXTERNAL_PARTNER'
         THEN 'External partner delivery identity is not administered by Williams/WGOS unless separately authorized.'
         ELSE 'A verified sender identity is required before WGOS may deliver proposals for this contracting brand.'
       END
FROM wgos.brands b
LEFT JOIN wgos.brand_governance bg ON bg.brand_id=b.id
ON CONFLICT(brand_id) DO NOTHING;
