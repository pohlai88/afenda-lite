import { z } from "zod";

const salesOrderPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("sales_order"),
	entityId: z.string().trim().min(1),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
});

export const salesOrderPayloadSchema = salesOrderPayloadBase;

export type SalesOrderPayload = z.infer<typeof salesOrderPayloadSchema>;

export const salesOrderLinePayloadSchema = salesOrderPayloadBase.extend({
	entityType: z.literal("sales_order_line"),
	orderId: z.string().uuid(),
	lineNo: z.number().int().positive(),
});

export type SalesOrderLinePayload = z.infer<typeof salesOrderLinePayloadSchema>;

export const SalesEventSchemas = {
	"sales.order.created.v1": salesOrderPayloadSchema,
	"sales.order.line_added.v1": salesOrderLinePayloadSchema,
	"sales.order.posted.v1": salesOrderPayloadSchema,
} as const;

export type SalesEventType = keyof typeof SalesEventSchemas;

/** Exact sales event type IDs — primary contract authority stays this package. */
export const SALES_ORDER_CREATED_EVENT = "sales.order.created.v1" as const;
export const SALES_ORDER_LINE_ADDED_EVENT =
	"sales.order.line_added.v1" as const;
export const SALES_ORDER_POSTED_EVENT = "sales.order.posted.v1" as const;

export const SALES_EVENT_IDS = [
	SALES_ORDER_CREATED_EVENT,
	SALES_ORDER_LINE_ADDED_EVENT,
	SALES_ORDER_POSTED_EVENT,
] as const satisfies readonly SalesEventType[];
