-- WGOS idempotent deposit creation
CREATE UNIQUE INDEX IF NOT EXISTS payments_snapshot_kind_key
  ON wgos.payments(snapshot_id,kind);
