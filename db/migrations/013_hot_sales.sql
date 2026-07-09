-- Hot Sales Event Engine (Phase 1) — generic, reusable schema

CREATE TABLE IF NOT EXISTS hot_sales_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'hot_sales',
  description_en TEXT,
  description_vi TEXT,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'scheduled', 'open', 'closed', 'allocating',
      'confirmed', 'completed', 'cancelled'
    )),
  source_location TEXT,
  allocation_method TEXT NOT NULL DEFAULT 'priority_fcfs',
  standalone_program BOOLEAN NOT NULL DEFAULT TRUE,
  combination_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_refundable BOOLEAN NOT NULL DEFAULT FALSE,
  support_type TEXT NOT NULL DEFAULT 'fixed_per_unit',
  support_amount_per_unit NUMERIC(18, 2),
  support_unit_label TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  cloned_from_id UUID REFERENCES hot_sales_event(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hot_sales_event_code_idx
  ON hot_sales_event (event_code);

CREATE INDEX IF NOT EXISTS hot_sales_event_status_idx
  ON hot_sales_event (status);

CREATE TABLE IF NOT EXISTS hot_sales_product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT,
  source TEXT,
  batch TEXT,
  category TEXT,
  weight TEXT,
  unit TEXT NOT NULL DEFAULT 'piece',
  tentative_quantity NUMERIC(18, 2),
  final_confirmed_quantity NUMERIC(18, 2),
  allocated_quantity NUMERIC(18, 2) NOT NULL DEFAULT 0,
  fulfilled_quantity NUMERIC(18, 2) NOT NULL DEFAULT 0,
  support_amount_per_unit NUMERIC(18, 2),
  pickup_location TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_product_event_id_idx
  ON hot_sales_product (event_id);

CREATE TABLE IF NOT EXISTS hot_sales_customer_priority (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  priority_rank INTEGER NOT NULL DEFAULT 999,
  priority_group TEXT,
  salesperson_user_id UUID,
  max_allocation NUMERIC(18, 2),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_customer_priority_event_id_idx
  ON hot_sales_customer_priority (event_id);

CREATE INDEX IF NOT EXISTS hot_sales_customer_priority_lookup_idx
  ON hot_sales_customer_priority (event_id, customer_code);

CREATE TABLE IF NOT EXISTS hot_sales_field_def (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'order'
    CHECK (entity_type IN ('event', 'product', 'order', 'customer', 'pickup')),
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL
    CHECK (field_type IN (
      'text', 'number', 'currency', 'date', 'datetime',
      'select', 'boolean', 'long_text'
    )),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  default_value TEXT,
  label_en TEXT NOT NULL,
  label_vi TEXT NOT NULL,
  help_text_en TEXT,
  help_text_vi TEXT,
  dropdown_options JSONB,
  visible_to_roles JSONB NOT NULL DEFAULT '["admin","sales"]'::jsonb,
  editable_by_roles JSONB NOT NULL DEFAULT '["admin","sales"]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, field_key)
);

CREATE INDEX IF NOT EXISTS hot_sales_field_def_event_id_idx
  ON hot_sales_field_def (event_id);

CREATE TABLE IF NOT EXISTS hot_sales_sales_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS hot_sales_allocation_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  run_by UUID NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'manual', 'rerun')),
  reason TEXT,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS hot_sales_allocation_run_event_id_idx
  ON hot_sales_allocation_run (event_id);

CREATE TABLE IF NOT EXISTS hot_sales_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hot_sales_event(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  salesperson_user_id UUID NOT NULL,
  salesperson_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  priority_rank INTEGER NOT NULL DEFAULT 999,
  priority_group TEXT,
  product_id UUID NOT NULL REFERENCES hot_sales_product(id) ON DELETE RESTRICT,
  requested_quantity NUMERIC(18, 2) NOT NULL,
  confirmed_quantity NUMERIC(18, 2),
  fulfilled_quantity NUMERIC(18, 2),
  estimated_support NUMERIC(18, 2),
  final_support NUMERIC(18, 2),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN (
      'submitted', 'registered', 'pending_allocation',
      'partial', 'full', 'rejected', 'confirmed', 'completed', 'cancelled'
    )),
  deposit_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (deposit_status IN ('not_required', 'pending', 'paid', 'waived')),
  pickup_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (pickup_status IN ('pending', 'ready', 'picked_up', 'no_show', 'cancelled')),
  transfer_status TEXT NOT NULL DEFAULT 'none'
    CHECK (transfer_status IN ('none', 'requested', 'approved', 'rejected')),
  allocation_run_id UUID REFERENCES hot_sales_allocation_run(id) ON DELETE SET NULL,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_order_event_id_idx
  ON hot_sales_order (event_id);

CREATE INDEX IF NOT EXISTS hot_sales_order_salesperson_idx
  ON hot_sales_order (salesperson_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS hot_sales_order_number_idx
  ON hot_sales_order (event_id, order_number);

CREATE TABLE IF NOT EXISTS hot_sales_transfer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES hot_sales_order(id) ON DELETE CASCADE,
  original_customer_name TEXT NOT NULL,
  original_customer_code TEXT,
  new_customer_name TEXT NOT NULL,
  new_customer_code TEXT,
  transfer_quantity NUMERIC(18, 2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected')),
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS hot_sales_transfer_order_id_idx
  ON hot_sales_transfer (order_id);

CREATE TABLE IF NOT EXISTS hot_sales_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES hot_sales_event(id) ON DELETE SET NULL,
  order_id UUID REFERENCES hot_sales_order(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_audit_event_id_idx
  ON hot_sales_audit (event_id);

CREATE INDEX IF NOT EXISTS hot_sales_audit_order_id_idx
  ON hot_sales_audit (order_id);
