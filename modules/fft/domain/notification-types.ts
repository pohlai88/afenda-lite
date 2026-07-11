/** Feed Farm Trade notification event keys (ADR-003). */

export const FFT_NOTIFICATION_EVENT_KEYS = [
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

export type FftNotificationEventKey =
  (typeof FFT_NOTIFICATION_EVENT_KEYS)[number];

export type FftNotificationLocale = "vi" | "en";

export type FftNotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

export type FftNotificationTemplate = {
  id: string;
  eventKey: string;
  locale: FftNotificationLocale;
  subject: string;
  bodyMarkdown: string;
};

export type FftNotificationDelivery = {
  id: string;
  eventKey: string;
  entityId: string;
  recipientEmail: string;
  locale: FftNotificationLocale;
  idempotencyKey: string;
  status: FftNotificationDeliveryStatus;
  providerId: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export type TradeNotificationPayload = Record<string, string | number | undefined>;
