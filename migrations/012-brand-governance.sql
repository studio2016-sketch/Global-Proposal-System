-- WGOS brand governance and ownership/agency boundaries
CREATE TABLE IF NOT EXISTS wgos.brand_governance(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 relationship_type text NOT NULL DEFAULT 'CONTROLLED'
   CHECK(relationship_type IN ('CONTROLLED','EXTERNAL_PARTNER','CLIENT','OTHER')),
 ownership_claimed boolean NOT NULL DEFAULT true,
 planned_legal_form text,
 external_principal_name text,
 may_bind_brand boolean NOT NULL DEFAULT false,
 governance_notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO wgos.brand_governance(
 brand_id,relationship_type,ownership_claimed,planned_legal_form,may_bind_brand,governance_notes
)
SELECT id,'CONTROLLED',true,'LLC',false,
 'Planned formalization as an independent LLC. Do not represent LLC status until formation is legally verified.'
FROM wgos.brands
ON CONFLICT(brand_id) DO NOTHING;

UPDATE wgos.brand_governance
SET relationship_type='EXTERNAL_PARTNER',
    ownership_claimed=false,
    planned_legal_form=NULL,
    may_bind_brand=false,
    governance_notes='Bass One Basses is an external partner brand. Jermaine Williams has a partnership relationship with Bass One Basses. Williams and WGOS are developing website and systems but claim no ownership and no authority to bind Bass One absent separate written authorization.',
    updated_at=now()
WHERE brand_id='bassOne';
