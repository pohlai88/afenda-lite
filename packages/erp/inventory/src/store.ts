import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	StockBalance,
	StockMovement,
	StockMovementLine,
	StockMovementStatus,
	StockMovementType,
	StockReservation,
} from "./types";

export type MovementCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	movementType: StockMovementType;
	warehouseId: string | null;
	warehouseCode: string | null;
	warehouseName: string | null;
	fromWarehouseId: string | null;
	fromWarehouseCode: string | null;
	fromWarehouseName: string | null;
	toWarehouseId: string | null;
	toWarehouseCode: string | null;
	toWarehouseName: string | null;
	reservationId: string | null;
	createdBy: string;
};

export type MovementLineCreateRecord = {
	organizationId: string;
	movementId: string;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantity: string;
	createdBy: string;
};

export type MovementPostRecord = {
	organizationId: string;
	movementId: string;
	expectedVersion: number;
	actorUserId: string;
	/** Required when posting reservation_release — optimistic concurrency on reservation. */
	reservationExpectedVersion?: number;
};

export type MovementListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: StockMovementStatus;
	movementType?: StockMovementType;
};

export type AvailabilityFilter = {
	organizationId: string;
	warehouseId?: string;
	itemId?: string;
};

export type InventoryStore = {
	createMovement(
		record: MovementCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>>;
	addLine(
		record: MovementLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovementLine>>;
	postMovement(
		record: MovementPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>>;
	getMovementById(
		organizationId: string,
		id: string,
	): Promise<Result<StockMovement | null>>;
	listMovements(filter: MovementListFilter): Promise<Result<StockMovement[]>>;
	getAvailability(filter: AvailabilityFilter): Promise<Result<StockBalance[]>>;
	getReservationById(
		organizationId: string,
		id: string,
	): Promise<Result<StockReservation | null>>;
};

export function parseQuantity(value: string): number {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		throw new Error(`Invalid quantity: ${value}`);
	}
	return n;
}

export function formatQuantity(value: number): string {
	return String(value);
}

export type BalanceKey = `${string}:${string}`;

export function balanceKey(warehouseId: string, itemId: string): BalanceKey {
	return `${warehouseId}:${itemId}`;
}

export type BalanceEffect = {
	warehouseId: string;
	warehouseCode: string;
	itemId: string;
	itemCode: string;
	onHandDelta: number;
	reservedDelta: number;
	availableDelta: number;
	quantityDelta: number;
	movementLineId: string | null;
};

/**
 * Compute per-warehouse balance deltas for a posted movement.
 * Callers must enforce stock availability before applying.
 */
export function computeBalanceEffects(
	movement: StockMovement,
): BalanceEffect[] {
	const effects: BalanceEffect[] = [];
	for (const line of movement.lines) {
		const qty = parseQuantity(line.quantity);
		switch (movement.movementType) {
			case "receipt": {
				if (movement.warehouseId === null || movement.warehouseCode === null) {
					throw new Error("Receipt movement missing warehouse");
				}
				effects.push({
					warehouseId: movement.warehouseId,
					warehouseCode: movement.warehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: qty,
					reservedDelta: 0,
					availableDelta: qty,
					quantityDelta: qty,
					movementLineId: line.id,
				});
				break;
			}
			case "issue": {
				if (movement.warehouseId === null || movement.warehouseCode === null) {
					throw new Error("Issue movement missing warehouse");
				}
				effects.push({
					warehouseId: movement.warehouseId,
					warehouseCode: movement.warehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: -qty,
					reservedDelta: 0,
					availableDelta: -qty,
					quantityDelta: -qty,
					movementLineId: line.id,
				});
				break;
			}
			case "transfer": {
				if (
					movement.fromWarehouseId === null ||
					movement.fromWarehouseCode === null ||
					movement.toWarehouseId === null ||
					movement.toWarehouseCode === null
				) {
					throw new Error("Transfer movement missing warehouses");
				}
				effects.push({
					warehouseId: movement.fromWarehouseId,
					warehouseCode: movement.fromWarehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: -qty,
					reservedDelta: 0,
					availableDelta: -qty,
					quantityDelta: -qty,
					movementLineId: line.id,
				});
				effects.push({
					warehouseId: movement.toWarehouseId,
					warehouseCode: movement.toWarehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: qty,
					reservedDelta: 0,
					availableDelta: qty,
					quantityDelta: qty,
					movementLineId: line.id,
				});
				break;
			}
			case "adjustment": {
				if (movement.warehouseId === null || movement.warehouseCode === null) {
					throw new Error("Adjustment movement missing warehouse");
				}
				effects.push({
					warehouseId: movement.warehouseId,
					warehouseCode: movement.warehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: qty,
					reservedDelta: 0,
					availableDelta: qty,
					quantityDelta: qty,
					movementLineId: line.id,
				});
				break;
			}
			case "reservation": {
				if (movement.warehouseId === null || movement.warehouseCode === null) {
					throw new Error("Reservation movement missing warehouse");
				}
				effects.push({
					warehouseId: movement.warehouseId,
					warehouseCode: movement.warehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: 0,
					reservedDelta: qty,
					availableDelta: -qty,
					quantityDelta: 0,
					movementLineId: line.id,
				});
				break;
			}
			case "reservation_release": {
				if (movement.warehouseId === null || movement.warehouseCode === null) {
					throw new Error("Reservation release movement missing warehouse");
				}
				effects.push({
					warehouseId: movement.warehouseId,
					warehouseCode: movement.warehouseCode,
					itemId: line.itemId,
					itemCode: line.itemCode,
					onHandDelta: 0,
					reservedDelta: -qty,
					availableDelta: qty,
					quantityDelta: 0,
					movementLineId: line.id,
				});
				break;
			}
			default: {
				const _exhaustive: never = movement.movementType;
				throw new Error(`Unhandled movement type: ${_exhaustive}`);
			}
		}
	}
	return effects;
}
