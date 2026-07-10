import { notifyTradeEvent, type SendTradeNotificationInput } from "@/lib/domain/trade/notification-send";
import type { HotSalesNotificationLocale } from "@/lib/domain/trade/notification-types";
import type { TradeLocale } from "@/lib/i18n/trade";

export function tradeNotifyLocale(locale: TradeLocale): HotSalesNotificationLocale {
  return locale === "vi" ? "vi" : "en";
}

export function notifyTradeStakeholder(
  locale: TradeLocale,
  input: Omit<SendTradeNotificationInput, "locale">,
): void {
  notifyTradeEvent({ ...input, locale: tradeNotifyLocale(locale) });
}

export function notifyDepositPending(
  locale: TradeLocale,
  order: { id: string; orderNumber: string; salespersonEmail: string },
): void {
  notifyTradeStakeholder(locale, {
    eventKey: "deposit.pending",
    entityId: order.id,
    recipientEmail: order.salespersonEmail,
    vars: { orderNumber: order.orderNumber },
  });
}
