import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import {
	type AvailabilityFilter,
	type BalanceEffect,
	balanceKey,
	computeBalanceEffects,
	formatQuantity,
	type InventoryStore,
	type MovementCreateRecord,
	type MovementLineCreateRecord,
	type MovementListFilter,
	type MovementPostRecord,
	parseQuantity,
} from "./store";
import type {
	StockBalance,
	StockLedgerEntry,
	StockMovement,
	StockMovementLine,
	StockReservation,
} from "./types";

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

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
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
				existing.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Stock movement code already exists");
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
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			postedAt: null,
			postedBy: null,
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
			return fail("NOT_FOUND", "Stock movement not found");
		}
		if (movement.status !== "draft") {
			return fail("CONFLICT", "Cannot add lines to a non-draft stock movement");
		}
		const qty = parseQuantity(record.quantity);
		if (movement.movementType === "adjustment") {
			if (qty === 0) {
				return fail("BAD_REQUEST", "Adjustment quantity must be non-zero");
			}
		} else if (qty <= 0) {
			return fail("BAD_REQUEST", "Quantity must be a positive number");
		}

		const now = new Date();
		const lineNo =
			movement.lines.reduce((max, line) => Math.max(max, line.lineNo), 0) + 1;
		const line: StockMovementLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			movementId: record.movementId,
			lineNo,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantity: record.quantity,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		movement.lines.push(line);
		movement.version += 1;
		movement.updatedBy = record.createdBy;
		movement.updatedAt = now;

		const audit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "stock_movement_line",
			entityId: line.id,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: line.itemCode },
			],
			newValue: {
				movementId: line.movementId,
				lineNo: line.lineNo,
				itemCode: line.itemCode,
				quantity: line.quantity,
			},
		});
		if (!audit.ok) {
			movement.lines.pop();
			movement.version -= 1;
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
			return fail("NOT_FOUND", "Stock movement not found");
		}
		if (movement.status !== "draft") {
			return fail("CONFLICT", "Stock movement is not in draft status");
		}
		if (movement.version !== record.expectedVersion) {
			return fail("CONFLICT", "Stock movement version conflict");
		}
		if (movement.lines.length === 0) {
			return fail("CONFLICT", "Cannot post stock movement without lines");
		}

		let reservation: StockReservation | undefined;
		if (movement.movementType === "reservation_release") {
			if (movement.reservationId === null) {
				return fail("CONFLICT", "Reservation release requires reservationId");
			}
			reservation = this.reservations.get(movement.reservationId);
			if (
				reservation === undefined ||
				reservation.organizationId !== record.organizationId
			) {
				return fail("NOT_FOUND", "Stock reservation not found");
			}
			if (reservation.status !== "active") {
				return fail("CONFLICT", "Stock reservation is not active");
			}
			if (
				record.reservationExpectedVersion !== undefined &&
				reservation.version !== record.reservationExpectedVersion
			) {
				return fail("CONFLICT", "Stock reservation version conflict");
			}
		}

		const effects = computeBalanceEffects(movement);
		const previousBalances = new Map<string, StockBalance>();
		const createdBalanceIds: string[] = [];
		const applied: Array<{ key: string; before: StockBalance | undefined }> =
			[];

		const applyResult = this.applyEffects(
			record.organizationId,
			record.actorUserId,
			effects,
			previousBalances,
			createdBalanceIds,
			applied,
		);
		if (!applyResult.ok) {
			this.rollbackBalances(applied, createdBalanceIds);
			return applyResult;
		}

		const now = new Date();
		const previous = cloneMovement(movement);
		const previousReservation =
			reservation === undefined ? undefined : cloneReservation(reservation);
		const ledgerSnapshot = this.ledger.length;

		movement.status = "posted";
		movement.postedAt = now;
		movement.postedBy = record.actorUserId;
		movement.updatedBy = record.actorUserId;
		movement.updatedAt = now;
		movement.version += 1;

		let createdReservation: StockReservation | undefined;
		if (movement.movementType === "reservation") {
			const line = movement.lines[0];
			if (line === undefined || movement.lines.length !== 1) {
				this.rollbackBalances(applied, createdBalanceIds);
				Object.assign(movement, previous);
				return fail(
					"CONFLICT",
					"Reservation movement must have exactly one line",
				);
			}
			if (movement.warehouseId === null || movement.warehouseName === null) {
				this.rollbackBalances(applied, createdBalanceIds);
				Object.assign(movement, previous);
				return fail("CONFLICT", "Reservation movement missing warehouse");
			}
			for (const existing of this.reservations.values()) {
				if (
					existing.organizationId === movement.organizationId &&
					existing.normalizedCode === movement.normalizedCode
				) {
					this.rollbackBalances(applied, createdBalanceIds);
					Object.assign(movement, previous);
					return fail("CONFLICT", "Stock reservation code already exists");
				}
			}
			createdReservation = {
				id: randomUUID(),
				organizationId: movement.organizationId,
				code: movement.code,
				normalizedCode: movement.normalizedCode,
				status: "active",
				warehouseId: movement.warehouseId,
				warehouseCode: movement.warehouseCode ?? "",
				warehouseName: movement.warehouseName,
				itemId: line.itemId,
				itemCode: line.itemCode,
				itemName: line.itemName,
				baseUomId: line.baseUomId,
				baseUomCode: line.baseUomCode,
				quantity: line.quantity,
				sourceMovementId: movement.id,
				releaseMovementId: null,
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				releasedAt: null,
				releasedBy: null,
				createdAt: now,
				updatedAt: now,
			};
			this.reservations.set(createdReservation.id, createdReservation);
			movement.reservationId = createdReservation.id;
		}

		if (
			movement.movementType === "reservation_release" &&
			reservation !== undefined
		) {
			reservation.status = "released";
			reservation.releaseMovementId = movement.id;
			reservation.releasedAt = now;
			reservation.releasedBy = record.actorUserId;
			reservation.updatedBy = record.actorUserId;
			reservation.updatedAt = now;
			reservation.version += 1;
		}

		for (const effect of effects) {
			const key = `${record.organizationId}:${balanceKey(effect.warehouseId, effect.itemId)}`;
			const balance = this.balances.get(key);
			if (balance === undefined) {
				this.rollbackBalances(applied, createdBalanceIds);
				this.ledger.length = ledgerSnapshot;
				Object.assign(movement, previous);
				if (createdReservation !== undefined) {
					this.reservations.delete(createdReservation.id);
				}
				if (previousReservation !== undefined && reservation !== undefined) {
					Object.assign(reservation, previousReservation);
				}
				return fail("INTERNAL_ERROR", "Balance missing after apply");
			}
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
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				createdAt: now,
			});
		}

		const audit = await ports.audit.record({
			organizationId: movement.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "stock_movement",
			entityId: movement.id,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: movement.status, version: movement.version },
		});
		if (!audit.ok) {
			this.rollbackBalances(applied, createdBalanceIds);
			this.ledger.length = ledgerSnapshot;
			Object.assign(movement, previous);
			if (createdReservation !== undefined) {
				this.reservations.delete(createdReservation.id);
			}
			if (previousReservation !== undefined && reservation !== undefined) {
				Object.assign(reservation, previousReservation);
			}
			return audit;
		}

		const postedOutbox = await ports.outbox.append({
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
		if (!postedOutbox.ok) {
			this.rollbackBalances(applied, createdBalanceIds);
			this.ledger.length = ledgerSnapshot;
			Object.assign(movement, previous);
			if (createdReservation !== undefined) {
				this.reservations.delete(createdReservation.id);
			}
			if (previousReservation !== undefined && reservation !== undefined) {
				Object.assign(reservation, previousReservation);
			}
			return postedOutbox;
		}

		if (createdReservation !== undefined) {
			const reservedOutbox = await ports.outbox.append({
				organizationId: movement.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				type: "inventory.stock.reserved.v1",
				payload: {
					organizationId: movement.organizationId,
					entityType: "stock_reservation",
					entityId: createdReservation.id,
					code: createdReservation.code,
					version: createdReservation.version,
					actorId: record.actorUserId,
					correlationId: meta.correlationId,
					warehouseId: createdReservation.warehouseId,
					itemId: createdReservation.itemId,
					quantity: createdReservation.quantity,
					movementId: movement.id,
				},
			});
			if (!reservedOutbox.ok) {
				this.rollbackBalances(applied, createdBalanceIds);
				this.ledger.length = ledgerSnapshot;
				Object.assign(movement, previous);
				this.reservations.delete(createdReservation.id);
				return reservedOutbox;
			}
		}

		if (
			movement.movementType === "reservation_release" &&
			reservation !== undefined
		) {
			const releasedOutbox = await ports.outbox.append({
				organizationId: movement.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				type: "inventory.reservation.released.v1",
				payload: {
					organizationId: movement.organizationId,
					entityType: "stock_reservation",
					entityId: reservation.id,
					code: reservation.code,
					version: reservation.version,
					actorId: record.actorUserId,
					correlationId: meta.correlationId,
					warehouseId: reservation.warehouseId,
					itemId: reservation.itemId,
					quantity: reservation.quantity,
					movementId: movement.id,
				},
			});
			if (!releasedOutbox.ok) {
				this.rollbackBalances(applied, createdBalanceIds);
				this.ledger.length = ledgerSnapshot;
				Object.assign(movement, previous);
				if (previousReservation !== undefined) {
					Object.assign(reservation, previousReservation);
				}
				return releasedOutbox;
			}
		}

		return ok(cloneMovement(movement));
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
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.map(cloneMovement);
		return ok(paginate(rows, filter.page, filter.pageSize));
	}

	async getAvailability(
		filter: AvailabilityFilter,
	): Promise<Result<StockBalance[]>> {
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
			.map(cloneBalance);
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

	private applyEffects(
		organizationId: string,
		actorUserId: string,
		effects: BalanceEffect[],
		_previousBalances: Map<string, StockBalance>,
		createdBalanceIds: string[],
		applied: Array<{ key: string; before: StockBalance | undefined }>,
	): Result<void> {
		const now = new Date();
		for (const effect of effects) {
			const key = `${organizationId}:${balanceKey(effect.warehouseId, effect.itemId)}`;
			const existing = this.balances.get(key);
			applied.push({
				key,
				before: existing === undefined ? undefined : cloneBalance(existing),
			});

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
				return fail(
					"CONFLICT",
					"Insufficient available stock for movement post",
				);
			}
			if (reserved < 0) {
				return fail("CONFLICT", "Insufficient reserved stock for release");
			}
			if (onHand < 0) {
				return fail("CONFLICT", "Stock on-hand would become negative");
			}

			if (existing === undefined) {
				const created: StockBalance = {
					id: randomUUID(),
					organizationId,
					warehouseId: effect.warehouseId,
					warehouseCode: effect.warehouseCode,
					itemId: effect.itemId,
					itemCode: effect.itemCode,
					onHand: formatQuantity(onHand),
					reserved: formatQuantity(reserved),
					available: formatQuantity(available),
					version: 1,
					updatedBy: actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				this.balances.set(key, created);
				createdBalanceIds.push(key);
			} else {
				existing.onHand = formatQuantity(onHand);
				existing.reserved = formatQuantity(reserved);
				existing.available = formatQuantity(available);
				existing.warehouseCode = effect.warehouseCode;
				existing.itemCode = effect.itemCode;
				existing.version += 1;
				existing.updatedBy = actorUserId;
				existing.updatedAt = now;
			}
		}
		return ok(undefined);
	}

	private rollbackBalances(
		applied: Array<{ key: string; before: StockBalance | undefined }>,
		createdBalanceIds: string[],
	): void {
		for (const createdKey of createdBalanceIds) {
			this.balances.delete(createdKey);
		}
		for (const entry of applied) {
			if (entry.before === undefined) {
				continue;
			}
			if (createdBalanceIds.includes(entry.key)) {
				continue;
			}
			this.balances.set(entry.key, entry.before);
		}
	}
}

export function createMemoryInventoryStore(): MemoryInventoryStore {
	return new MemoryInventoryStore();
}
