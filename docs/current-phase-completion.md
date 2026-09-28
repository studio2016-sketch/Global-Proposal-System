# WGOS current-phase completion gates

This phase is complete when the repository contains a coherent proprietary operating model and the production build passes.

## Implemented
- Multi-brand discovery and opportunity architecture.
- Deterministic commercial catalog and pricing boundaries.
- Version-bound owner proposal approval.
- Private proposal/configuration experience.
- Immutable accepted commercial snapshots.
- Agreement manifests bound to accepted snapshots.
- Replaceable signature, payment, and CRM provider contracts.
- Activation readiness checks.
- Fulfillment and change-order architecture.
- Native WGOS organizations, contacts, opportunities, projects, tasks, dependencies and automation contracts.
- Executive attention model: Decision, Approval, Exception, Opportunity.
- Executive Command Center.
- Reusable operational project templates.
- monday.com defined as an optional adapter, not the source of truth.

## Intentionally gated until infrastructure exists
The following must not be represented as production-live until their dependencies are configured:
- Durable CRM/project persistence: requires Neon/Postgres and reconciled migrations.
- Protected admin/Command Center: requires authentication and authorization.
- Real SignWell embedded signing: requires current API implementation, server-side credentials, webhook verification and event persistence.
- Real Stripe payment collection: requires provider credentials, verified/idempotent webhooks and persisted payment state.
- External CRM/project sync: requires a separately authorized Williams Global environment; the connected Garden monday account is not a valid destination.
- AI drafting/orchestration: requires structured generation, policy validation, current model selection and durable audit records.

## Production rule
Scaffolded/domain-backed behavior is not the same as activated infrastructure. A green Vercel build confirms application integrity, not that gated providers are configured.
