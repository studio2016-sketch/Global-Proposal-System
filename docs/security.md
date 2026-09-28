# Commercial security invariants

1. Public URLs use high-entropy random tokens; the database stores only token hashes.
2. Draft and internal-review proposals are never client-visible.
3. Owner approval is bound to a specific proposal version. Any commercial edit increments the version and invalidates approval.
4. Browser-submitted totals are never trusted. Server code recalculates every amount from approved catalog data.
5. Client acceptance writes an immutable snapshot containing proposal version, selections, calculated totals and a content hash.
6. Payment and signature webhooks are verified and idempotent before status transitions.
7. Proposal pages are noindex and may expire; sensitive engagements can add PIN/email verification.
8. Every material transition is appended to the event/audit log.
9. Provider secrets remain server-only environment variables and are never committed.
10. CRM handoff is downstream of accepted commercial truth; CRM data cannot silently rewrite an accepted snapshot.