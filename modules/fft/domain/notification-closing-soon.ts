import "server-only";

import { mapEventRow } from "@/modules/fft/domain/mappers";
import { notifyFftEvent } from "@/modules/fft/domain/notification-send";
import type { FftNotificationLocale } from "@/modules/fft/domain/notification-types";
import { organizationScopeSql } from "@/modules/fft/domain/organization-scope";
import type { FftEvent } from "@/modules/fft/domain/types";
import { pool } from "@/modules/platform/db";

export const CLOSING_SOON_WINDOW_HOURS = 24;

export function isEventClosingSoon(
  event: Pick<FftEvent, "status" | "closesAt">,
  now = new Date(),
  windowHours = CLOSING_SOON_WINDOW_HOURS
): boolean {
  if (event.status !== "open") {
    return false;
  }
  const remainingMs = event.closesAt.getTime() - now.getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  return remainingMs > 0 && remainingMs <= windowMs;
}

export function closingSoonEntityId(eventId: string, closesAt: Date): string {
  return `${eventId}:${closesAt.toISOString()}`;
}

/** Auth org ids for platform cron fan-out — not a tenant-root table. */
export async function listPortalOrganizationIds(): Promise<string[]> {
  const result = await pool.query(
    `SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST`
  );
  return result.rows.map((row) => String(row.id));
}

export async function listEventsClosingSoon(
  organizationId: string,
  now = new Date(),
  windowHours = CLOSING_SOON_WINDOW_HOURS
): Promise<FftEvent[]> {
  const result = await pool.query(
    `SELECT * FROM fft_event
     WHERE ${organizationScopeSql("organization_id", 1)}
       AND status = 'open'
       AND closes_at > $2
       AND closes_at <= $2 + ($3::text || ' hours')::interval
     ORDER BY closes_at ASC`,
    [organizationId, now.toISOString(), String(windowHours)]
  );
  return result.rows.map(mapEventRow);
}

export async function listSalesEmailsForEvent(
  eventId: string
): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT LOWER(TRIM(salesperson_email)) AS email
     FROM fft_order
     WHERE event_id = $1
       AND salesperson_email IS NOT NULL
       AND salesperson_email <> ''
       AND status NOT IN ('cancelled', 'rejected')`,
    [eventId]
  );
  return result.rows
    .map((row) => String(row.email))
    .filter((email) => email.includes("@"));
}

export async function processClosingSoonNotifications(input?: {
  locale?: FftNotificationLocale;
  now?: Date;
  windowHours?: number;
  organizationId?: string;
}): Promise<{ events: number; notified: number }> {
  const locale = input?.locale ?? "en";
  const now = input?.now ?? new Date();
  const orgIds = input?.organizationId
    ? [input.organizationId]
    : await listPortalOrganizationIds();

  let events = 0;
  let notified = 0;

  for (const organizationId of orgIds) {
    const closing = await listEventsClosingSoon(
      organizationId,
      now,
      input?.windowHours
    );
    events += closing.length;

    for (const event of closing) {
      const recipients = await listSalesEmailsForEvent(event.id);
      const entityId = closingSoonEntityId(event.id, event.closesAt);
      const closesAt = event.closesAt.toISOString();

      for (const recipientEmail of recipients) {
        notifyFftEvent({
          entityId,
          eventKey: "event.closing_soon",
          locale,
          recipientEmail,
          vars: { closesAt, eventName: event.eventName },
          version: "v1",
        });
        notified += 1;
      }
    }
  }

  return { events, notified };
}
