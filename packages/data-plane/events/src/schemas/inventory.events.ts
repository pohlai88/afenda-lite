import { z } from "zod";

const stockMovementPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("stock_movement"),
	entityId: z.string().trim().min(1),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
	movementType: z.enum([
		"receipt",
		"issue",
		"transfer",
		"adjustment",
		"reservation",
		"reservation_release",
	]),
});

export const stockMovementPayloadSchema = stockMovementPayloadBase;

export type StockMovementPayload = z.infer<typeof stockMovementPayloadSchema>;

export const stockReservationPayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("stock_reservation"),
	entityId: z.string().trim().min(1),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
	warehouseId: z.string().uuid(),
	itemId: z.string().uuid(),
	quantity: z.string().trim().min(1),
	movementId: z.string().uuid().optional(),
});

export type StockReservationPayload = z.infer<
	typeof stockReservationPayloadSchema
>;

export const InventoryEventSchemas = {
	"inventory.movement.created.v1": stockMovementPayloadSchema,
	"inventory.movement.posted.v1": stockMovementPayloadSchema,
	"inventory.stock.reserved.v1": stockReservationPayloadSchema,
	"inventory.reservation.released.v1": stockReservationPayloadSchema,
} as const;

export type InventoryEventType = keyof typeof InventoryEventSchemas;

export const INVENTORY_MOVEMENT_CREATED_EVENT =
	"inventory.movement.created.v1" as const;
export const INVENTORY_MOVEMENT_POSTED_EVENT =
	"inventory.movement.posted.v1" as const;
export const INVENTORY_STOCK_RESERVED_EVENT =
	"inventory.stock.reserved.v1" as const;
export const INVENTORY_RESERVATION_RELEASED_EVENT =
	"inventory.reservation.released.v1" as const;

export const INVENTORY_EVENT_IDS = [
	INVENTORY_MOVEMENT_CREATED_EVENT,
	INVENTORY_MOVEMENT_POSTED_EVENT,
	INVENTORY_STOCK_RESERVED_EVENT,
	INVENTORY_RESERVATION_RELEASED_EVENT,
] as const satisfies readonly InventoryEventType[];
