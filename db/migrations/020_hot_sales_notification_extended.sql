-- Extended notification templates for event + transfer triggers (2C-4 gap close)

INSERT INTO hot_sales_notification_event (event_key, channel, enabled) VALUES
  ('event.opened', 'email', TRUE),
  ('event.closed', 'email', TRUE),
  ('transfer.requested', 'email', TRUE),
  ('transfer.approved', 'email', TRUE),
  ('transfer.rejected', 'email', TRUE)
ON CONFLICT (event_key, channel) DO NOTHING;

INSERT INTO hot_sales_notification_template (event_key, locale, subject, body_markdown) VALUES
  ('event.opened', 'en', 'Event {{eventName}} is open',
   'Hot Sales event **{{eventName}}** is now open for orders.'),
  ('event.opened', 'vi', 'Sự kiện {{eventName}} đã mở',
   'Sự kiện **{{eventName}}** đã mở đăng ký đơn hàng.'),
  ('event.closed', 'en', 'Event {{eventName}} closed',
   'Hot Sales event **{{eventName}}** has closed.'),
  ('event.closed', 'vi', 'Sự kiện {{eventName}} đã đóng',
   'Sự kiện **{{eventName}}** đã đóng.'),
  ('transfer.requested', 'en', 'Transfer requested for {{orderNumber}}',
   'A transfer was requested for order **{{orderNumber}}**.'),
  ('transfer.requested', 'vi', 'Yêu cầu chuyển đơn {{orderNumber}}',
   'Đã yêu cầu chuyển đơn **{{orderNumber}}**.'),
  ('transfer.approved', 'en', 'Transfer approved for {{orderNumber}}',
   'Transfer for order **{{orderNumber}}** was approved.'),
  ('transfer.approved', 'vi', 'Chuyển đơn {{orderNumber}} đã duyệt',
   'Chuyển đơn **{{orderNumber}}** đã được duyệt.'),
  ('transfer.rejected', 'en', 'Transfer rejected for {{orderNumber}}',
   'Transfer for order **{{orderNumber}}** was rejected.'),
  ('transfer.rejected', 'vi', 'Chuyển đơn {{orderNumber}} bị từ chối',
   'Chuyển đơn **{{orderNumber}}** đã bị từ chối.'),
  ('order.rejected', 'en', 'Order {{orderNumber}} not allocated',
   'Order **{{orderNumber}}** was not allocated in the latest run.'),
  ('order.rejected', 'vi', 'Đơn {{orderNumber}} không được phân bổ',
   'Đơn **{{orderNumber}}** không được phân bổ trong lần chạy mới nhất.')
ON CONFLICT (event_key, locale) DO NOTHING;

INSERT INTO hot_sales_notification_event (event_key, channel, enabled) VALUES
  ('order.rejected', 'email', TRUE)
ON CONFLICT (event_key, channel) DO NOTHING;
