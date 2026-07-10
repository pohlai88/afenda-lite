-- Hot Sales Phase 2D — ERP sync framework (ADR-004)

CREATE TABLE IF NOT EXISTS hot_sales_external_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  local_id TEXT NOT NULL,
  external_system TEXT NOT NULL DEFAULT 'generic-noop',
  external_id TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, local_id, external_system)
);

CREATE INDEX IF NOT EXISTS hot_sales_external_mapping_local_idx
  ON hot_sales_external_mapping (entity_type, local_id);

CREATE TABLE IF NOT EXISTS hot_sales_sync_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL
    CHECK (job_type IN ('order', 'deposit_summary', 'fulfillment_summary')),
  entity_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'dead')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS hot_sales_sync_job_status_idx
  ON hot_sales_sync_job (status, scheduled_at);

CREATE TABLE IF NOT EXISTS hot_sales_sync_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES hot_sales_sync_job(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  provider_response JSONB
);

CREATE INDEX IF NOT EXISTS hot_sales_sync_attempt_job_id_idx
  ON hot_sales_sync_attempt (job_id);

CREATE TABLE IF NOT EXISTS hot_sales_sync_error (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES hot_sales_sync_attempt(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  retryable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_sync_error_attempt_id_idx
  ON hot_sales_sync_error (attempt_id);
