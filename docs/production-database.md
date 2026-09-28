# WGOS production database

Neon project: WGOS. PostgreSQL 18. The production schema is `wgos`.

## Authority boundary
Neon Auth owns authentication identity. `wgos.app_users` independently grants WGOS roles: OWNER, ADMIN, TEAM. Authentication alone never grants administrative access.

## Public intake
Website discovery is persisted to `wgos.opportunities`. The discovery and recommendation JSON preserve the commercial discovery model while normalized fields support CRM/pipeline operations.

## Operational source of truth
Organizations, contacts, opportunities, proposals, accepted snapshots, agreements, payments, projects, tasks, dependencies, automation rules, integration links, provider events and audit events live in Neon.

## Migration discipline
Production schema changes must be represented in source-controlled migrations. Never commit connection strings, provider keys, passwords, cookie secrets or webhook secrets.
