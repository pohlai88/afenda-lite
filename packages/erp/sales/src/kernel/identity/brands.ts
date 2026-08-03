import { z } from "zod";

function idSchema<T extends string>() {
	return z.string().uuid().brand<T>();
}

export const priceBookIdSchema = idSchema<"PriceBookId">();
export const priceBookEntryIdSchema = idSchema<"PriceBookEntryId">();
export const salesQuotationIdSchema = idSchema<"SalesQuotationId">();
export const salesQuotationLineIdSchema = idSchema<"SalesQuotationLineId">();
export const salesOrderIdSchema = idSchema<"SalesOrderId">();
export const salesOrderLineIdSchema = idSchema<"SalesOrderLineId">();
export const salesOrderScheduleIdSchema = idSchema<"SalesOrderScheduleId">();
export const salesHoldIdSchema = idSchema<"SalesHoldId">();
export const returnAuthorizationIdSchema = idSchema<"ReturnAuthorizationId">();
export const returnAuthorizationLineIdSchema =
	idSchema<"ReturnAuthorizationLineId">();

export type PriceBookId = z.infer<typeof priceBookIdSchema>;
export type PriceBookEntryId = z.infer<typeof priceBookEntryIdSchema>;
export type SalesQuotationId = z.infer<typeof salesQuotationIdSchema>;
export type SalesQuotationLineId = z.infer<typeof salesQuotationLineIdSchema>;
export type SalesOrderId = z.infer<typeof salesOrderIdSchema>;
export type SalesOrderLineId = z.infer<typeof salesOrderLineIdSchema>;
export type SalesOrderScheduleId = z.infer<typeof salesOrderScheduleIdSchema>;
export type SalesHoldId = z.infer<typeof salesHoldIdSchema>;
export type ReturnAuthorizationId = z.infer<typeof returnAuthorizationIdSchema>;
export type ReturnAuthorizationLineId = z.infer<
	typeof returnAuthorizationLineIdSchema
>;
