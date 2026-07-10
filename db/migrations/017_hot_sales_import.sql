-- Hot Sales Phase 2C — Excel import pipeline (ADR-003)

CREATE TABLE IF NOT EXISTS hot_sales_import_batch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL
    CHECK (import_type IN (
      'customer_priority',
      'product_supply',
      'bulk_order',
      'deposit_record',
      'pickup_confirmation'
    )),
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'dry_run'
    CHECK (status IN ('dry_run', 'committed', 'cancelled', 'failed')),
  actor_id UUID NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  valid_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_import_batch_event_id_idx
  ON hot_sales_import_batch (event_id);

CREATE INDEX IF NOT EXISTS hot_sales_import_batch_status_idx
  ON hot_sales_import_batch (event_id, status);

CREATE TABLE IF NOT EXISTS hot_sales_import_row (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES hot_sales_import_batch(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  write_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (write_status IN ('pending', 'committed', 'skipped', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS hot_sales_import_row_batch_id_idx
  ON hot_sales_import_row (batch_id);
