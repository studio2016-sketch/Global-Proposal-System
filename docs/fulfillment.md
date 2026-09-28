# Fulfillment activation

A won proposal should not be manually re-entered into operations. The accepted commercial snapshot is transformed into a fulfillment package after closing conditions are verified.

Activation requires: immutable accepted snapshot; exact proposal/version match; verified signature where required; verified required payment/deposit.

The fulfillment package contains client identity, accepted scope, quantities, one-time and recurring commercial totals, snapshot hash, source version, brand pipeline and brand-specific operational requirements.

Downstream systems may enrich operational details, but they must not silently change accepted commercial truth. Any post-sale scope change should become a documented change order or new commercial version rather than an edit to the accepted snapshot.