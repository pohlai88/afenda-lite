import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	INVENTORY_ERROR_CODE_CONFLICT,
	INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
	INVENTORY_ERROR_INSUFFICIENT_ON_HAND,
	INVENTORY_ERROR_INVALID_TRANSFER,
	INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
	INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED,
	INVENTORY_ERROR_MOVEMENT_EMPTY_LINES,
	INVENTORY_ERROR_MOVEMENT_NOT_DRAFT,
	INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
	INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT,
	INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED,
	INVENTORY_ERROR_RESERVATION_NOT_FOUND,
	INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT,
	inventoryErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import {
	type AvailabilityFilter,
	type BalanceEffect,
	balanceKey,
	computeBalanceEffects,
	formatQuantity,
	type InventoryStore,
	type MovementCancelRecord,
	type MovementCreateRecord,
	type MovementLineCreateRecord,
	type MovementListFilter,
	type MovementPostRecord,
	parseQuantity,
	type ReservationCreateRecord,
	type ReservationListFilter,
	type ReservationReleaseRecord,
	reservationTerminalEventType,
} from "./store";
import type {
	StockAvailability,
	StockBalance,
	StockLedgerEntry,
	StockMovement,
	StockMovementLine,
	StockReservation,
	StockReservationStatus,
} from "./types";

type BalanceRollback = Map<string, StockBalance | null>;

function cloneMovement(movement: StockMovement): StockMovement {
	return {
		...movement,
		lines: movement.lines.map((line) => ({ ...line })),
	};
}

function cloneBalance(balance: StockBalance): StockBalance {
	return { ...balance };
}

function cloneReservation(reservation: StockReservation): StockReservation {
	return { ...reservation };
}

function movementNotFound(): Result<never> {
	return fail(
		"NOT_FOUND",
		"Stock movement not found",
		inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_NOT_FOUND),
	);
}

function reservationNotFound(): Result<never> {
	return fail(
		"NOT_FOUND",
		"Stock reservation not found",
		inventoryErrorDetails(INVENTORY_ERROR_RESERVATION_NOT_FOUND),
	);
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

function isReleasableReservationStatus(
	status: StockReservationStatus,
): status is "active" | "partially_consumed" {
	return status === "active" || status === "partially_consumed";
}

function getReservationRemainingQuantity(reservation: StockReservation): number {
	return (
		parseQuantity(reservation.quantity) - parseQuantity(reservation.consumedQuantity)
	);
}

/** In-memory inventory store for Vitest domain tests. */
export class MemoryInventoryStore implements InventoryStore {
	private readonly movements = new Map<string, StockMovement>();
	private readonly balances = new Map<string, StockBalance>();
	private readonly reservations = new Map<string, StockReservation>();
	private readonly ledger: StockLedgerEntry[] = [];

	async createMovement(
		record: MovementCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		for (const existing of this.movements.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.createIdempotencyKey === record.createIdempotencyKey
			) {
				return ok(cloneMovement(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return fail(
					"CONFLICT",
					"Stock movement code already exists",
					inventoryErrorDetails(INVENTORY_ERROR_CODE_CONFLICT),
				);
			}
		}

		const now = new Date();
		const movement: StockMovement = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			movementType: record.movementType,
			status: "draft",
			source: record.source,
			warehouseId: record.warehouseId,
			warehouseCode: record.warehouseCode,
			warehouseName: record.warehouseName,
			fromWarehouseId: record.fromWarehouseId,
			fromWarehouseCode: record.fromWarehouseCode,
			fromWarehouseName: record.fromWarehouseName,
			toWarehouseId: record.toWarehouseId,
			toWarehouseCode: record.toWarehouseCode,
			toWarehouseName: record.toWarehouseName,
			reservationId: record.reservationId,
			reversesMovementId: record.reversesMovementId,
			adjustmentReasonCode: record.adjustmentReasonCode,
			adjustmentNote: record.adjustmentNote,
			sourceModule: record.sourceModule,
			sourceAggregateId: record.sourceAggregateId,
			sourceEventId: record.sourceEventId,
			sourceEventVersion: record.sourceEventVersion,
			sourceLineId: record.sourceLineId,
			createIdempotencyKey: record.createIdempotencyKey,
			postIdempotencyKey: null,
			cancelIdempotencyKey: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			postedAt: null,
			postedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
		};
		this.movements.set(movement.id, movement);

		const audit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: movement.createdBy,
			correlationId: meta.correlationId,
			entity: "stock_movement",
			entityId: movement.id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: movement.code }],
			newValue: {
				code: movement.code,
				status: movement.status,
				movementType: movement.movementType,
				source: movement.source,
			},
		});
		if (!audit.ok) {
			this.movements.delete(movement.id);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: movement.organizationId,
			actorUserId: movement.createdBy,
			correlationId: meta.correlationId,
			type: "inventory.movement.created.v1",
			payload: {
				organizationId: movement.organizationId,
				entityType: "stock_movement",
				entityId: movement.id,
				code: movement.code,
				version: movement.version,
				actorId: movement.createdBy,
				correlationId: meta.correlationId,
				movementType: movement.movementType,
			},
		});
		if (!outbox.ok) {
			this.movements.delete(movement.id);
			return outbox;
		}

		return ok(cloneMovement(movement));
	}

	async addLine(
		record: MovementLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovementLine>> {
		const movement = this.movements.get(record.movementId);
		if (
			movement === undefined ||
			movement.organizationId !== record.organizationId
		) {
			return movementNotFound();
		}

		const replay = movement.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return ok({ ...replay });
		}

		if (movement.status !== "draft") {
			return fail(
				"CONFLICT",
				"Cannot add lines to a non-draft stock movement",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_NOT_DRAFT),
			);
		}
		if (movement.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Stock movement version conflict",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT),
			);
		}

		const quantity = parseQuantity(record.quantity);
		if (movement.movementType === "adjustment") {
			if (quantity === 0) {
				return fail("BAD_REQUEST", "Adjustment quantity must be non-zero");
			}
		} else if (quantity <= 0) {
			return fail("BAD_REQUEST", "Quantity must be a positive number");
		}

		const previous = cloneMovement(movement);
		const now = new Date();
		const line: StockMovementLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			movementId: record.movementId,
			lineNo:
				movement.lines.reduce((max, current) => Math.max(max, current.lineNo), 0) +
				1,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantity: record.quantity,
			lineIdempotencyKey: record.lineIdempotencyKey,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		movement.lines.push(line);
		movement.updatedBy = record.createdBy;
		movement.updatedAt = now;
		movement.version += 1;

		const audit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "stock_movement_line",
			entityId: line.id,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: line.itemCode },
				{ field: "quantity", oldValue: null, newValue: line.quantity },
			],
			newValue: {
				movementId: line.movementId,
				lineNo: line.lineNo,
				itemCode: line.itemCode,
				quantity: line.quantity,
			},
		});
		if (!audit.ok) {
			Object.assign(movement, previous);
			return audit;
		}

		return ok({ ...line });
	}

	async postMovement(
		record: MovementPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const movement = this.movements.get(record.movementId);
		if (
			movement === undefined ||
			movement.organizationId !== record.organizationId
		) {
			return movementNotFound();
		}

		if (movement.status === "posted") {
			if (movement.postIdempotencyKey === record.postIdempotencyKey) {
				return ok(cloneMovement(movement));
			}
			return fail(
				"CONFLICT",
				"Stock movement is already posted",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED),
			);
		}
		if (movement.status === "cancelled") {
			return fail(
				"CONFLICT",
				"Cancelled stock movements cannot be posted",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED),
			);
		}
		if (movement.status !== "draft") {
			return fail(
				"CONFLICT",
				"Stock movement is not in draft status",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_NOT_DRAFT),
			);
		}
		if (movement.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Stock movement version conflict",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT),
			);
		}
		if (movement.lines.length === 0) {
			return fail(
				"CONFLICT",
				"Cannot post stock movement without lines",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_EMPTY_LINES),
			);
		}
		if (movement.reservationId !== null && movement.movementType !== "issue") {
			return fail(
				"CONFLICT",
				"Only issue movements may consume reservations",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_NOT_DRAFT),
			);
		}

		let effects: BalanceEffect[];
		try {
			effects = computeBalanceEffects(movement);
		} catch {
			return fail(
				"CONFLICT",
				"Stock movement warehouses are invalid",
				inventoryErrorDetails(INVENTORY_ERROR_INVALID_TRANSFER),
			);
		}

		let reservation: StockReservation | undefined;
		let consumedQuantity = 0;
		if (movement.reservationId !== null) {
			const reservationResult = await this.getReservationById(
				record.organizationId,
				movement.reservationId,
			);
			if (!reservationResult.ok) {
				return reservationResult;
			}
			if (reservationResult.data === null) {
				return reservationNotFound();
			}
			reservation = this.reservations.get(reservationResult.data.id);
			if (reservation === undefined) {
				return reservationNotFound();
			}
			if (
				reservation.status === "released" ||
				reservation.status === "expired" ||
				reservation.status === "cancelled"
			) {
				return fail(
					"CONFLICT",
					"Stock reservation cannot be consumed",
					inventoryErrorDetails(INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED),
				);
			}

			const adjustedEffects = this.applyReservationConsumption(effects, movement, reservation);
			if (!adjustedEffects.ok) {
				return adjustedEffects;
			}
			effects = adjustedEffects.data.effects;
			consumedQuantity = adjustedEffects.data.consumedQuantity;
		}

		const balanceApply = this.applyEffects(
			record.organizationId,
			record.actorUserId,
			effects,
		);
		if (!balanceApply.ok) {
			return balanceApply;
		}

		const previousMovement = cloneMovement(movement);
		const previousReservation =
			reservation === undefined ? undefined : cloneReservation(reservation);
		const ledgerSnapshot = this.ledger.length;
		const now = new Date();

		movement.status = "posted";
		movement.postIdempotencyKey = record.postIdempotencyKey;
		movement.postedAt = now;
		movement.postedBy = record.actorUserId;
		movement.updatedBy = record.actorUserId;
		movement.updatedAt = now;
		movement.version += 1;

		if (reservation !== undefined && consumedQuantity > 0) {
			const nextConsumedQuantity =
				parseQuantity(reservation.consumedQuantity) + consumedQuantity;
			const reservationQuantity = parseQuantity(reservation.quantity);
			reservation.consumedQuantity = formatQuantity(nextConsumedQuantity);
			reservation.status =
				nextConsumedQuantity >= reservationQuantity
					? "consumed"
					: "partially_consumed";
			reservation.updatedBy = record.actorUserId;
			reservation.updatedAt = now;
			reservation.version += 1;
		}

		let nextLedgerSequence = this.getLedgerSequenceValue(record.organizationId);
		for (const effect of effects) {
			const key = this.balanceMapKey(
				record.organizationId,
				effect.warehouseId,
				effect.itemId,
			);
			const balance = this.balances.get(key);
			if (balance === undefined) {
				this.restorePostMutationState(
					balanceApply.data,
					ledgerSnapshot,
					movement,
					previousMovement,
					reservation,
					previousReservation,
				);
				return fail("INTERNAL_ERROR", "Balance missing after movement post");
			}

			nextLedgerSequence += 1;
			this.ledger.push({
				id: randomUUID(),
				organizationId: record.organizationId,
				movementId: movement.id,
				movementLineId: effect.movementLineId,
				movementCode: movement.code,
				movementType: movement.movementType,
				warehouseId: effect.warehouseId,
				warehouseCode: effect.warehouseCode,
				itemId: effect.itemId,
				itemCode: effect.itemCode,
				quantityDelta: formatQuantity(effect.quantityDelta),
				onHandAfter: balance.onHand,
				reservedAfter: balance.reserved,
				availableAfter: balance.available,
				ledgerSequence: nextLedgerSequence,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				createdAt: now,
			});
		}

		const movementAudit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "stock_movement",
			entityId: movement.id,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
			oldValue: { status: previousMovement.status, version: previousMovement.version },
			newValue: { status: movement.status, version: movement.version },
		});
		if (!movementAudit.ok) {
			this.restorePostMutationState(
				balanceApply.data,
				ledgerSnapshot,
				movement,
				previousMovement,
				reservation,
				previousReservation,
			);
			return movementAudit;
		}

		if (reservation !== undefined && consumedQuantity > 0) {
			const reservationAudit = await ports.audit.record({
				organizationId: reservation.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "stock_reservation",
				entityId: reservation.id,
				action: "UPDATE",
				changes: [
					{
						field: "consumed_quantity",
						oldValue: previousReservation?.consumedQuantity ?? "0",
						newValue: reservation.consumedQuantity,
					},
					{
						field: "status",
						oldValue: previousReservation?.status ?? reservation.status,
						newValue: reservation.status,
					},
				],
				oldValue:
					previousReservation === undefined
						? undefined
						: {
								status: previousReservation.status,
								version: previousReservation.version,
								consumedQuantity: previousReservation.consumedQuantity,
							},
				newValue: {
					status: reservation.status,
					version: reservation.version,
					consumedQuantity: reservation.consumedQuantity,
				},
			});
			if (!reservationAudit.ok) {
				this.restorePostMutationState(
					balanceApply.data,
					ledgerSnapshot,
					movement,
					previousMovement,
					reservation,
					previousReservation,
				);
				return reservationAudit;
			}
		}

		const outbox = await ports.outbox.append({
			organizationId: movement.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "inventory.movement.posted.v1",
			payload: {
				organizationId: movement.organizationId,
				entityType: "stock_movement",
				entityId: movement.id,
				code: movement.code,
				version: movement.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
				movementType: movement.movementType,
			},
		});
		if (!outbox.ok) {
			this.restorePostMutationState(
				balanceApply.data,
				ledgerSnapshot,
				movement,
				previousMovement,
				reservation,
				previousReservation,
			);
			return outbox;
		}

		return ok(cloneMovement(movement));
	}

	async cancelMovement(
		record: MovementCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const movement = this.movements.get(record.movementId);
		if (
			movement === undefined ||
			movement.organizationId !== record.organizationId
		) {
			return movementNotFound();
		}
		if (movement.status === "cancelled") {
			if (movement.cancelIdempotencyKey === record.cancelIdempotencyKey) {
				return ok(cloneMovement(movement));
			}
			return fail(
				"CONFLICT",
				"Stock movement is already cancelled",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED),
			);
		}
		if (movement.status === "posted") {
			return fail(
				"CONFLICT",
				"Posted stock movements cannot be cancelled",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED),
			);
		}
		if (movement.status !== "draft") {
			return fail(
				"CONFLICT",
				"Only draft stock movements can be cancelled",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_NOT_DRAFT),
			);
		}
		if (movement.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Stock movement version conflict",
				inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT),
			);
		}

		const previous = cloneMovement(movement);
		const now = new Date();
		movement.status = "cancelled";
		movement.cancelIdempotencyKey = record.cancelIdempotencyKey;
		movement.cancelledAt = now;
		movement.cancelledBy = record.actorUserId;
		movement.updatedBy = record.actorUserId;
		movement.updatedAt = now;
		movement.version += 1;

		const audit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "stock_movement",
			entityId: movement.id,
			action: "UPDATE",
			changes: [
				{
					field: "status",
					oldValue: previous.status,
					newValue: "cancelled",
				},
			],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: movement.status, version: movement.version },
		});
		if (!audit.ok) {
			Object.assign(movement, previous);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: movement.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "inventory.movement.cancelled.v1",
			payload: {
				organizationId: movement.organizationId,
				entityType: "stock_movement",
				entityId: movement.id,
				code: movement.code,
				version: movement.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
				movementType: movement.movementType,
			},
		});
		if (!outbox.ok) {
			Object.assign(movement, previous);
			return outbox;
		}

		return ok(cloneMovement(movement));
	}

	async reserveStock(
		record: ReservationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockReservation>> {
		for (const existing of this.reservations.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.createIdempotencyKey === record.createIdempotencyKey
			) {
				return ok(cloneReservation(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return fail(
					"CONFLICT",
					"Stock reservation code already exists",
					inventoryErrorDetails(INVENTORY_ERROR_CODE_CONFLICT),
				);
			}
		}

		const quantity = parseQuantity(record.quantity);
		if (quantity <= 0) {
			return fail("BAD_REQUEST", "Reservation quantity must be positive");
		}

		const balanceApply = this.applyEffects(record.organizationId, record.createdBy, [
			{
				warehouseId: record.warehouseId,
				warehouseCode: record.warehouseCode,
				itemId: record.itemId,
				itemCode: record.itemCode,
				baseUomId: record.baseUomId,
				baseUomCode: record.baseUomCode,
				onHandDelta: 0,
				reservedDelta: quantity,
				availableDelta: -quantity,
				quantityDelta: 0,
				movementLineId: null,
			},
		]);
		if (!balanceApply.ok) {
			return balanceApply;
		}

		const now = new Date();
		const reservation: StockReservation = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "active",
			warehouseId: record.warehouseId,
			warehouseCode: record.warehouseCode,
			warehouseName: record.warehouseName,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantity: record.quantity,
			consumedQuantity: "0",
			createIdempotencyKey: record.createIdempotencyKey,
			releaseIdempotencyKey: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			releasedAt: null,
			releasedBy: null,
			createdAt: now,
			updatedAt: now,
		};
		this.reservations.set(reservation.id, reservation);

		const audit = await ports.audit.record({
			organizationId: reservation.organizationId,
			actorUserId: reservation.createdBy,
			correlationId: meta.correlationId,
			entity: "stock_reservation",
			entityId: reservation.id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: reservation.code }],
			newValue: {
				code: reservation.code,
				status: reservation.status,
				warehouseId: reservation.warehouseId,
				itemId: reservation.itemId,
				quantity: reservation.quantity,
			},
		});
		if (!audit.ok) {
			this.reservations.delete(reservation.id);
			this.restoreBalances(balanceApply.data);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: reservation.organizationId,
			actorUserId: reservation.createdBy,
			correlationId: meta.correlationId,
			type: "inventory.stock.reserved.v1",
			payload: {
				organizationId: reservation.organizationId,
				entityType: "stock_reservation",
				entityId: reservation.id,
				code: reservation.code,
				version: reservation.version,
				actorId: reservation.createdBy,
				correlationId: meta.correlationId,
				warehouseId: reservation.warehouseId,
				itemId: reservation.itemId,
				quantity: reservation.quantity,
			},
		});
		if (!outbox.ok) {
			this.reservations.delete(reservation.id);
			this.restoreBalances(balanceApply.data);
			return outbox;
		}

		return ok(cloneReservation(reservation));
	}

	async releaseReservation(
		record: ReservationReleaseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockReservation>> {
		const reservation = this.reservations.get(record.reservationId);
		if (
			reservation === undefined ||
			reservation.organizationId !== record.organizationId
		) {
			return reservationNotFound();
		}
		if (reservation.status === record.terminalStatus) {
			if (reservation.releaseIdempotencyKey === record.releaseIdempotencyKey) {
				return ok(cloneReservation(reservation));
			}
			return fail(
				"CONFLICT",
				"Stock reservation is already terminated",
				inventoryErrorDetails(INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED),
			);
		}
		if (!isReleasableReservationStatus(reservation.status)) {
			return fail(
				"CONFLICT",
				"Stock reservation cannot be terminated",
				inventoryErrorDetails(INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED),
			);
		}
		if (reservation.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Stock reservation version conflict",
				inventoryErrorDetails(INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT),
			);
		}

		const remainingQuantity = getReservationRemainingQuantity(reservation);
		if (remainingQuantity < 0) {
			return fail(
				"CONFLICT",
				"Stock reservation remaining quantity is invalid",
				inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
			);
		}

		const balanceApply =
			remainingQuantity === 0
				? ok(new Map<string, StockBalance | null>())
				: this.applyEffects(record.organizationId, record.actorUserId, [
						{
							warehouseId: reservation.warehouseId,
							warehouseCode: reservation.warehouseCode,
							itemId: reservation.itemId,
							itemCode: reservation.itemCode,
							baseUomId: reservation.baseUomId,
							baseUomCode: reservation.baseUomCode,
							onHandDelta: 0,
							reservedDelta: -remainingQuantity,
							availableDelta: remainingQuantity,
							quantityDelta: 0,
							movementLineId: null,
						},
					]);
		if (!balanceApply.ok) {
			return balanceApply;
		}

		const previous = cloneReservation(reservation);
		const now = new Date();
		const eventType = reservationTerminalEventType(record.terminalStatus);
		reservation.status = record.terminalStatus;
		reservation.releaseIdempotencyKey = record.releaseIdempotencyKey;
		reservation.releasedAt = now;
		reservation.releasedBy = record.actorUserId;
		reservation.updatedBy = record.actorUserId;
		reservation.updatedAt = now;
		reservation.version += 1;

		const audit = await ports.audit.record({
			organizationId: reservation.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "stock_reservation",
			entityId: reservation.id,
			action: "UPDATE",
			changes: [
				{
					field: "status",
					oldValue: previous.status,
					newValue: record.terminalStatus,
				},
			],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: reservation.status, version: reservation.version },
		});
		if (!audit.ok) {
			Object.assign(reservation, previous);
			this.restoreBalances(balanceApply.data);
			return audit;
		}

		const outbox = await ports.outbox.append({
			organizationId: reservation.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: eventType,
			payload: {
				organizationId: reservation.organizationId,
				entityType: "stock_reservation",
				entityId: reservation.id,
				code: reservation.code,
				version: reservation.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
				warehouseId: reservation.warehouseId,
				itemId: reservation.itemId,
				quantity: formatQuantity(remainingQuantity),
			},
		});
		if (!outbox.ok) {
			Object.assign(reservation, previous);
			this.restoreBalances(balanceApply.data);
			return outbox;
		}

		return ok(cloneReservation(reservation));
	}

	async getMovementById(
		organizationId: string,
		id: string,
	): Promise<Result<StockMovement | null>> {
		const movement = this.movements.get(id);
		if (movement === undefined || movement.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneMovement(movement));
	}

	async getMovementByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockMovement | null>> {
		for (const movement of this.movements.values()) {
			if (
				movement.organizationId === organizationId &&
				movement.createIdempotencyKey === createIdempotencyKey
			) {
				return ok(cloneMovement(movement));
			}
		}
		return ok(null);
	}

	async listMovements(
		filter: MovementListFilter,
	): Promise<Result<StockMovement[]>> {
		const rows = [...this.movements.values()]
			.filter((movement) => movement.organizationId === filter.organizationId)
			.filter(
				(movement) =>
					filter.status === undefined || movement.status === filter.status,
			)
			.filter(
				(movement) =>
					filter.movementType === undefined ||
					movement.movementType === filter.movementType,
			)
			.sort((left, right) => {
				const updatedAtDelta =
					right.updatedAt.getTime() - left.updatedAt.getTime();
				if (updatedAtDelta !== 0) {
					return updatedAtDelta;
				}
				return right.id.localeCompare(left.id);
			})
			.map(cloneMovement);
		return ok(paginate(rows, filter.page, filter.pageSize));
	}

	async listReservations(
		filter: ReservationListFilter,
	): Promise<Result<StockReservation[]>> {
		const rows = [...this.reservations.values()]
			.filter((reservation) => reservation.organizationId === filter.organizationId)
			.filter(
				(reservation) =>
					filter.status === undefined || reservation.status === filter.status,
			)
			.filter(
				(reservation) =>
					filter.warehouseId === undefined ||
					reservation.warehouseId === filter.warehouseId,
			)
			.filter(
				(reservation) =>
					filter.itemId === undefined || reservation.itemId === filter.itemId,
			)
			.sort((left, right) => {
				const updatedDelta =
					right.updatedAt.getTime() - left.updatedAt.getTime();
				if (updatedDelta !== 0) {
					return updatedDelta;
				}
				return right.id.localeCompare(left.id);
			})
			.map(cloneReservation);
		return ok(paginate(rows, filter.page, filter.pageSize));
	}

	async getAvailability(
		filter: AvailabilityFilter,
	): Promise<Result<StockAvailability[]>> {
		const asOfLedgerSequence = this.getLedgerSequenceValue(filter.organizationId);
		const rows = [...this.balances.values()]
			.filter((balance) => balance.organizationId === filter.organizationId)
			.filter(
				(balance) =>
					filter.warehouseId === undefined ||
					balance.warehouseId === filter.warehouseId,
			)
			.filter(
				(balance) =>
					filter.itemId === undefined || balance.itemId === filter.itemId,
			)
			.sort((left, right) => {
				const warehouseDelta = left.warehouseCode.localeCompare(
					right.warehouseCode,
				);
				if (warehouseDelta !== 0) {
					return warehouseDelta;
				}
				return left.itemCode.localeCompare(right.itemCode);
			})
			.map((balance) => ({
				organizationId: balance.organizationId,
				warehouseId: balance.warehouseId,
				warehouseCode: balance.warehouseCode,
				itemId: balance.itemId,
				itemCode: balance.itemCode,
				baseUomId: balance.baseUomId,
				baseUomCode: balance.baseUomCode,
				onHandQuantity: balance.onHand,
				reservedQuantity: balance.reserved,
				availableQuantity: balance.available,
				asOfLedgerSequence,
				balanceVersion: balance.version,
			}));
		return ok(rows);
	}

	async getReservationById(
		organizationId: string,
		id: string,
	): Promise<Result<StockReservation | null>> {
		const reservation = this.reservations.get(id);
		if (
			reservation === undefined ||
			reservation.organizationId !== organizationId
		) {
			return ok(null);
		}
		return ok(cloneReservation(reservation));
	}

	async getReservationByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockReservation | null>> {
		for (const reservation of this.reservations.values()) {
			if (
				reservation.organizationId === organizationId &&
				reservation.createIdempotencyKey === createIdempotencyKey
			) {
				return ok(cloneReservation(reservation));
			}
		}
		return ok(null);
	}

	async getLedgerSequence(organizationId: string): Promise<Result<number>> {
		return ok(this.getLedgerSequenceValue(organizationId));
	}

	async listLedgerEntries(
		organizationId: string,
	): Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantityDelta: string;
			}>
		>
	> {
		return ok(
			this.ledger
				.filter((entry) => entry.organizationId === organizationId)
				.sort((left, right) => left.ledgerSequence - right.ledgerSequence)
				.map((entry) => ({
					warehouseId: entry.warehouseId,
					itemId: entry.itemId,
					quantityDelta: entry.quantityDelta,
				})),
		);
	}

	async listBalances(organizationId: string): Promise<Result<StockBalance[]>> {
		return ok(
			[...this.balances.values()]
				.filter((balance) => balance.organizationId === organizationId)
				.sort((left, right) => {
					const warehouseDelta = left.warehouseCode.localeCompare(
						right.warehouseCode,
					);
					if (warehouseDelta !== 0) {
						return warehouseDelta;
					}
					return left.itemCode.localeCompare(right.itemCode);
				})
				.map(cloneBalance),
		);
	}

	async listActiveReservations(
		organizationId: string,
	): Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantity: string;
				consumedQuantity: string;
			}>
		>
	> {
		return ok(
			[...this.reservations.values()]
				.filter((reservation) => reservation.organizationId === organizationId)
				.filter((reservation) =>
					isReleasableReservationStatus(reservation.status),
				)
				.sort((left, right) => {
					const warehouseDelta = left.warehouseCode.localeCompare(
						right.warehouseCode,
					);
					if (warehouseDelta !== 0) {
						return warehouseDelta;
					}
					const itemDelta = left.itemCode.localeCompare(right.itemCode);
					if (itemDelta !== 0) {
						return itemDelta;
					}
					return left.id.localeCompare(right.id);
				})
				.map((reservation) => ({
					warehouseId: reservation.warehouseId,
					itemId: reservation.itemId,
					quantity: reservation.quantity,
					consumedQuantity: reservation.consumedQuantity,
				})),
		);
	}

	private balanceMapKey(
		organizationId: string,
		warehouseId: string,
		itemId: string,
	): string {
		return `${organizationId}:${balanceKey(warehouseId, itemId)}`;
	}

	private getLedgerSequenceValue(organizationId: string): number {
		let count = 0;
		for (const entry of this.ledger) {
			if (entry.organizationId === organizationId) {
				count += 1;
			}
		}
		return count;
	}

	private applyReservationConsumption(
		effects: BalanceEffect[],
		movement: StockMovement,
		reservation: StockReservation,
	): Result<{ effects: BalanceEffect[]; consumedQuantity: number }> {
		if (movement.warehouseId === null || movement.warehouseCode === null) {
			return fail(
				"CONFLICT",
				"Issue movement missing warehouse for reservation consumption",
				inventoryErrorDetails(INVENTORY_ERROR_INVALID_TRANSFER),
			);
		}
		if (movement.warehouseId !== reservation.warehouseId) {
			return fail(
				"CONFLICT",
				"Linked reservation belongs to a different warehouse",
				inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
			);
		}

		const quantitiesByLineId = new Map<string, number>();
		let consumedQuantity = 0;
		for (const line of movement.lines) {
			if (line.itemId !== reservation.itemId) {
				continue;
			}
			const quantity = parseQuantity(line.quantity);
			quantitiesByLineId.set(line.id, quantity);
			consumedQuantity += quantity;
		}

		if (consumedQuantity <= 0) {
			return fail(
				"CONFLICT",
				"Linked reservation does not match any issue line",
				inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
			);
		}

		const remainingQuantity = getReservationRemainingQuantity(reservation);
		if (remainingQuantity < consumedQuantity) {
			return fail(
				"CONFLICT",
				"Reservation remaining quantity is insufficient for issue post",
				inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
			);
		}

		return ok({
			consumedQuantity,
			effects: effects.map((effect) => {
				const lineQuantity =
					effect.movementLineId === null
						? undefined
						: quantitiesByLineId.get(effect.movementLineId);
				if (lineQuantity === undefined) {
					return effect;
				}
				return {
					...effect,
					reservedDelta: effect.reservedDelta - lineQuantity,
					availableDelta: effect.availableDelta + lineQuantity,
				};
			}),
		});
	}

	private applyEffects(
		organizationId: string,
		actorUserId: string,
		effects: BalanceEffect[],
	): Result<BalanceRollback> {
		const rollback = new Map<string, StockBalance | null>();
		const now = new Date();

		for (const effect of effects) {
			const key = this.balanceMapKey(
				organizationId,
				effect.warehouseId,
				effect.itemId,
			);
			const existing = this.balances.get(key);
			if (!rollback.has(key)) {
				rollback.set(key, existing === undefined ? null : cloneBalance(existing));
			}

			const onHand =
				(existing === undefined ? 0 : parseQuantity(existing.onHand)) +
				effect.onHandDelta;
			const reserved =
				(existing === undefined ? 0 : parseQuantity(existing.reserved)) +
				effect.reservedDelta;
			const available =
				(existing === undefined ? 0 : parseQuantity(existing.available)) +
				effect.availableDelta;

			if (available < 0) {
				this.restoreBalances(rollback);
				return fail(
					"CONFLICT",
					"Insufficient available stock",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (reserved < 0) {
				this.restoreBalances(rollback);
				return fail(
					"CONFLICT",
					"Insufficient reserved stock",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (onHand < 0) {
				this.restoreBalances(rollback);
				return fail(
					"CONFLICT",
					"Stock on-hand would become negative",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_ON_HAND),
				);
			}

			if (existing === undefined) {
				this.balances.set(key, {
					id: randomUUID(),
					organizationId,
					warehouseId: effect.warehouseId,
					warehouseCode: effect.warehouseCode,
					itemId: effect.itemId,
					itemCode: effect.itemCode,
					baseUomId: effect.baseUomId,
					baseUomCode: effect.baseUomCode,
					onHand: formatQuantity(onHand),
					reserved: formatQuantity(reserved),
					available: formatQuantity(available),
					version: 1,
					updatedBy: actorUserId,
					createdAt: now,
					updatedAt: now,
				});
				continue;
			}

			existing.warehouseCode = effect.warehouseCode;
			existing.itemCode = effect.itemCode;
			existing.baseUomId = effect.baseUomId;
			existing.baseUomCode = effect.baseUomCode;
			existing.onHand = formatQuantity(onHand);
			existing.reserved = formatQuantity(reserved);
			existing.available = formatQuantity(available);
			existing.version += 1;
			existing.updatedBy = actorUserId;
			existing.updatedAt = now;
		}

		return ok(rollback);
	}

	private restoreBalances(rollback: BalanceRollback): void {
		for (const [key, previous] of rollback) {
			if (previous === null) {
				this.balances.delete(key);
				continue;
			}
			this.balances.set(key, previous);
		}
	}

	private restorePostMutationState(
		balanceRollback: BalanceRollback,
		ledgerSnapshot: number,
		movement: StockMovement,
		previousMovement: StockMovement,
		reservation: StockReservation | undefined,
		previousReservation: StockReservation | undefined,
	): void {
		this.restoreBalances(balanceRollback);
		this.ledger.length = ledgerSnapshot;
		Object.assign(movement, previousMovement);
		if (reservation !== undefined && previousReservation !== undefined) {
			Object.assign(reservation, previousReservation);
		}
	}
}

export function createMemoryInventoryStore(): MemoryInventoryStore {
	return new MemoryInventoryStore();
}
