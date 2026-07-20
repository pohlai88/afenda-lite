import { z } from "zod";

const purchaseOrderPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("purchase_order"),
	entityId: z.string().trim().min(1),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
});

export const purchaseOrderPayloadSchema = purchaseOrderPayloadBase;

export type PurchaseOrderPayload = z.infer<typeof purchaseOrderPayloadSchema>;

export const purchaseOrderLinePayloadSchema = purchaseOrderPayloadBase.extend({
	entityType: z.literal("purchase_order_line"),
	orderId: z.string().uuid(),
	lineNo: z.number().int().positive(),
});

export type PurchaseOrderLinePayload = z.infer<
	typeof purchaseOrderLinePayloadSchema
>;

export const PurchasingEventSchemas = {
	"purchasing.order.created.v1": purchaseOrderPayloadSchema,
	"purchasing.order.line_added.v1": purchaseOrderLinePayloadSchema,
	"purchasing.order.posted.v1": purchaseOrderPayloadSchema,
	"purchasing.order.cancelled.v1": purchaseOrderPayloadSchema,
} as const;

export type PurchasingEventType = keyof typeof PurchasingEventSchemas;

export const PURCHASING_ORDER_CREATED_EVENT =
	"purchasing.order.created.v1" as const;
export const PURCHASING_ORDER_LINE_ADDED_EVENT =
	"purchasing.order.line_added.v1" as const;
export const PURCHASING_ORDER_POSTED_EVENT =
	"purchasing.order.posted.v1" as const;
export const PURCHASING_ORDER_CANCELLED_EVENT =
	"purchasing.order.cancelled.v1" as const;

export const PURCHASING_EVENT_IDS = [
	PURCHASING_ORDER_CREATED_EVENT,
	PURCHASING_ORDER_LINE_ADDED_EVENT,
	PURCHASING_ORDER_POSTED_EVENT,
	PURCHASING_ORDER_CANCELLED_EVENT,
] as const satisfies readonly PurchasingEventType[];
