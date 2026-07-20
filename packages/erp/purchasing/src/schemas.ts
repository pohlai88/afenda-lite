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
const idempotencyKeySchema = z.string().trim().min(1).max(128);

const orderCodeSchema = z.string().trim().min(1).max(64);
const currencyCodeSchema = z
	.string()
	.trim()
	.min(3)
	.max(3)
	.transform((value) => value.toUpperCase());
const moneyNonNegativeSchema = z
	.union([z.number().nonnegative(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const asNumber = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(asNumber) || asNumber < 0) {
			ctx.addIssue({
				code: "custom",
				message: "Must be a non-negative number",
			});
			return z.NEVER;
		}
		return String(asNumber);
	});

const tolerancePercentSchema = moneyNonNegativeSchema;

const quantitySchema = z
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
	});

export const createDraftPurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	code: orderCodeSchema,
	partyId: partyIdSchema,
	paymentTermId: paymentTermIdSchema.optional(),
	warehouseId: warehouseIdSchema.optional(),
	currencyCode: currencyCodeSchema,
	exchangeRate: moneyNonNegativeSchema.optional(),
});

export const addPurchaseOrderLineInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: purchaseOrderIdSchema,
	itemId: itemIdSchema,
	quantity: quantitySchema,
	unitPrice: moneyNonNegativeSchema,
	discountAmount: moneyNonNegativeSchema.optional(),
	taxClassification: z.string().trim().min(1).max(64).optional(),
	overReceiptPercent: tolerancePercentSchema.optional(),
	underReceiptPercent: tolerancePercentSchema.optional(),
	invoiceQuantityTolerancePercent: tolerancePercentSchema.optional(),
	invoicePriceTolerancePercent: tolerancePercentSchema.optional(),
});

export const postPurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: purchaseOrderIdSchema,
	expectedVersion: z.number().int().positive(),
	/** Optional tax total applied at post (document-level). */
	taxTotal: moneyNonNegativeSchema.optional(),
});

export const cancelPurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: purchaseOrderIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const closePurchaseOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: purchaseOrderIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const getPurchaseOrderByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	id: purchaseOrderIdSchema,
});

export const listPurchaseOrdersInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
});
