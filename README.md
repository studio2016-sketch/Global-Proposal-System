# SUPERSEDED — WGOS IS THE CANONICAL PLATFORM

**Active development moved to `studio2016-sketch/WGOS` and the WGOS.app product.**

This repository is retained as a migration/reference source for the original Global Proposal System implementation. Do not add new product functionality here. Mature modules are being consolidated into WGOS in controlled, validated slices.

Canonical operating rule: **one control plane, one active application repository, one WGOS operational data model.**

---

# Global Proposal System

A multi-brand commercial operating layer for Williams Global businesses.

## V1 principles
- Guided discovery captures structured client intent.
- AI may draft recommendations, narrative, scope and options.
- Pricing is deterministic and server-authoritative.
- No proposal can be sent without explicit owner approval.
- Accepted configurations become immutable commercial snapshots.
- Signature, payment and CRM are provider adapters, not coupled to the renderer.

## Lifecycle
DRAFT → INTERNAL_REVIEW → APPROVED_TO_SEND → SENT → VIEWED → CONFIGURED → CLIENT_APPROVED → SIGNATURE_PENDING → SIGNED → PAYMENT_PENDING → PAID → ACTIVATED

## First implementation
Studio2016 is the first deep discovery schema. Jermaine Williams is the second brand skin. Additional brand registries are already reserved.

## Next infrastructure
Persistent Postgres data model, admin authentication, AI structured generation, private tokenized proposal routes, audit/event log, e-signature adapter, payment adapter, CRM adapter and brand-site rewrites.


## Production baseline
Main is maintained as the verified deployable foundation. Advanced lifecycle modules are reintegrated only after each layer passes production build validation.
