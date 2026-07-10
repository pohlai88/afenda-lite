import "server-only";

import { Resend } from "resend";
import {
  findDeliveryByIdempotencyKey,
  getNotificationTemplate,
  insertNotificationDelivery,
  isNotificationEventEnabled,
  updateDeliveryStatus,
} from "@/lib/domain/trade/notification-store";
import {
  buildNotificationIdempotencyKey,
  markdownToHtml,
  renderNotificationTemplate,
} from "@/lib/domain/trade/notification-render";
import type {
  HotSalesNotificationLocale,
  TradeNotificationPayload,
} from "@/lib/domain/trade/notification-types";
import {
  getHotSalesEmailFrom,
  isHotSalesNotificationsEnabled,
  getResendApiKey,
} from "@/lib/env/accessors";

export type SendTradeNotificationInput = {
  eventKey: string;
  entityId: string;
  recipientEmail: string;
  locale?: HotSalesNotificationLocale;
  vars?: TradeNotificationPayload;
  version?: string;
};

/**
 * Fire-and-forget Hot Sales mail (ADR-003).
 * Never throws — failed delivery must not roll back trade transactions.
 */
export async function sendTradeNotification(
  input: SendTradeNotificationInput,
): Promise<{ sent: boolean; skipped?: string }> {
  try {
    if (!isHotSalesNotificationsEnabled()) {
      return { sent: false, skipped: "notifications_disabled" };
    }

    const recipient = input.recipientEmail?.trim().toLowerCase();
    if (!recipient) return { sent: false, skipped: "no_recipient" };

    const enabled = await isNotificationEventEnabled(input.eventKey);
    if (!enabled) return { sent: false, skipped: "event_disabled" };

    const locale = input.locale ?? "en";
    const idempotencyKey = buildNotificationIdempotencyKey({
      eventKey: input.eventKey,
      entityId: input.entityId,
      recipientEmail: recipient,
      version: input.version,
    });

    const existing = await findDeliveryByIdempotencyKey(idempotencyKey);
    if (existing?.status === "sent") {
      return { sent: false, skipped: "already_sent" };
    }

    const template = await getNotificationTemplate(input.eventKey, locale);
    if (!template) return { sent: false, skipped: "template_missing" };

    const vars = input.vars ?? {};
    const subject = renderNotificationTemplate(template.subject, vars);
    const bodyHtml = markdownToHtml(renderNotificationTemplate(template.bodyMarkdown, vars));

    const from = getHotSalesEmailFrom();
    const apiKey = getResendApiKey();
    if (!from || !apiKey) {
      await insertNotificationDelivery({
        eventKey: input.eventKey,
        entityId: input.entityId,
        recipientEmail: recipient,
        locale,
        idempotencyKey,
        status: "skipped",
        error: "provider_not_configured",
      });
      return { sent: false, skipped: "provider_not_configured" };
    }

    await insertNotificationDelivery({
      eventKey: input.eventKey,
      entityId: input.entityId,
      recipientEmail: recipient,
      locale,
      idempotencyKey,
      status: "pending",
    });

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from,
        to: [recipient],
        subject,
        html: bodyHtml,
      },
      { idempotencyKey },
    );

    if (error) {
      await updateDeliveryStatus({
        idempotencyKey,
        status: "failed",
        error: error.message,
      });
      return { sent: false, skipped: error.message };
    }

    await updateDeliveryStatus({
      idempotencyKey,
      status: "sent",
      providerId: data?.id,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "notification_error";
    return { sent: false, skipped: message };
  }
}

/** Schedule notification without awaiting — safe for request path side effects. */
export function notifyTradeEvent(input: SendTradeNotificationInput): void {
  void sendTradeNotification(input);
}
