/** Hot Sales notification event keys (ADR-003). */

export const HOT_SALES_NOTIFICATION_EVENT_KEYS = [
  "event.opened",
  "event.closing_soon",
  "event.closed",
  "order.submitted",
  "allocation.completed",
  "allocation.partial",
  "order.rejected",
  "transfer.requested",
  "transfer.approved",
  "transfer.rejected",
  "deposit.pending",
  "deposit.confirmed",
  "pickup.scheduled",
  "pickup.completed",
] as const;

export type HotSalesNotificationEventKey =
  (typeof HOT_SALES_NOTIFICATION_EVENT_KEYS)[number];

export type HotSalesNotificationLocale = "vi" | "en";

export type HotSalesNotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

export type HotSalesNotificationTemplate = {
  id: string;
  eventKey: string;
  locale: HotSalesNotificationLocale;
  subject: string;
  bodyMarkdown: string;
};

export type HotSalesNotificationDelivery = {
  id: string;
  eventKey: string;
  entityId: string;
  recipientEmail: string;
  locale: HotSalesNotificationLocale;
  idempotencyKey: string;
  status: HotSalesNotificationDeliveryStatus;
  providerId: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export type TradeNotificationPayload = Record<string, string | number | undefined>;
