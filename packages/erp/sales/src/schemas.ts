import {
	itemIdSchema,
	partyIdSchema,
	paymentTermIdSchema,
} from "@afenda/master-data";
import { z } from "zod";

import { salesOrderIdSchema } from "./brands";
import { SALES_ORDER_LIST_SORTS, SALES_ORDER_STATUSES } from "./types";

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
const optionalAddressSchema = z.string().trim().min(1).max(512).optional();
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

export const createDraftSalesOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	code: orderCodeSchema,
	partyId: partyIdSchema,
	paymentTermId: paymentTermIdSchema.optional(),
	currencyCode: currencyCodeSchema,
	exchangeRate: moneyNonNegativeSchema.optional(),
	billToAddressSnapshot: optionalAddressSchema,
	shipToAddressSnapshot: optionalAddressSchema,
});

export const addSalesOrderLineInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: salesOrderIdSchema,
	expectedVersion: z.number().int().positive(),
	itemId: itemIdSchema,
	quantity: quantitySchema,
	unitPrice: moneyNonNegativeSchema,
	discountAmount: moneyNonNegativeSchema.optional(),
	taxClassification: z.string().trim().min(1).max(64).optional(),
});

export const postSalesOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: salesOrderIdSchema,
	expectedVersion: z.number().int().positive(),
	/** Optional tax total applied at post (document-level). */
	taxTotal: moneyNonNegativeSchema.optional(),
});

export const cancelSalesOrderInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
	orderId: salesOrderIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const getSalesOrderByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	id: salesOrderIdSchema,
});

export const listSalesOrdersInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(SALES_ORDER_STATUSES).optional(),
	sort: z.enum(SALES_ORDER_LIST_SORTS).default("updatedAt:desc"),
});
