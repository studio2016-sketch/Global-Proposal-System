# Owner control

The owner approval gate is a commercial security boundary, not a UI preference.

A proposal may be drafted by a person, rules engine, or AI. It may enter INTERNAL_REVIEW only when its scope is ready for owner review. Approval records the exact proposal version and owner identity. Any commercial revision increments the version and clears approval.

The delivery layer independently calls the send guard. Hiding a Send button is not sufficient protection; the server refuses delivery unless status is APPROVED_TO_SEND and the approval version equals the current proposal version.

Future admin authentication supplies the trusted owner identity. Client delivery must use a high-entropy token whose database representation is hashed.