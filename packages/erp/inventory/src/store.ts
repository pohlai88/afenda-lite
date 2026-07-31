import type { Result } from "@afenda/errors";

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

export interface MovementCreateRecord {
	adjustmentNote: string | null;
	adjustmentReasonCode: string | null;
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	fromWarehouseCode: string | null;
	fromWarehouseId: string | null;
	fromWarehouseName: string | null;
	movementType: StockMovementType;
	normalizedCode: string;
	organizationId: string;
	reservationId: string | null;
	reversesMovementId: string | null;
	source: InventoryMovementSource;
	sourceAggregateId: string | null;
	sourceEventId: string | null;
	sourceEventVersion: number | null;
	sourceLineId: string | null;
	sourceModule: string | null;
	toWarehouseCode: string | null;
	toWarehouseId: string | null;
	toWarehouseName: string | null;
	warehouseCode: string | null;
	warehouseId: string | null;
	warehouseName: string | null;
}

export interface MovementLineCreateRecord {
	baseUomCode: string;
	baseUomId: string;
	createdBy: string;
	expectedVersion: number;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineIdempotencyKey: string;
	movementId: string;
	organizationId: string;
	quantity: string;
}

export interface MovementPostRecord {
	actorUserId: string;
	expectedVersion: number;
	movementId: string;
	organizationId: string;
	postIdempotencyKey: string;
}

export interface MovementCancelRecord {
	actorUserId: string;
	cancelIdempotencyKey: string;
	expectedVersion: number;
	movementId: string;
	organizationId: string;
}

export interface ReservationCreateRecord {
	baseUomCode: string;
	baseUomId: string;
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	normalizedCode: string;
	organizationId: string;
	quantity: string;
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}

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

export interface ReservationReleaseRecord {
	actorUserId: string;
	expectedVersion: number;
	organizationId: string;
	releaseIdempotencyKey: string;
	reservationId: string;
	/** Balance-freeing terminal; release / expire / cancel share one store path. */
	terminalStatus: ReservationTerminalStatus;
}

export interface MovementListFilter {
	movementType?: StockMovementType | undefined;
	organizationId: string;
	page: number;
	pageSize: number;
	status?: StockMovementStatus | undefined;
}

export interface ReservationListFilter {
	itemId?: string | undefined;
	organizationId: string;
	page: number;
	pageSize: number;
	status?: StockReservationStatus | undefined;
	warehouseId?: string | undefined;
}

export interface AvailabilityFilter {
	itemId?: string | undefined;
	organizationId: string;
	warehouseId?: string | undefined;
}

export interface InventoryStore {
	addLine: (
		record: MovementLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<StockMovementLine>>;
	cancelMovement: (
		record: MovementCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<StockMovement>>;
	createMovement: (
		record: MovementCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<StockMovement>>;
	getAvailability: (
		filter: AvailabilityFilter,
	) => Promise<Result<StockAvailability[]>>;
	/** Ledger row count for availability asOfLedgerSequence (org-scoped). */
	getLedgerSequence: (organizationId: string) => Promise<Result<number>>;
	getMovementByCreateIdempotencyKey: (
		organizationId: string,
		createIdempotencyKey: string,
	) => Promise<Result<StockMovement | null>>;
	getMovementById: (
		organizationId: string,
		id: string,
	) => Promise<Result<StockMovement | null>>;
	getReservationByCreateIdempotencyKey: (
		organizationId: string,
		createIdempotencyKey: string,
	) => Promise<Result<StockReservation | null>>;
	getReservationById: (
		organizationId: string,
		id: string,
	) => Promise<Result<StockReservation | null>>;
	listActiveReservations: (organizationId: string) => Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantity: string;
				consumedQuantity: string;
			}>
		>
	>;
	listBalances: (organizationId: string) => Promise<Result<StockBalance[]>>;
	listLedgerEntries: (organizationId: string) => Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantityDelta: string;
			}>
		>
	>;
	listMovements: (
		filter: MovementListFilter,
	) => Promise<Result<StockMovement[]>>;
	listReservations: (
		filter: ReservationListFilter,
	) => Promise<Result<StockReservation[]>>;
	postMovement: (
		record: MovementPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<StockMovement>>;
	releaseReservation: (
		record: ReservationReleaseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<StockReservation>>;
	reserveStock: (
		record: ReservationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<StockReservation>>;
}

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

export interface BalanceEffect {
	availableDelta: number;
	baseUomCode: string | null;
	baseUomId: string | null;
	itemCode: string;
	itemId: string;
	movementLineId: string | null;
	onHandDelta: number;
	quantityDelta: number;
	reservedDelta: number;
	warehouseCode: string;
	warehouseId: string;
}

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
