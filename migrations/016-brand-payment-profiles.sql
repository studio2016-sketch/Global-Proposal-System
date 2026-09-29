-- WGOS per-brand payment routing
CREATE TABLE IF NOT EXISTS wgos.brand_payment_profiles(
 brand_id text PRIMARY KEY REFERENCES wgos.brands(id) ON DELETE CASCADE,
 payment_mode text NOT NULL DEFAULT 'DISABLED'
   CHECK(payment_mode IN ('DIRECT_STRIPE_ACCOUNT','STRIPE_CONNECT','EXTERNAL','DISABLED')),
 currency text NOT NULL DEFAULT 'USD',
 stripe_account_id text,
 secret_env_var text,
 webhook_secret_env_var text,
 statement_descriptor text,
 complete_for_payment boolean NOT NULL DEFAULT false,
 governance_notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO wgos.brand_payment_profiles(
 brand_id,payment_mode,complete_for_payment,governance_notes
)
SELECT b.id,
       CASE WHEN bg.relationship_type='EXTERNAL_PARTNER' THEN 'EXTERNAL' ELSE 'DISABLED' END,
       false,
       CASE WHEN bg.relationship_type='EXTERNAL_PARTNER'
         THEN 'External partner payment routing is not administered by Williams/WGOS unless separately authorized.'
         ELSE 'Payment routing must be configured for this contracting identity before WGOS may create checkout.'
       END
FROM wgos.brands b
LEFT JOIN wgos.brand_governance bg ON bg.brand_id=b.id
ON CONFLICT(brand_id) DO NOTHING;
