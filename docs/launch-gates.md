# Launch gates

## Code-complete foundation
- Six-brand discovery and routing
- Deterministic catalog/pricing boundaries
- Exact-version owner approval and send guards
- Server-authoritative configuration
- Immutable acceptance snapshot design
- Signature/payment/CRM provider interfaces
- Sales follow-up rules
- Fulfillment readiness and change orders
- Secure public-token generation/hash utilities

## External activation required before real client use
1. Managed Postgres connected and migrations applied.
2. CommercialRepository implemented against the connected database.
3. Admin authentication enabled and /admin protected.
4. Secure raw-token issue / hash-only lookup enabled.
5. Acceptance snapshot persistence enabled.
6. Signature provider connected and webhook verification enabled.
7. Payment provider connected and webhook verification enabled.
8. CRM/project provider connected.
9. Brand-site rewrites enabled only after the shared engine passes end-to-end staging.
10. Privacy/consent review completed before engagement analytics are enabled.

No production UI should claim an inquiry, approval, acceptance, signature, payment or activation succeeded until the corresponding durable/provider-backed write is confirmed.