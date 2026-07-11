import { notifyFftEvent, type SendTradeNotificationInput } from "@/modules/fft/domain/notification-send";
import type { FftNotificationLocale } from "@/modules/fft/domain/notification-types";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function tradeNotifyLocale(locale: FftLocale): FftNotificationLocale {
  return locale === "vi" ? "vi" : "en";
}

export function notifyTradeStakeholder(
  locale: FftLocale,
  input: Omit<SendTradeNotificationInput, "locale">,
): void {
  notifyFftEvent({ ...input, locale: tradeNotifyLocale(locale) });
}

export function notifyDepositPending(
  locale: FftLocale,
  order: { id: string; orderNumber: string; salespersonEmail: string },
): void {
  notifyTradeStakeholder(locale, {
    eventKey: "deposit.pending",
    entityId: order.id,
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });
}
