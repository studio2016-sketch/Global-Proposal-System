-- DEPRECATED REFERENCE MODEL
-- This file described the pre-WGOS proposal-only prototype and is intentionally
-- retained for historical context. It is NOT the production schema and must not
-- be applied to Neon.
--
-- Canonical production architecture:
--   migrations/001-wgos-core.sql (base schema; add when reconstructed from the
--   original production migration)
--   migrations/002-app-users.sql
--   migrations/003-opportunity-intake.sql
--   docs/production-database.md
--
-- Reference schema for managed Postgres. Apply only after a database is provisioned.
create table brands (id text primary key, name text not null, config jsonb not null default '{}');
create table clients (id uuid primary key default gen_random_uuid(), organization text not null, contact_name text, email text not null, created_at timestamptz not null default now());
create table proposals (id uuid primary key default gen_random_uuid(), public_token_hash text unique not null, brand_id text not null references brands(id), client_id uuid not null references clients(id), title text not null, status text not null, version integer not null default 1, deposit_rate numeric not null default .5, discovery jsonb not null default '{}', owner_approved_version integer, owner_approved_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table proposal_versions (id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals(id), version integer not null, content jsonb not null, pricing jsonb not null, created_at timestamptz not null default now(), unique(proposal_id,version));
create table commercial_items (id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals(id), name text not null, description text, kind text not null, unit_amount integer not null, quantity integer not null default 1, selected boolean not null default false, required boolean not null default false);
create table accepted_snapshots (id uuid primary key default gen_random_uuid(), proposal_id uuid not null references proposals(id), proposal_version integer not null, snapshot jsonb not null, content_hash text not null, accepted_at timestamptz not null default now());
create table events (id bigserial primary key, proposal_id uuid references proposals(id), type text not null, payload jsonb not null default '{}', occurred_at timestamptz not null default now());
create index events_proposal_time on events(proposal_id,occurred_at desc);