import { z } from "zod";

import { tradeLocales } from "@/lib/i18n/trade";
import { emailSchema, parseSchema, uuidSchema } from "@/lib/schemas/common";

export const tradeLocaleSchema = z.enum(tradeLocales);
export const tradeEventIdSchema = uuidSchema;
export const tradeOrderIdSchema = uuidSchema;
export const tradeEmailSchema = emailSchema;

export const tradeLocaleEventInputSchema = z.object({
  locale: tradeLocaleSchema,
  eventId: tradeEventIdSchema,
});

export const tradeLocaleOrderInputSchema = z.object({
  locale: tradeLocaleSchema,
  orderId: tradeOrderIdSchema,
});

export function parseTradeLocale(locale: string) {
  return parseSchema(tradeLocaleSchema, locale);
}

export function parseTradeEventId(eventId: string) {
  return parseSchema(tradeEventIdSchema, eventId);
}

export function parseTradeOrderId(orderId: string) {
  return parseSchema(tradeOrderIdSchema, orderId);
}
