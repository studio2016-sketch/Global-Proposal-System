# Closing orchestration

Client configuration and client acceptance are separate events.

Acceptance creates an immutable commercial snapshot containing the exact proposal version, selected/required items, authoritative totals, deposit, client identity, timestamp and SHA-256 content hash. Contracts, payment requests and CRM handoff must reference this snapshot.

Closing sequence: CLIENT_APPROVED -> SIGNATURE_PENDING -> SIGNED -> PAYMENT_PENDING -> PAID -> ACTIVATED.

Provider callbacks/webhooks are authoritative for signature/payment completion. A browser redirect is not proof of signature or payment. Webhooks must be verified and idempotent before state changes.

Activation occurs only after required closing conditions are satisfied. CRM/project creation receives the accepted snapshot hash so downstream records can be reconciled to the commercial truth.