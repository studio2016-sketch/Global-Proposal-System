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


-- Reserved secure environment-variable names. These are identifiers only; no credentials live in the database.
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_STUDIO2016',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_STUDIO2016',statement_descriptor='STUDIO2016' WHERE brand_id='studio2016';
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_JERMAINE',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_JERMAINE',statement_descriptor='JERMAINE WILLIAMS' WHERE brand_id='jermaine';
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_CHARMIN',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_CHARMIN',statement_descriptor='CHARMIN GREENE' WHERE brand_id='charmin';
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_CHARMIN_JERMAINE',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_CHARMIN_JERMAINE',statement_descriptor='CHARMIN JERMAINE' WHERE brand_id='charminJermaine';
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_CG_SUCCESS',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_CG_SUCCESS',statement_descriptor='CG SUCCESS' WHERE brand_id='cgSuccess';
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_SOUND_LEGACY',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_SOUND_LEGACY',statement_descriptor='SOUND LEGACY' WHERE brand_id='soundLegacy';
UPDATE wgos.brand_payment_profiles SET secret_env_var='STRIPE_SECRET_KEY_DIONNES_BOUTIQUE',webhook_secret_env_var='STRIPE_WEBHOOK_SECRET_DIONNES_BOUTIQUE',statement_descriptor='DIONNES BOUTIQUE' WHERE brand_id='dionnesBoutique';
