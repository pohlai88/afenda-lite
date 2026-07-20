import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	InventoryMovementSource,
	StockAvailability,
	StockBalance,
	StockMovement,
	StockMovementLine,
	StockMovementStatus,
	StockMovementType,
	StockReservation,
	StockReservationStatus,
} from "./types";

export type MovementCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	movementType: StockMovementType;
	source: InventoryMovementSource;
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
	reversesMovementId: string | null;
	adjustmentReasonCode: string | null;
	adjustmentNote: string | null;
	sourceModule: string | null;
	sourceAggregateId: string | null;
	sourceEventId: string | null;
	sourceEventVersion: number | null;
	sourceLineId: string | null;
	createIdempotencyKey: string;
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
	lineIdempotencyKey: string;
	expectedVersion: number;
	createdBy: string;
};

export type MovementPostRecord = {
	organizationId: string;
	movementId: string;
	expectedVersion: number;
	actorUserId: string;
	postIdempotencyKey: string;
};

export type MovementCancelRecord = {
	organizationId: string;
	movementId: string;
	expectedVersion: number;
	actorUserId: string;
	cancelIdempotencyKey: string;
};

export type ReservationCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantity: string;
	createIdempotencyKey: string;
	createdBy: string;
};

export type ReservationTerminalStatus = "released" | "expired" | "cancelled";

export type ReservationTerminalEventType =
	| "inventory.reservation.released.v1"
	| "inventory.reservation.expired.v1"
	| "inventory.reservation.cancelled.v1";

export function reservationTerminalEventType(
	terminalStatus: ReservationTerminalStatus,
): ReservationTerminalEventType {
	switch (terminalStatus) {
		case "released":
			return "inventory.reservation.released.v1";
		case "expired":
			return "inventory.reservation.expired.v1";
		case "cancelled":
			return "inventory.reservation.cancelled.v1";
		default: {
			const _exhaustive: never = terminalStatus;
			return _exhaustive;
		}
	}
}

export type ReservationReleaseRecord = {
	organizationId: string;
	reservationId: string;
	expectedVersion: number;
	actorUserId: string;
	releaseIdempotencyKey: string;
	/** Balance-freeing terminal; release / expire / cancel share one store path. */
	terminalStatus: ReservationTerminalStatus;
};

export type MovementListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: StockMovementStatus;
	movementType?: StockMovementType;
};

export type ReservationListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: StockReservationStatus;
	warehouseId?: string;
	itemId?: string;
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
	cancelMovement(
		record: MovementCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>>;
	reserveStock(
		record: ReservationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockReservation>>;
	releaseReservation(
		record: ReservationReleaseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockReservation>>;
	getMovementById(
		organizationId: string,
		id: string,
	): Promise<Result<StockMovement | null>>;
	getMovementByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockMovement | null>>;
	listMovements(filter: MovementListFilter): Promise<Result<StockMovement[]>>;
	listReservations(
		filter: ReservationListFilter,
	): Promise<Result<StockReservation[]>>;
	getAvailability(
		filter: AvailabilityFilter,
	): Promise<Result<StockAvailability[]>>;
	getReservationById(
		organizationId: string,
		id: string,
	): Promise<Result<StockReservation | null>>;
	getReservationByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockReservation | null>>;
	/** Ledger row count for availability asOfLedgerSequence (org-scoped). */
	getLedgerSequence(organizationId: string): Promise<Result<number>>;
	listLedgerEntries(organizationId: string): Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantityDelta: string;
			}>
		>
	>;
	listBalances(organizationId: string): Promise<Result<StockBalance[]>>;
	listActiveReservations(organizationId: string): Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantity: string;
				consumedQuantity: string;
			}>
		>
	>;
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
	baseUomId: string | null;
	baseUomCode: string | null;
	onHandDelta: number;
	reservedDelta: number;
	availableDelta: number;
	quantityDelta: number;
	movementLineId: string | null;
};

/**
 * Compute per-warehouse balance deltas for a posted physical movement.
 * Reservations never flow through this helper — they use reserve/release store methods.
 * In-transit transfers are not supported; both legs apply in one post.
 */
export function computeBalanceEffects(
	movement: StockMovement,
): BalanceEffect[] {
	const effects: BalanceEffect[] = [];
	for (const line of movement.lines) {
		const qty = parseQuantity(line.quantity);
		const uom = {
			baseUomId: line.baseUomId,
			baseUomCode: line.baseUomCode,
		};
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
					...uom,
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
					...uom,
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
					...uom,
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
					...uom,
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
					...uom,
					onHandDelta: qty,
					reservedDelta: 0,
					availableDelta: qty,
					quantityDelta: qty,
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
