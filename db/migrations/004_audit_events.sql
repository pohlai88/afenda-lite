-- Audit event log for security and mutation tracking

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_event_type_idx
  ON audit_events (event_type);

CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
  ON audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_actor_id_idx
  ON audit_events (actor_id);
