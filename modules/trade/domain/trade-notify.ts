import { notifyTradeEvent, type SendTradeNotificationInput } from "@/modules/trade/domain/notification-send";
import type { HotSalesNotificationLocale } from "@/modules/trade/domain/notification-types";
import type { TradeLocale } from "@/modules/trade/i18n/trade";

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
