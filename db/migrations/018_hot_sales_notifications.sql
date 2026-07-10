-- Hot Sales Phase 2C — notification lane (ADR-003)

CREATE TABLE IF NOT EXISTS hot_sales_notification_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('vi', 'en')),
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_key, locale)
);

CREATE TABLE IF NOT EXISTS hot_sales_notification_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_key, channel)
);

CREATE TABLE IF NOT EXISTS hot_sales_notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS hot_sales_notification_delivery_entity_idx
  ON hot_sales_notification_delivery (event_key, entity_id);

-- Seed core templates (vi/en) + default enabled events
INSERT INTO hot_sales_notification_event (event_key, channel, enabled) VALUES
  ('order.submitted', 'email', TRUE),
  ('allocation.completed', 'email', TRUE),
  ('allocation.partial', 'email', TRUE),
  ('deposit.confirmed', 'email', TRUE),
  ('pickup.scheduled', 'email', TRUE),
  ('pickup.completed', 'email', TRUE)
ON CONFLICT (event_key, channel) DO NOTHING;

INSERT INTO hot_sales_notification_template (event_key, locale, subject, body_markdown) VALUES
  ('order.submitted', 'en', 'Order {{orderNumber}} registered',
   'Your order **{{orderNumber}}** for {{customerName}} has been registered.'),
  ('order.submitted', 'vi', 'Đơn hàng {{orderNumber}} đã đăng ký',
   'Đơn hàng **{{orderNumber}}** của {{customerName}} đã được đăng ký.'),
  ('allocation.completed', 'en', 'Allocation complete for {{orderNumber}}',
   'Order **{{orderNumber}}** was fully allocated ({{confirmedQuantity}} units).'),
  ('allocation.completed', 'vi', 'Phân bổ hoàn tất cho {{orderNumber}}',
   'Đơn **{{orderNumber}}** đã được phân bổ đủ ({{confirmedQuantity}} đơn vị).'),
  ('allocation.partial', 'en', 'Partial allocation for {{orderNumber}}',
   'Order **{{orderNumber}}** was partially allocated ({{confirmedQuantity}} units).'),
  ('allocation.partial', 'vi', 'Phân bổ một phần cho {{orderNumber}}',
   'Đơn **{{orderNumber}}** được phân bổ một phần ({{confirmedQuantity}} đơn vị).'),
  ('deposit.confirmed', 'en', 'Deposit received for {{orderNumber}}',
   'Deposit of {{amount}} recorded for order **{{orderNumber}}**.'),
  ('deposit.confirmed', 'vi', 'Đã nhận tiền cọc cho {{orderNumber}}',
   'Đã ghi nhận cọc {{amount}} cho đơn **{{orderNumber}}**.'),
  ('pickup.scheduled', 'en', 'Pickup scheduled for {{orderNumber}}',
   'Pickup for order **{{orderNumber}}** has been scheduled.'),
  ('pickup.scheduled', 'vi', 'Đã lên lịch lấy hàng {{orderNumber}}',
   'Đơn **{{orderNumber}}** đã được lên lịch lấy hàng.'),
  ('pickup.completed', 'en', 'Pickup completed for {{orderNumber}}',
   'Pickup for order **{{orderNumber}}** is complete ({{fulfilledQuantity}} units).'),
  ('pickup.completed', 'vi', 'Hoàn tất lấy hàng {{orderNumber}}',
   'Đơn **{{orderNumber}}** đã lấy hàng xong ({{fulfilledQuantity}} đơn vị).')
ON CONFLICT (event_key, locale) DO NOTHING;
