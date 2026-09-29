-- Add Dionne's Boutique to the WGOS legal/governance registry only.
INSERT INTO wgos.brands(id,name)
VALUES('dionnesBoutique','Dionne''s Boutique')
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name;

INSERT INTO wgos.contracting_profiles(brand_id,contracting_name,legal_form,complete_for_signing)
VALUES('dionnesBoutique','Dionne''s Boutique','Sole Proprietorship',false)
ON CONFLICT(brand_id) DO UPDATE
SET contracting_name=EXCLUDED.contracting_name,
    legal_form='Sole Proprietorship',
    complete_for_signing=false,
    updated_at=now();

INSERT INTO wgos.brand_governance(
  brand_id,relationship_type,ownership_claimed,planned_legal_form,may_bind_brand,governance_notes
)
VALUES(
  'dionnesBoutique','CONTROLLED',true,'LLC',false,
  'Currently operating as a sole proprietorship. Planned formalization as an independent LLC. Do not represent LLC status until formation is legally verified.'
)
ON CONFLICT(brand_id) DO UPDATE
SET relationship_type='CONTROLLED',
    ownership_claimed=true,
    planned_legal_form='LLC',
    may_bind_brand=false,
    governance_notes='Currently operating as a sole proprietorship. Planned formalization as an independent LLC. Do not represent LLC status until formation is legally verified.',
    updated_at=now();
