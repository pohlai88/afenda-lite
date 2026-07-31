import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type { MutationPorts } from "./ports";
import { resolveAsync } from "./resolve-async";
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

interface MemoryPostProceed {
	effects: BalanceEffect[];
	kind: "proceed";
}

interface MemoryPostReplay {
	kind: "replay";
}

type MemoryPostDecision = MemoryPostProceed | MemoryPostReplay;

interface MemoryPostReservation {
	consumedQuantity: number;
	effects: BalanceEffect[];
	reservation: StockReservation | undefined;
}

interface MemoryPostMutation {
	ledgerSnapshot: number;
	previousMovement: StockMovement;
	previousReservation: StockReservation | undefined;
}

interface MemoryPostMutationInput {
	balanceRollback: BalanceRollback;
	consumedQuantity: number;
	correlationId: string;
	effects: BalanceEffect[];
	movement: StockMovement;
	record: MovementPostRecord;
	reservation: StockReservation | undefined;
}

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

function decideMemoryMovementPost(
	movement: StockMovement,
	record: MovementPostRecord,
): Result<MemoryPostDecision> {
	if (movement.status === "posted") {
		return movement.postIdempotencyKey === record.postIdempotencyKey
			? errorResult.ok({ kind: "replay" })
			: errorResult.fail("CONFLICT", {
					publicMessage: "Stock movement is already posted",
				});
	}
	if (movement.status === "cancelled") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cancelled stock movements cannot be posted",
		});
	}
	if (movement.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement is not in draft status",
		});
	}
	if (movement.version !== record.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement version conflict",
		});
	}
	if (movement.lines.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post stock movement without lines",
		});
	}
	if (movement.reservationId !== null && movement.movementType !== "issue") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Only issue movements may consume reservations",
		});
	}
	try {
		return errorResult.ok({
			effects: computeBalanceEffects(movement),
			kind: "proceed",
		});
	} catch {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement warehouses are invalid",
		});
	}
}

function movementNotFound(): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Stock movement not found",
	});
}

function reservationNotFound(): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Stock reservation not found",
	});
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

function getReservationRemainingQuantity(
	reservation: StockReservation,
): number {
	return (
		parseQuantity(reservation.quantity) -
		parseQuantity(reservation.consumedQuantity)
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
				return errorResult.ok(cloneMovement(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Stock movement code already exists",
				});
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

		return errorResult.ok(cloneMovement(movement));
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
			(candidate) => candidate.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return errorResult.ok({ ...replay });
		}

		if (movement.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot add lines to a non-draft stock movement",
			});
		}
		if (movement.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock movement version conflict",
			});
		}

		const quantity = parseQuantity(record.quantity);
		if (movement.movementType === "adjustment") {
			if (quantity === 0) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "Adjustment quantity must be non-zero",
				});
			}
		} else if (quantity <= 0) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Quantity must be a positive number",
			});
		}

		const previous = cloneMovement(movement);
		const now = new Date();
		const line: StockMovementLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			movementId: record.movementId,
			lineNo:
				movement.lines.reduce(
					(max, current) => Math.max(max, current.lineNo),
					0,
				) + 1,
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

		return errorResult.ok({ ...line });
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

		const decision = decideMemoryMovementPost(movement, record);
		if (!decision.ok) {
			return decision;
		}
		if (decision.data.kind === "replay") {
			return errorResult.ok(cloneMovement(movement));
		}
		const reservationResult = await this.resolveMemoryPostReservation(
			record.organizationId,
			movement,
			decision.data.effects,
		);
		if (!reservationResult.ok) {
			return reservationResult;
		}
		const { consumedQuantity, effects, reservation } = reservationResult.data;

		const balanceApply = this.applyEffects(
			record.organizationId,
			record.actorUserId,
			effects,
		);
		if (!balanceApply.ok) {
			return balanceApply;
		}

		const mutation = this.applyMemoryPostMutation({
			balanceRollback: balanceApply.data,
			consumedQuantity,
			correlationId: meta.correlationId,
			effects,
			movement,
			record,
			reservation,
		});
		if (!mutation.ok) {
			return mutation;
		}
		const { ledgerSnapshot, previousMovement, previousReservation } =
			mutation.data;

		const movementAudit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "stock_movement",
			entityId: movement.id,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
			oldValue: {
				status: previousMovement.status,
				version: previousMovement.version,
			},
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

		return errorResult.ok(cloneMovement(movement));
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
				return errorResult.ok(cloneMovement(movement));
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock movement is already cancelled",
			});
		}
		if (movement.status === "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Posted stock movements cannot be cancelled",
			});
		}
		if (movement.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only draft stock movements can be cancelled",
			});
		}
		if (movement.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock movement version conflict",
			});
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

		return errorResult.ok(cloneMovement(movement));
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
				return errorResult.ok(cloneReservation(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Stock reservation code already exists",
				});
			}
		}

		const quantity = parseQuantity(record.quantity);
		if (quantity <= 0) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Reservation quantity must be positive",
			});
		}

		const balanceApply = this.applyEffects(
			record.organizationId,
			record.createdBy,
			[
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
			],
		);
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

		return errorResult.ok(cloneReservation(reservation));
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
				return errorResult.ok(cloneReservation(reservation));
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock reservation is already terminated",
			});
		}
		if (!isReleasableReservationStatus(reservation.status)) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock reservation cannot be terminated",
			});
		}
		if (reservation.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock reservation version conflict",
			});
		}

		const remainingQuantity = getReservationRemainingQuantity(reservation);
		if (remainingQuantity < 0) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock reservation remaining quantity is invalid",
			});
		}

		const balanceApply = this.applyReservationReleaseBalance(
			record.organizationId,
			record.actorUserId,
			reservation,
			remainingQuantity,
		);
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

		return errorResult.ok(cloneReservation(reservation));
	}

	getMovementById(
		organizationId: string,
		id: string,
	): Promise<Result<StockMovement | null>> {
		return resolveAsync(() => {
			const movement = this.movements.get(id);
			if (
				movement === undefined ||
				movement.organizationId !== organizationId
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneMovement(movement));
		});
	}

	getMovementByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockMovement | null>> {
		return resolveAsync(() => {
			for (const movement of this.movements.values()) {
				if (
					movement.organizationId === organizationId &&
					movement.createIdempotencyKey === createIdempotencyKey
				) {
					return errorResult.ok(cloneMovement(movement));
				}
			}
			return errorResult.ok(null);
		});
	}

	listMovements(filter: MovementListFilter): Promise<Result<StockMovement[]>> {
		return resolveAsync(() => {
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
			return errorResult.ok(paginate(rows, filter.page, filter.pageSize));
		});
	}

	listReservations(
		filter: ReservationListFilter,
	): Promise<Result<StockReservation[]>> {
		return resolveAsync(() => {
			const rows = [...this.reservations.values()]
				.filter(
					(reservation) => reservation.organizationId === filter.organizationId,
				)
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
			return errorResult.ok(paginate(rows, filter.page, filter.pageSize));
		});
	}

	getAvailability(
		filter: AvailabilityFilter,
	): Promise<Result<StockAvailability[]>> {
		return resolveAsync(() => {
			const asOfLedgerSequence = this.getLedgerSequenceValue(
				filter.organizationId,
			);
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
			return errorResult.ok(rows);
		});
	}

	getReservationById(
		organizationId: string,
		id: string,
	): Promise<Result<StockReservation | null>> {
		return resolveAsync(() => {
			const reservation = this.reservations.get(id);
			if (
				reservation === undefined ||
				reservation.organizationId !== organizationId
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneReservation(reservation));
		});
	}

	getReservationByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockReservation | null>> {
		return resolveAsync(() => {
			for (const reservation of this.reservations.values()) {
				if (
					reservation.organizationId === organizationId &&
					reservation.createIdempotencyKey === createIdempotencyKey
				) {
					return errorResult.ok(cloneReservation(reservation));
				}
			}
			return errorResult.ok(null);
		});
	}

	getLedgerSequence(organizationId: string): Promise<Result<number>> {
		return resolveAsync(() =>
			errorResult.ok(this.getLedgerSequenceValue(organizationId)),
		);
	}

	listLedgerEntries(organizationId: string): Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantityDelta: string;
			}>
		>
	> {
		return resolveAsync(() =>
			errorResult.ok(
				this.ledger
					.filter((entry) => entry.organizationId === organizationId)
					.sort((left, right) => left.ledgerSequence - right.ledgerSequence)
					.map((entry) => ({
						warehouseId: entry.warehouseId,
						itemId: entry.itemId,
						quantityDelta: entry.quantityDelta,
					})),
			),
		);
	}

	listBalances(organizationId: string): Promise<Result<StockBalance[]>> {
		return resolveAsync(() =>
			errorResult.ok(
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
			),
		);
	}

	listActiveReservations(organizationId: string): Promise<
		Result<
			Array<{
				warehouseId: string;
				itemId: string;
				quantity: string;
				consumedQuantity: string;
			}>
		>
	> {
		return resolveAsync(() =>
			errorResult.ok(
				[...this.reservations.values()]
					.filter(
						(reservation) => reservation.organizationId === organizationId,
					)
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
			),
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
			return errorResult.fail("INTERNAL_ERROR");
		}
		if (movement.warehouseId !== reservation.warehouseId) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Linked reservation belongs to a different warehouse",
			});
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
			return errorResult.fail("CONFLICT", {
				publicMessage: "Linked reservation does not match any issue line",
			});
		}

		const remainingQuantity = getReservationRemainingQuantity(reservation);
		if (remainingQuantity < consumedQuantity) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Reservation remaining quantity is insufficient for issue post",
			});
		}

		return errorResult.ok({
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

	private async resolveMemoryPostReservation(
		organizationId: string,
		movement: StockMovement,
		effects: BalanceEffect[],
	): Promise<Result<MemoryPostReservation>> {
		if (movement.reservationId === null) {
			return errorResult.ok({
				consumedQuantity: 0,
				effects,
				reservation: undefined,
			});
		}
		const reservationResult = await this.getReservationById(
			organizationId,
			movement.reservationId,
		);
		if (!reservationResult.ok) {
			return reservationResult;
		}
		if (reservationResult.data === null) {
			return reservationNotFound();
		}
		const reservation = this.reservations.get(reservationResult.data.id);
		if (reservation === undefined) {
			return reservationNotFound();
		}
		if (
			reservation.status === "released" ||
			reservation.status === "expired" ||
			reservation.status === "cancelled"
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Stock reservation cannot be consumed",
			});
		}
		const adjustedEffects = this.applyReservationConsumption(
			effects,
			movement,
			reservation,
		);
		return adjustedEffects.ok
			? errorResult.ok({ ...adjustedEffects.data, reservation })
			: adjustedEffects;
	}

	private applyMemoryPostMutation(
		input: MemoryPostMutationInput,
	): Result<MemoryPostMutation> {
		const previousMovement = cloneMovement(input.movement);
		const previousReservation =
			input.reservation === undefined
				? undefined
				: cloneReservation(input.reservation);
		const ledgerSnapshot = this.ledger.length;
		const now = new Date();

		input.movement.status = "posted";
		input.movement.postIdempotencyKey = input.record.postIdempotencyKey;
		input.movement.postedAt = now;
		input.movement.postedBy = input.record.actorUserId;
		input.movement.updatedBy = input.record.actorUserId;
		input.movement.updatedAt = now;
		input.movement.version += 1;

		if (input.reservation !== undefined && input.consumedQuantity > 0) {
			const nextConsumedQuantity =
				parseQuantity(input.reservation.consumedQuantity) +
				input.consumedQuantity;
			const reservationQuantity = parseQuantity(input.reservation.quantity);
			input.reservation.consumedQuantity = formatQuantity(nextConsumedQuantity);
			input.reservation.status =
				nextConsumedQuantity >= reservationQuantity
					? "consumed"
					: "partially_consumed";
			input.reservation.updatedBy = input.record.actorUserId;
			input.reservation.updatedAt = now;
			input.reservation.version += 1;
		}

		let nextLedgerSequence = this.getLedgerSequenceValue(
			input.record.organizationId,
		);
		for (const effect of input.effects) {
			const key = this.balanceMapKey(
				input.record.organizationId,
				effect.warehouseId,
				effect.itemId,
			);
			const balance = this.balances.get(key);
			if (balance === undefined) {
				this.restorePostMutationState(
					input.balanceRollback,
					ledgerSnapshot,
					input.movement,
					previousMovement,
					input.reservation,
					previousReservation,
				);
				return errorResult.fail("INTERNAL_ERROR");
			}
			nextLedgerSequence += 1;
			this.ledger.push({
				id: randomUUID(),
				organizationId: input.record.organizationId,
				movementId: input.movement.id,
				movementLineId: effect.movementLineId,
				movementCode: input.movement.code,
				movementType: input.movement.movementType,
				warehouseId: effect.warehouseId,
				warehouseCode: effect.warehouseCode,
				itemId: effect.itemId,
				itemCode: effect.itemCode,
				quantityDelta: formatQuantity(effect.quantityDelta),
				onHandAfter: balance.onHand,
				reservedAfter: balance.reserved,
				availableAfter: balance.available,
				ledgerSequence: nextLedgerSequence,
				actorUserId: input.record.actorUserId,
				correlationId: input.correlationId,
				createdAt: now,
			});
		}
		return errorResult.ok({
			ledgerSnapshot,
			previousMovement,
			previousReservation,
		});
	}

	private applyReservationReleaseBalance(
		organizationId: string,
		actorUserId: string,
		reservation: StockReservation,
		remainingQuantity: number,
	): Result<BalanceRollback> {
		if (remainingQuantity === 0) {
			return errorResult.ok(new Map<string, StockBalance | null>());
		}
		return this.applyEffects(organizationId, actorUserId, [
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
				rollback.set(
					key,
					existing === undefined ? null : cloneBalance(existing),
				);
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Insufficient available stock",
				});
			}
			if (reserved < 0) {
				this.restoreBalances(rollback);
				return errorResult.fail("CONFLICT", {
					publicMessage: "Insufficient reserved stock",
				});
			}
			if (onHand < 0) {
				this.restoreBalances(rollback);
				return errorResult.fail("CONFLICT", {
					publicMessage: "Stock on-hand would become negative",
				});
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

		return errorResult.ok(rollback);
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
