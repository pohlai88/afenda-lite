import "server-only";

import { pool } from "@/lib/db";
import { notifyTradeEvent } from "@/lib/domain/trade/notification-send";
import type { HotSalesNotificationLocale } from "@/lib/domain/trade/notification-types";
import type { HotSalesEvent } from "@/lib/domain/trade/types";
import { mapEventRow } from "@/lib/domain/trade/mappers";

export const CLOSING_SOON_WINDOW_HOURS = 24;

export function isEventClosingSoon(
  event: Pick<HotSalesEvent, "status" | "closesAt">,
  now = new Date(),
  windowHours = CLOSING_SOON_WINDOW_HOURS,
): boolean {
  if (event.status !== "open") return false;
  const remainingMs = event.closesAt.getTime() - now.getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  return remainingMs > 0 && remainingMs <= windowMs;
}

export function closingSoonEntityId(
  eventId: string,
  closesAt: Date,
): string {
  return `${eventId}:${closesAt.toISOString()}`;
}

export async function listEventsClosingSoon(
  now = new Date(),
  windowHours = CLOSING_SOON_WINDOW_HOURS,
): Promise<HotSalesEvent[]> {
  const result = await pool.query(
    `SELECT * FROM hot_sales_event
     WHERE status = 'open'
       AND closes_at > $1
       AND closes_at <= $1 + ($2::text || ' hours')::interval
     ORDER BY closes_at ASC`,
    [now.toISOString(), String(windowHours)],
  );
  return result.rows.map(mapEventRow);
}

export async function listSalesEmailsForEvent(eventId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT LOWER(TRIM(salesperson_email)) AS email
     FROM hot_sales_order
     WHERE event_id = $1
       AND salesperson_email IS NOT NULL
       AND salesperson_email <> ''
       AND status NOT IN ('cancelled', 'rejected')`,
    [eventId],
  );
  return result.rows
    .map((row) => String(row.email))
    .filter((email) => email.includes("@"));
}

export async function processClosingSoonNotifications(input?: {
  locale?: HotSalesNotificationLocale;
  now?: Date;
  windowHours?: number;
}): Promise<{ events: number; notified: number }> {
  const locale = input?.locale ?? "en";
  const now = input?.now ?? new Date();
  const events = await listEventsClosingSoon(now, input?.windowHours);
  let notified = 0;

  for (const event of events) {
    const recipients = await listSalesEmailsForEvent(event.id);
    const entityId = closingSoonEntityId(event.id, event.closesAt);
    const closesAt = event.closesAt.toISOString();

    for (const recipientEmail of recipients) {
      notifyTradeEvent({
        eventKey: "event.closing_soon",
        entityId,
        recipientEmail,
        locale,
        vars: { eventName: event.eventName, closesAt },
        version: "v1",
      });
      notified += 1;
    }
  }

  return { events: events.length, notified };
}
