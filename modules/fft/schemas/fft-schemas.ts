import { z } from "zod";

import { fftLocales } from "@/modules/fft/i18n/fft-i18n";
import { emailSchema, parseSchema, uuidSchema } from "@/modules/platform/schemas/common";

export const tradeLocaleSchema = z.enum(fftLocales);
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

export function parseFftLocale(locale: string) {
  return parseSchema(tradeLocaleSchema, locale);
}

export function parseFftEventId(eventId: string) {
  return parseSchema(tradeEventIdSchema, eventId);
}

export function parseFftOrderId(orderId: string) {
  return parseSchema(tradeOrderIdSchema, orderId);
}
