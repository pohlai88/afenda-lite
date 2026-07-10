-- Phase 2C-4 gap close: event.closing_soon + deposit.pending

INSERT INTO hot_sales_notification_event (event_key, channel, enabled) VALUES
  ('event.closing_soon', 'email', TRUE),
  ('deposit.pending', 'email', TRUE)
ON CONFLICT (event_key, channel) DO NOTHING;

INSERT INTO hot_sales_notification_template (event_key, locale, subject, body_markdown) VALUES
  ('event.closing_soon', 'en', 'Event {{eventName}} closes soon',
   'Hot Sales event **{{eventName}}** closes at {{closesAt}}. Submit or update orders before the deadline.'),
  ('event.closing_soon', 'vi', 'Sự kiện {{eventName}} sắp đóng',
   'Sự kiện **{{eventName}}** đóng lúc {{closesAt}}. Hoàn tất đơn hàng trước hạn.'),
  ('deposit.pending', 'en', 'Deposit pending for {{orderNumber}}',
   'Order **{{orderNumber}}** requires a deposit. Please arrange payment.'),
  ('deposit.pending', 'vi', 'Chờ cọc cho đơn {{orderNumber}}',
   'Đơn **{{orderNumber}}** cần đặt cọc. Vui lòng thanh toán.')
ON CONFLICT (event_key, locale) DO NOTHING;
