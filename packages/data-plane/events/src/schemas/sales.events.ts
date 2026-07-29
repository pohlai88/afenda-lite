import { z } from "zod";

const salesPayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.enum([
		"sales_price_book",
		"sales_price_book_entry",
		"sales_quotation",
		"sales_quotation_line",
		"sales_order",
		"sales_order_line",
		"sales_order_hold",
		"sales_return_authorization",
		"sales_return_authorization_line",
	]),
	entityId: z.string().trim().min(1),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
});
export const salesOrderPayloadSchema = salesPayloadSchema.extend({
	entityType: z.literal("sales_order"),
});
export const salesOrderLinePayloadSchema = salesPayloadSchema.extend({
	entityType: z.literal("sales_order_line"),
	orderId: z.string().uuid().optional(),
	lineNo: z.number().int().positive().optional(),
});
export type SalesOrderPayload = z.infer<typeof salesOrderPayloadSchema>;
export type SalesOrderLinePayload = z.infer<typeof salesOrderLinePayloadSchema>;

export const SalesEventSchemas = {
	"sales.price_book.created.v1": salesPayloadSchema,
	"sales.price_book.entry_added.v1": salesPayloadSchema,
	"sales.price_book.activated.v1": salesPayloadSchema,
	"sales.quotation.created.v1": salesPayloadSchema,
	"sales.quotation.line_added.v1": salesPayloadSchema,
	"sales.quotation.submitted.v1": salesPayloadSchema,
	"sales.quotation.approved.v1": salesPayloadSchema,
	"sales.quotation.sent.v1": salesPayloadSchema,
	"sales.quotation.accepted.v1": salesPayloadSchema,
	"sales.quotation.expired.v1": salesPayloadSchema,
	"sales.quotation.rejected.v1": salesPayloadSchema,
	"sales.quotation.cancelled.v1": salesPayloadSchema,
	"sales.quotation.converted.v1": salesPayloadSchema,
	"sales.order.created.v1": salesOrderPayloadSchema,
	"sales.order.created_from_quotation.v1": salesOrderPayloadSchema,
	"sales.order.line_added.v1": salesOrderLinePayloadSchema,
	"sales.order.submitted.v1": salesOrderPayloadSchema,
	"sales.order.approved.v1": salesOrderPayloadSchema,
	"sales.order.confirmed.v1": salesOrderPayloadSchema,
	"sales.order.released.v1": salesOrderPayloadSchema,
	"sales.order.posted.v1": salesOrderPayloadSchema,
	"sales.order.hold_placed.v1": salesPayloadSchema,
	"sales.order.hold_resolved.v1": salesPayloadSchema,
	"sales.order.fulfillment_recorded.v1": salesOrderPayloadSchema,
	"sales.order.cancelled.v1": salesOrderPayloadSchema,
	"sales.order.closed.v1": salesOrderPayloadSchema,
	"sales.return.created.v1": salesPayloadSchema,
	"sales.return.line_added.v1": salesPayloadSchema,
	"sales.return.submitted.v1": salesPayloadSchema,
	"sales.return.approved.v1": salesPayloadSchema,
	"sales.return.rejected.v1": salesPayloadSchema,
	"sales.return.cancelled.v1": salesPayloadSchema,
	"sales.return.closed.v1": salesPayloadSchema,
} as const;
export type SalesEventType = keyof typeof SalesEventSchemas;
export const SALES_ORDER_CREATED_EVENT = "sales.order.created.v1" as const;
export const SALES_ORDER_LINE_ADDED_EVENT =
	"sales.order.line_added.v1" as const;
export const SALES_ORDER_POSTED_EVENT = "sales.order.posted.v1" as const;
export const SALES_ORDER_CANCELLED_EVENT = "sales.order.cancelled.v1" as const;
export const SALES_EVENT_IDS = Object.keys(
	SalesEventSchemas,
) as SalesEventType[];
