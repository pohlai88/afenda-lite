-- Feed Farm Trade Phase 2B — operational deposit records (ADR-002)

CREATE TABLE IF NOT EXISTS fft_deposit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES fft_order(id) ON DELETE CASCADE,
  amount NUMERIC(18, 2),
  currency TEXT NOT NULL DEFAULT 'VND',
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'partially_paid', 'waived', 'forfeited', 'refunded', 'cancelled')),
  non_refundable BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS fft_deposit_order_id_idx
  ON fft_deposit (order_id);

CREATE TABLE IF NOT EXISTS fft_deposit_receipt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES fft_deposit(id) ON DELETE CASCADE,
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount NUMERIC(18, 2) NOT NULL,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fft_deposit_receipt_deposit_id_idx
  ON fft_deposit_receipt (deposit_id);

CREATE TABLE IF NOT EXISTS fft_deposit_adjustment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES fft_deposit(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('waive', 'refund', 'forfeit', 'correction', 'cancelled')),
  reason TEXT NOT NULL,
  amount NUMERIC(18, 2),
  actor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fft_deposit_adjustment_deposit_id_idx
  ON fft_deposit_adjustment (deposit_id);

CREATE TABLE IF NOT EXISTS fft_finance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID REFERENCES fft_deposit(id) ON DELETE SET NULL,
  order_id UUID REFERENCES fft_order(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fft_finance_audit_order_id_idx
  ON fft_finance_audit (order_id);

CREATE INDEX IF NOT EXISTS fft_finance_audit_deposit_id_idx
  ON fft_finance_audit (deposit_id);

-- Extend order deposit_status projection enum (additive)
ALTER TABLE fft_order DROP CONSTRAINT IF EXISTS fft_order_deposit_status_check;
ALTER TABLE fft_order ADD CONSTRAINT fft_order_deposit_status_check
  CHECK (deposit_status IN (
    'not_required', 'pending', 'paid', 'partially_paid',
    'waived', 'forfeited', 'refunded', 'cancelled'
  ));
