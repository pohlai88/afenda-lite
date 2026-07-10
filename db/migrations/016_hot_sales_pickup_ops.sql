-- Hot Sales Phase 2B — pickup / ops workflow (ADR-002)

CREATE TABLE IF NOT EXISTS hot_sales_pickup_window (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_pickup_window_event_id_idx
  ON hot_sales_pickup_window (event_id);

CREATE TABLE IF NOT EXISTS hot_sales_pickup_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES hot_sales_order(id) ON DELETE CASCADE,
  window_id UUID REFERENCES hot_sales_pickup_window(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_schedule'
    CHECK (status IN (
      'pending_schedule', 'scheduled', 'ready_for_pickup',
      'partially_picked_up', 'picked_up', 'no_show', 'cancelled', 'exception'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS hot_sales_pickup_assignment_order_id_idx
  ON hot_sales_pickup_assignment (order_id);

CREATE TABLE IF NOT EXISTS hot_sales_fulfillment_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES hot_sales_pickup_assignment(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES hot_sales_order(id) ON DELETE CASCADE,
  quantity NUMERIC(18, 2) NOT NULL,
  actor_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_fulfillment_record_order_id_idx
  ON hot_sales_fulfillment_record (order_id);

CREATE TABLE IF NOT EXISTS hot_sales_pickup_exception (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES hot_sales_pickup_assignment(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES hot_sales_order(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL
    CHECK (exception_type IN ('no_show', 'partial', 'cancel', 'override')),
  reason TEXT NOT NULL,
  actor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_pickup_exception_order_id_idx
  ON hot_sales_pickup_exception (order_id);

-- Extend order pickup_status for ops states (additive)
ALTER TABLE hot_sales_order DROP CONSTRAINT IF EXISTS hot_sales_order_pickup_status_check;
ALTER TABLE hot_sales_order ADD CONSTRAINT hot_sales_order_pickup_status_check
  CHECK (pickup_status IN (
    'pending', 'pending_schedule', 'scheduled', 'ready', 'ready_for_pickup',
    'partially_picked_up', 'picked_up', 'no_show', 'cancelled', 'exception'
  ));
