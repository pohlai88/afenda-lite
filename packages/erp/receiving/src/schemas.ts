import { itemIdSchema, warehouseIdSchema } from "@afenda/master-data";
import { z } from "zod";

import { goodsReceiptIdSchema, goodsReceiptLineIdSchema } from "./brands";
import {
	GOODS_RECEIPT_SOURCE_TYPES,
	GOODS_RECEIPT_STATUSES,
	RECEIVING_DISCREPANCY_TYPES,
} from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);
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

export const createDraftGoodsReceiptInputSchema = z
	.object({
		...mutationContext,
		code: z.string().trim().min(1).max(64),
		sourceType: z.enum(GOODS_RECEIPT_SOURCE_TYPES),
		sourceId: z.string().uuid().optional(),
		warehouseId: warehouseIdSchema,
		notes: z.string().trim().max(2000).optional(),
	})
	.superRefine((value, ctx) => {
		if (value.sourceType === "purchase_order" && value.sourceId === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "sourceId is required for purchase_order receipts",
				path: ["sourceId"],
			});
		}
	});

export const addGoodsReceiptLineInputSchema = z.object({
	...mutationContext,
	receiptId: goodsReceiptIdSchema,
	itemId: itemIdSchema,
	quantityOrdered: positiveQuantitySchema.optional(),
	quantityReceived: positiveQuantitySchema,
	purchaseOrderLineId: z.string().uuid().optional(),
});

export const postGoodsReceiptInputSchema = z.object({
	...mutationContext,
	receiptId: goodsReceiptIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const cancelGoodsReceiptInputSchema = postGoodsReceiptInputSchema;

export const recordReceivingDiscrepancyInputSchema = z.object({
	...mutationContext,
	receiptId: goodsReceiptIdSchema,
	receiptLineId: goodsReceiptLineIdSchema.optional(),
	discrepancyType: z.enum(RECEIVING_DISCREPANCY_TYPES),
	quantity: positiveQuantitySchema,
	notes: z.string().trim().max(2000).optional(),
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
