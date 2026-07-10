import "server-only";

import { pool } from "@/lib/db";
import type {
  HotSalesNotificationDelivery,
  HotSalesNotificationLocale,
  HotSalesNotificationTemplate,
} from "@/lib/domain/trade/notification-types";

function mapTemplateRow(row: Record<string, unknown>): HotSalesNotificationTemplate {
  return {
    id: String(row.id),
    eventKey: String(row.event_key),
    locale: String(row.locale) as HotSalesNotificationLocale,
    subject: String(row.subject),
    bodyMarkdown: String(row.body_markdown),
  };
}

function mapDeliveryRow(row: Record<string, unknown>): HotSalesNotificationDelivery {
  return {
    id: String(row.id),
    eventKey: String(row.event_key),
    entityId: String(row.entity_id),
    recipientEmail: String(row.recipient_email),
    locale: String(row.locale) as HotSalesNotificationLocale,
    idempotencyKey: String(row.idempotency_key),
    status: String(row.status) as HotSalesNotificationDelivery["status"],
    providerId: row.provider_id != null ? String(row.provider_id) : null,
    error: row.error != null ? String(row.error) : null,
    sentAt: row.sent_at ? new Date(String(row.sent_at)) : null,
    createdAt: new Date(String(row.created_at)),
  };
}

export async function isNotificationEventEnabled(
  eventKey: string,
  channel = "email",
): Promise<boolean> {
  const result = await pool.query(
    `SELECT enabled FROM hot_sales_notification_event
     WHERE event_key = $1 AND channel = $2`,
    [eventKey, channel],
  );
  if (result.rows.length === 0) return false;
  return Boolean(result.rows[0].enabled);
}

export async function getNotificationTemplate(
  eventKey: string,
  locale: HotSalesNotificationLocale,
): Promise<HotSalesNotificationTemplate | null> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_notification_template WHERE event_key = $1 AND locale = $2`,
    [eventKey, locale],
  );
  return result.rows[0] ? mapTemplateRow(result.rows[0]) : null;
}

export async function findDeliveryByIdempotencyKey(
  idempotencyKey: string,
): Promise<HotSalesNotificationDelivery | null> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_notification_delivery WHERE idempotency_key = $1`,
    [idempotencyKey],
  );
  return result.rows[0] ? mapDeliveryRow(result.rows[0]) : null;
}

export async function insertNotificationDelivery(input: {
  eventKey: string;
  entityId: string;
  recipientEmail: string;
  locale: HotSalesNotificationLocale;
  idempotencyKey: string;
  status: HotSalesNotificationDelivery["status"];
  providerId?: string;
  error?: string;
}): Promise<HotSalesNotificationDelivery> {
  const result = await pool.query(
    `INSERT INTO hot_sales_notification_delivery
      (event_key, entity_id, recipient_email, locale, idempotency_key, status, provider_id, error, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [
      input.eventKey,
      input.entityId,
      input.recipientEmail.trim().toLowerCase(),
      input.locale,
      input.idempotencyKey,
      input.status,
      input.providerId ?? null,
      input.error ?? null,
      input.status === "sent" ? new Date() : null,
    ],
  );
  if (result.rows.length > 0) {
    return mapDeliveryRow(result.rows[0]);
  }
  const existing = await findDeliveryByIdempotencyKey(input.idempotencyKey);
  if (!existing) throw new Error("delivery_insert_failed");
  return existing;
}

export async function updateDeliveryStatus(input: {
  idempotencyKey: string;
  status: HotSalesNotificationDelivery["status"];
  providerId?: string;
  error?: string;
}) {
  await pool.query(
    `UPDATE hot_sales_notification_delivery
     SET status = $2, provider_id = $3, error = $4,
         sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END
     WHERE idempotency_key = $1`,
    [
      input.idempotencyKey,
      input.status,
      input.providerId ?? null,
      input.error ?? null,
    ],
  );
}
