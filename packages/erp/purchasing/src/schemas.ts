import {
	itemIdSchema,
	partyIdSchema,
	paymentTermIdSchema,
	warehouseIdSchema,
} from "@afenda/master-data";
import { z } from "zod";

import { purchaseOrderIdSchema } from "./brands";
import { PURCHASE_ORDER_STATUSES } from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);

const orderCodeSchema = z.string().trim().min(1).max(64);

export const createDraftPurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	code: orderCodeSchema,
	partyId: partyIdSchema,
	paymentTermId: paymentTermIdSchema.optional(),
	warehouseId: warehouseIdSchema.optional(),
});

export const addPurchaseOrderLineInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	orderId: purchaseOrderIdSchema,
	itemId: itemIdSchema,
	quantity: z
		.union([z.number().positive(), z.string().trim().min(1)])
		.transform((value, ctx) => {
			const asNumber = typeof value === "number" ? value : Number(value);
			if (!Number.isFinite(asNumber) || asNumber <= 0) {
				ctx.addIssue({
					code: "custom",
					message: "Quantity must be a positive number",
				});
				return z.NEVER;
			}
			return String(asNumber);
		}),
});

export const postPurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	orderId: purchaseOrderIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const cancelPurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	orderId: purchaseOrderIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const getPurchaseOrderByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	id: purchaseOrderIdSchema,
});

export const listPurchaseOrdersInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
});
