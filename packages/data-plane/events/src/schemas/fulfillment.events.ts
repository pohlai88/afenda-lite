import { z } from "zod";

const deliveryPayloadBase = z
	.object({
		organizationId: z.string().trim().min(1),
		entityType: z.literal("delivery"),
		entityId: z.string().trim().min(1),
		code: z.string().trim().min(1),
		version: z.number().int().positive(),
		actorUserId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		causationId: z.string().trim().min(1).optional(),
		changedPaths: z.array(z.string().trim().min(1)).optional(),
		status: z.string().trim().min(1),
		sourceType: z.string().trim().min(1),
		warehouseId: z.string().uuid(),
	})
	.strict();

export const deliveryPayloadSchema = deliveryPayloadBase;

export type DeliveryPayload = z.infer<typeof deliveryPayloadSchema>;

export const pickPayloadSchema = deliveryPayloadBase
	.extend({
		entityType: z.literal("pick"),
		deliveryId: z.string().uuid(),
		lineNo: z.number().int().positive(),
		quantity: z.string().trim().min(1),
	})
	.strict();

export type PickPayload = z.infer<typeof pickPayloadSchema>;

export const FulfillmentEventSchemas = {
	"fulfillment.delivery.created.v1": deliveryPayloadSchema,
	"fulfillment.pick.confirmed.v1": pickPayloadSchema,
	"fulfillment.delivery.posted.v1": deliveryPayloadSchema,
	"fulfillment.delivery.completed.v1": deliveryPayloadSchema,
} as const;

export type FulfillmentEventType = keyof typeof FulfillmentEventSchemas;

export const FULFILLMENT_DELIVERY_CREATED_EVENT =
	"fulfillment.delivery.created.v1" as const;
export const FULFILLMENT_PICK_CONFIRMED_EVENT =
	"fulfillment.pick.confirmed.v1" as const;
export const FULFILLMENT_DELIVERY_POSTED_EVENT =
	"fulfillment.delivery.posted.v1" as const;
export const FULFILLMENT_DELIVERY_COMPLETED_EVENT =
	"fulfillment.delivery.completed.v1" as const;

export const FULFILLMENT_EVENT_IDS = [
	FULFILLMENT_DELIVERY_CREATED_EVENT,
	FULFILLMENT_PICK_CONFIRMED_EVENT,
	FULFILLMENT_DELIVERY_POSTED_EVENT,
	FULFILLMENT_DELIVERY_COMPLETED_EVENT,
] as const satisfies readonly FulfillmentEventType[];
