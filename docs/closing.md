# Agreement and closing orchestration

The Global Proposal System owns the agreement experience. The signature vendor is a replaceable trust/execution layer, not the client-facing workflow.

## Commercial chain of custody
1. Client configures an owner-approved proposal.
2. Acceptance creates an immutable snapshot with recursive canonical serialization and SHA-256 content hash.
3. The system generates an AgreementManifest bound to the exact proposal version and acceptance snapshot hash.
4. The agreement content is versioned and hashed before signature.
5. The configured SignatureProvider opens an embedded signing session. Initial production target: SignWell.
6. A verified provider webhook—not a browser redirect—moves signature state to SIGNED.
7. Stripe requests the deposit against the same acceptance snapshot hash.
8. A verified, idempotent payment webhook moves payment state to PAID.
9. Activation is allowed only when snapshot/version, verified signature, and verified payment conditions pass readiness checks.
10. CRM/fulfillment receives the immutable commercial snapshot hash for reconciliation.

## Ownership boundary
Our application owns proposal composition, pricing, agreement text/templates, branding, versioning, acceptance, lifecycle state, reminders, payment orchestration, CRM handoff, and audit history.

The signature provider owns embedded signature execution, signer evidence, provider audit/certificate artifacts, tamper-evidence capabilities supplied by the provider, and signature completion webhooks.

Do not silently substitute provider terms or pricing for our commercial authority. A provider outage must not mutate an accepted agreement. A new agreement version requires a new hash and signature event.

## Production requirements
Store raw provider secrets only in server-side environment variables. Verify webhook signatures against the raw request body. Persist provider event IDs and reject duplicate processing. Preserve the provider's completion certificate/audit artifact alongside our AgreementManifest and accepted snapshot.