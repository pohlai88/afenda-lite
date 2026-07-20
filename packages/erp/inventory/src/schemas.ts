import { itemIdSchema, warehouseIdSchema } from "@afenda/master-data";
import { z } from "zod";

import { stockMovementIdSchema, stockReservationIdSchema } from "./brands";
import {
	INVENTORY_MOVEMENT_SOURCES,
	STOCK_MOVEMENT_STATUSES,
	STOCK_MOVEMENT_TYPES,
	STOCK_RESERVATION_STATUSES,
} from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const movementCodeSchema = z.string().trim().min(1).max(64);

function positiveQuantitySchema() {
	return z
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
}

function signedNonZeroQuantitySchema() {
	return z
		.union([z.number(), z.string().trim().min(1)])
		.transform((value, ctx) => {
			const asNumber = typeof value === "number" ? value : Number(value);
			if (!Number.isFinite(asNumber) || asNumber === 0) {
				ctx.addIssue({
					code: "custom",
					message: "Adjustment quantity must be a non-zero number",
				});
				return z.NEVER;
			}
			return String(asNumber);
		});
}

const mutationContext = {
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
};

const sourceFields = {
	sourceModule: z.string().trim().min(1).max(64).optional(),
	sourceAggregateId: z.string().trim().min(1).max(128).optional(),
	sourceEventId: z.string().trim().min(1).max(128).optional(),
	sourceEventVersion: z.number().int().positive().optional(),
	sourceLineId: z.string().trim().min(1).max(128).optional(),
};

const receiptCreateSchema = z.object({
	...mutationContext,
	...sourceFields,
	code: movementCodeSchema,
	movementType: z.literal("receipt"),
	source: z.enum(["receiving", "opening_balance"]),
	warehouseId: warehouseIdSchema,
	reservationId: z.undefined().optional(),
	fromWarehouseId: z.undefined().optional(),
	toWarehouseId: z.undefined().optional(),
	adjustmentReasonCode: z.undefined().optional(),
	adjustmentNote: z.undefined().optional(),
});

const issueCreateSchema = z.object({
	...mutationContext,
	...sourceFields,
	code: movementCodeSchema,
	movementType: z.literal("issue"),
	source: z.enum(["fulfillment"]),
	warehouseId: warehouseIdSchema,
	reservationId: stockReservationIdSchema.optional(),
	fromWarehouseId: z.undefined().optional(),
	toWarehouseId: z.undefined().optional(),
	adjustmentReasonCode: z.undefined().optional(),
	adjustmentNote: z.undefined().optional(),
});

const transferCreateSchema = z
	.object({
		...mutationContext,
		...sourceFields,
		code: movementCodeSchema,
		movementType: z.literal("transfer"),
		source: z.literal("transfer"),
		fromWarehouseId: warehouseIdSchema,
		toWarehouseId: warehouseIdSchema,
		warehouseId: z.undefined().optional(),
		reservationId: z.undefined().optional(),
		adjustmentReasonCode: z.undefined().optional(),
		adjustmentNote: z.undefined().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.fromWarehouseId === data.toWarehouseId) {
			ctx.addIssue({
				code: "custom",
				message: "Transfer from and to warehouses must differ",
				path: ["toWarehouseId"],
			});
		}
	});

const adjustmentCreateSchema = z.object({
	...mutationContext,
	...sourceFields,
	code: movementCodeSchema,
	movementType: z.literal("adjustment"),
	source: z.literal("manual_adjustment"),
	warehouseId: warehouseIdSchema,
	adjustmentReasonCode: z.string().trim().min(1).max(64),
	adjustmentNote: z.string().trim().max(512).optional(),
	reservationId: z.undefined().optional(),
	fromWarehouseId: z.undefined().optional(),
	toWarehouseId: z.undefined().optional(),
});

export const createStockMovementInputSchema = z.discriminatedUnion(
	"movementType",
	[
		receiptCreateSchema,
		issueCreateSchema,
		transferCreateSchema,
		adjustmentCreateSchema,
	],
);

export const addStockMovementLineInputSchema = z.object({
	...mutationContext,
	movementId: stockMovementIdSchema,
	itemId: itemIdSchema,
	quantity: z.union([z.number(), z.string().trim().min(1)]),
	expectedVersion: z.number().int().positive(),
});

export const postStockMovementInputSchema = z.object({
	...mutationContext,
	movementId: stockMovementIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const cancelStockMovementInputSchema = z.object({
	...mutationContext,
	movementId: stockMovementIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const createReversalMovementInputSchema = z.object({
	...mutationContext,
	movementId: stockMovementIdSchema,
	code: movementCodeSchema,
	expectedVersion: z.number().int().positive(),
});

export const reserveStockInputSchema = z.object({
	...mutationContext,
	code: movementCodeSchema,
	warehouseId: warehouseIdSchema,
	itemId: itemIdSchema,
	quantity: positiveQuantitySchema(),
});

export const releaseReservationInputSchema = z.object({
	...mutationContext,
	reservationId: stockReservationIdSchema,
	expectedVersion: z.number().int().positive(),
});

/** Expire / cancel share the release input shape (balance-freeing terminals). */
export const expireReservationInputSchema = releaseReservationInputSchema;
export const cancelReservationInputSchema = releaseReservationInputSchema;

export const getStockMovementByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema.optional(),
	id: stockMovementIdSchema,
});

export const listStockMovementsInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema.optional(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(STOCK_MOVEMENT_STATUSES).optional(),
	movementType: z.enum(STOCK_MOVEMENT_TYPES).optional(),
});

export const listStockReservationsInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema.optional(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(STOCK_RESERVATION_STATUSES).optional(),
	warehouseId: warehouseIdSchema.optional(),
	itemId: itemIdSchema.optional(),
});

export const getStockAvailabilityInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema.optional(),
	warehouseId: warehouseIdSchema.optional(),
	itemId: itemIdSchema.optional(),
});

export {
	INVENTORY_MOVEMENT_SOURCES,
	positiveQuantitySchema,
	signedNonZeroQuantitySchema,
};
