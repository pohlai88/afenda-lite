import { itemIdSchema, warehouseIdSchema } from "@afenda/master-data";
import { z } from "zod";

import { stockMovementIdSchema, stockReservationIdSchema } from "./brands";
import { STOCK_MOVEMENT_STATUSES, STOCK_MOVEMENT_TYPES } from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);
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

export const createStockMovementInputSchema = z
	.object({
		organizationId: organizationIdSchema,
		actorUserId: actorUserIdSchema,
		correlationId: correlationIdSchema,
		code: movementCodeSchema,
		movementType: z.enum(STOCK_MOVEMENT_TYPES),
		warehouseId: warehouseIdSchema.optional(),
		fromWarehouseId: warehouseIdSchema.optional(),
		toWarehouseId: warehouseIdSchema.optional(),
		reservationId: stockReservationIdSchema.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.movementType === "transfer") {
			if (data.fromWarehouseId === undefined) {
				ctx.addIssue({
					code: "custom",
					message: "Transfer requires fromWarehouseId",
					path: ["fromWarehouseId"],
				});
			}
			if (data.toWarehouseId === undefined) {
				ctx.addIssue({
					code: "custom",
					message: "Transfer requires toWarehouseId",
					path: ["toWarehouseId"],
				});
			}
			if (
				data.fromWarehouseId !== undefined &&
				data.toWarehouseId !== undefined &&
				data.fromWarehouseId === data.toWarehouseId
			) {
				ctx.addIssue({
					code: "custom",
					message: "Transfer from and to warehouses must differ",
					path: ["toWarehouseId"],
				});
			}
			return;
		}
		if (data.warehouseId === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "warehouseId is required for this movement type",
				path: ["warehouseId"],
			});
		}
	});

export const addStockMovementLineInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	movementId: stockMovementIdSchema,
	itemId: itemIdSchema,
	quantity: z.union([z.number(), z.string().trim().min(1)]),
});

export const postStockMovementInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	movementId: stockMovementIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const reserveStockInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	code: movementCodeSchema,
	warehouseId: warehouseIdSchema,
	itemId: itemIdSchema,
	quantity: positiveQuantitySchema(),
});

export const releaseReservationInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	correlationId: correlationIdSchema,
	code: movementCodeSchema,
	reservationId: stockReservationIdSchema,
	expectedVersion: z.number().int().positive(),
});

export const getStockMovementByIdInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	id: stockMovementIdSchema,
});

export const listStockMovementsInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(STOCK_MOVEMENT_STATUSES).optional(),
	movementType: z.enum(STOCK_MOVEMENT_TYPES).optional(),
});

export const getStockAvailabilityInputSchema = z.object({
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
	warehouseId: warehouseIdSchema.optional(),
	itemId: itemIdSchema.optional(),
});

export { positiveQuantitySchema, signedNonZeroQuantitySchema };
