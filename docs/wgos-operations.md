# WGOS native operations

WGOS owns the operational model. External project-management platforms are optional adapters.

## Core chain
Organization / Contact → Opportunity → Proposal → Accepted commercial snapshot → Agreement → Payment → Project → Tasks / Dependencies → Fulfillment → Client history.

## CRM
Organizations can be clients, prospects, venues, vendors, partners, or institutions and may relate to multiple brands. Contacts belong to organizations when appropriate but can exist independently. Opportunities are brand-specific and move through NEW, QUALIFYING, DISCOVERY, PROPOSAL, NEGOTIATION, WON, or LOST.

## Projects and work
Only won opportunities may activate projects. Projects retain links back to their opportunity and proposal so operational scope never becomes detached from the commercial source. Tasks support hierarchy, ownership, deadlines, approval requirements, and explicit dependencies.

A task is runnable only when it is READY and all declared dependencies are DONE.

## Automations
Automation rules react to business events and may create routine tasks, update workflow state, request approval, create executive-attention items, or initiate templated communications.

Automations must never bypass an approval gate. A task marked as requiring approval cannot auto-advance through the authority boundary.

## monday.com boundary
monday.com may later receive synchronized projects/tasks for teams that prefer it. It is not the WGOS source of truth. monday identifiers belong in integration-link records rather than core domain identity. No WGOS behavior should require monday to be available.

## Persistence
These contracts are currently domain scaffolding. Production persistence belongs in Neon/Postgres after schema reconciliation and authentication. Until then, do not treat these types as durable CRM records.
