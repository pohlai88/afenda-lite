import { itemIdSchema, warehouseIdSchema } from "@afenda/master-data";
import { z } from "zod";

import { deliveryIdSchema, deliveryLineIdSchema } from "./brands";
import { DELIVERY_STATUSES } from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const expectedVersionSchema = z.number().int().positive();
const positiveQuantitySchema = z
	.union([z.number().positive(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const numeric = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(numeric) || numeric <= 0) {
			ctx.addIssue({ code: "custom", message: "Quantity must be positive" });
			return z.NEVER;
		}
		return String(numeric);
	});
const mutationContext = {
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
};
const stateChangeContext = {
	...mutationContext,
	deliveryId: deliveryIdSchema,
	expectedVersion: expectedVersionSchema,
};

export const createDraftDeliveryInputSchema = z.object({
	...mutationContext,
	idempotencyKey: idempotencyKeySchema,
	code: z.string().trim().min(1).max(64),
	salesOrderId: z.string().uuid().optional(),
	warehouseId: warehouseIdSchema,
	shipToPartyId: z.string().uuid().optional(),
	shipToPartyCode: z.string().trim().min(1).max(64).optional(),
	shipToPartyName: z.string().trim().min(1).max(300).optional(),
});

export const addDeliveryLineInputSchema = z.object({
	...mutationContext,
	idempotencyKey: idempotencyKeySchema,
	deliveryId: deliveryIdSchema,
	expectedVersion: expectedVersionSchema,
	itemId: itemIdSchema,
	quantityOrdered: positiveQuantitySchema.optional(),
	quantityToDeliver: positiveQuantitySchema,
	salesOrderLineId: z.string().uuid().optional(),
});

export const startPickingInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
});

export const confirmPickInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
	deliveryLineId: deliveryLineIdSchema,
	quantityPicked: positiveQuantitySchema,
	/** When omitted, Inventory `reserveStock` creates a reservation for the pick qty. */
	reservationId: z.string().uuid().optional(),
});

export const confirmPackInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
	packageCode: z.string().trim().min(1).max(128).optional(),
	notes: z.string().trim().max(2000).optional(),
});

export const postDeliveryInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
});

export const recordProofOfDeliveryInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
	receivedByName: z.string().trim().min(1).max(300),
	outcome: z.enum(["delivered", "partially_delivered", "refused", "failed"]),
	proofType: z.string().trim().min(1).max(128).optional(),
	evidenceRef: z.string().trim().min(1).max(512).optional(),
	carrierRef: z.string().trim().min(1).max(256).optional(),
	notes: z.string().trim().max(2000).optional(),
	recordedAt: z.coerce.date().optional(),
});

export const cancelDeliveryInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
});

export const closeDeliveryInputSchema = z.object({
	...stateChangeContext,
	idempotencyKey: idempotencyKeySchema,
});

export const getDeliveryByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	id: deliveryIdSchema,
});

const DELIVERY_LIST_SORTS = ["created_at", "code", "status"] as const;

export const listDeliveriesInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(DELIVERY_STATUSES).optional(),
	warehouseId: warehouseIdSchema.optional(),
	salesOrderId: z.string().uuid().optional(),
	sort: z.enum(DELIVERY_LIST_SORTS).default("created_at"),
});
