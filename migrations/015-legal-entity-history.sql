-- Preserve legal-entity history and explicit contract transitions during LLC formation.
CREATE TABLE IF NOT EXISTS wgos.legal_entity_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand_id text NOT NULL REFERENCES wgos.brands(id) ON DELETE CASCADE,
 contracting_name text NOT NULL,
 legal_form text NOT NULL,
 jurisdiction text,
 effective_from date NOT NULL,
 effective_to date,
 status text NOT NULL DEFAULT 'PENDING'
   CHECK(status IN ('PENDING','ACTIVE','RETIRED')),
 verification_basis text,
 verified_by_subject text,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(effective_to IS NULL OR effective_to>=effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_entity_versions_one_active_per_brand
 ON wgos.legal_entity_versions(brand_id)
 WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS wgos.agreement_party_transitions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agreement_id uuid NOT NULL REFERENCES wgos.agreements(id) ON DELETE CASCADE,
 from_entity_version_id uuid REFERENCES wgos.legal_entity_versions(id),
 to_entity_version_id uuid REFERENCES wgos.legal_entity_versions(id),
 transition_type text NOT NULL
   CHECK(transition_type IN ('ASSIGNMENT','ASSUMPTION','NOVATION','OTHER')),
 status text NOT NULL DEFAULT 'DRAFT'
   CHECK(status IN ('DRAFT','EXECUTED','VOID')),
 document_reference text,
 effective_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
