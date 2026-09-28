# Persistence handoff

The application now has a storage boundary for opportunities, proposals and audit events.

## Required production resource
A managed Postgres database attached to the Vercel project with DATABASE_URL available server-side.

## Why persistence is a hard requirement
Website discovery runs in serverless infrastructure. In-memory maps are suitable only for demonstrations; they cannot be commercial truth. A prospect submission must survive deployments, cold starts and concurrent requests.

## Activation sequence
1. Provision managed Postgres through the Vercel Marketplace.
2. Attach it to global-proposal-system production and preview environments.
3. Apply docs/data-model.sql plus opportunity tables/migrations.
4. Implement the CommercialRepository Postgres adapter.
5. Switch POST /api/opportunities from preview/503 behavior to transactional persistence.
6. Append DISCOVERY_SUBMITTED event.
7. Surface the new opportunity in /admin.
8. Draft a proposal from approved catalog/rules; never from free-form AI pricing.

The API intentionally returns 503 until persistence is real. It must never tell a prospect their commercial inquiry was safely recorded when it was not.