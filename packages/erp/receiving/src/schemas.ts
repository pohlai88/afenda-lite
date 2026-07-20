import { itemIdSchema, warehouseIdSchema } from "@afenda/master-data";
import { z } from "zod";

import {
	goodsReceiptIdSchema,
	goodsReceiptLineIdSchema,
	receivingDiscrepancyIdSchema,
} from "./brands";
import {
	GOODS_RECEIPT_SOURCE_TYPES,
	GOODS_RECEIPT_STATUSES,
	RECEIVING_DISCREPANCY_TYPES,
} from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const nonNegativeQuantitySchema = z
	.union([z.number().nonnegative(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const numeric = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(numeric) || numeric < 0) {
			ctx.addIssue({
				code: "custom",
				message: "Quantity must be non-negative",
			});
			return z.NEVER;
		}
		return String(numeric);
	});
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
	idempotencyKey: idempotencyKeySchema,
};

const goodsReceiptSourceSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("purchase_order"),
		purchaseOrderId: z.string().uuid(),
	}),
]);

function assertQuantitySplit(
	value: {
		quantityReceived: string;
		quantityAccepted: string;
		quantityRejected: string;
		quantityDamaged: string;
	},
	ctx: z.RefinementCtx,
): void {
	const received = Number(value.quantityReceived);
	const accepted = Number(value.quantityAccepted);
	const rejected = Number(value.quantityRejected);
	const damaged = Number(value.quantityDamaged);
	if (
		!Number.isFinite(received) ||
		!Number.isFinite(accepted) ||
		!Number.isFinite(rejected) ||
		!Number.isFinite(damaged)
	) {
		ctx.addIssue({ code: "custom", message: "Invalid quantity split" });
		return;
	}
	if (accepted + rejected + damaged > received) {
		ctx.addIssue({
			code: "custom",
			message: "accepted + rejected + damaged must be ≤ received",
			path: ["quantityAccepted"],
		});
	}
}

export const createDraftGoodsReceiptInputSchema = z.object({
	...mutationContext,
	code: z.string().trim().min(1).max(64),
	source: goodsReceiptSourceSchema,
	warehouseId: warehouseIdSchema,
	notes: z.string().trim().max(2000).optional(),
});

export const addGoodsReceiptLineInputSchema = z
	.object({
		...mutationContext,
		receiptId: goodsReceiptIdSchema,
		itemId: itemIdSchema,
		quantityOrdered: positiveQuantitySchema.optional(),
		quantityExpected: positiveQuantitySchema.optional(),
		quantityReceived: positiveQuantitySchema,
		quantityAccepted: positiveQuantitySchema.optional(),
		quantityRejected: nonNegativeQuantitySchema.optional(),
		quantityDamaged: nonNegativeQuantitySchema.optional(),
		purchaseOrderLineId: z.string().uuid().optional(),
	})
	.superRefine((value, ctx) => {
		const quantityAccepted = value.quantityAccepted ?? value.quantityReceived;
		const quantityRejected = value.quantityRejected ?? "0";
		const quantityDamaged = value.quantityDamaged ?? "0";
		assertQuantitySplit(
			{
				quantityReceived: value.quantityReceived,
				quantityAccepted,
				quantityRejected,
				quantityDamaged,
			},
			ctx,
		);
	});

export const postGoodsReceiptInputSchema = z.object({
	...mutationContext,
	receiptId: goodsReceiptIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const cancelGoodsReceiptInputSchema = postGoodsReceiptInputSchema;

export const reverseGoodsReceiptInputSchema = z.object({
	...mutationContext,
	receiptId: goodsReceiptIdSchema,
	expectedVersion: z.number().int().positive(),
	reason: z.string().trim().min(1).max(2000),
});

export const recordReceivingDiscrepancyInputSchema = z.object({
	...mutationContext,
	receiptId: goodsReceiptIdSchema,
	receiptLineId: goodsReceiptLineIdSchema.optional(),
	discrepancyType: z.enum(RECEIVING_DISCREPANCY_TYPES),
	quantity: positiveQuantitySchema,
	notes: z.string().trim().max(2000).optional(),
});

export const resolveReceivingDiscrepancyInputSchema = z.object({
	...mutationContext,
	discrepancyId: receivingDiscrepancyIdSchema,
	receiptId: goodsReceiptIdSchema,
	resolution: z.string().trim().min(1).max(2000),
	expectedVersion: z.number().int().positive(),
});

export const getGoodsReceiptByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	id: goodsReceiptIdSchema,
});

export const listGoodsReceiptsInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(GOODS_RECEIPT_STATUSES).optional(),
	sourceType: z.enum(GOODS_RECEIPT_SOURCE_TYPES).optional(),
});

export const listReceivingInventoryExceptionsInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
});
