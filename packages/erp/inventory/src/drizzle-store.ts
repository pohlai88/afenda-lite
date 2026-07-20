import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	inArray,
	runNeonHttpTransaction,
	stockBalance,
	stockLedgerEntry,
	stockMovement,
	stockMovementLine,
	stockReservation,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	INVENTORY_ERROR_CODE_CONFLICT,
	INVENTORY_ERROR_DUPLICATE_SOURCE_EVENT,
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
import {
	INVENTORY_MOVEMENT_SOURCES,
	STOCK_MOVEMENT_STATUSES,
	STOCK_MOVEMENT_TYPES,
	STOCK_RESERVATION_STATUSES,
	type InventoryMovementSource,
	type StockAvailability,
	type StockBalance,
	type StockMovement,
	type StockMovementLine,
	type StockMovementStatus,
	type StockMovementType,
	type StockReservation,
	type StockReservationStatus,
} from "./types";

type TxIdRow = { id: string };

type MovementSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	movement_type: string;
	status: string;
	source: string;
	warehouse_id: string | null;
	warehouse_code: string | null;
	warehouse_name: string | null;
	from_warehouse_id: string | null;
	from_warehouse_code: string | null;
	from_warehouse_name: string | null;
	to_warehouse_id: string | null;
	to_warehouse_code: string | null;
	to_warehouse_name: string | null;
	reservation_id: string | null;
	reverses_movement_id: string | null;
	adjustment_reason_code: string | null;
	adjustment_note: string | null;
	source_module: string | null;
	source_aggregate_id: string | null;
	source_event_id: string | null;
	source_event_version: number | null;
	source_line_id: string | null;
	create_idempotency_key: string;
	post_idempotency_key: string | null;
	cancel_idempotency_key: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	posted_at: Date | null;
	posted_by: string | null;
	cancelled_at: Date | null;
	cancelled_by: string | null;
	created_at: Date;
	updated_at: Date;
};

type LineSqlRow = {
	id: string;
	organization_id: string;
	movement_id: string;
	line_no: number;
	item_id: string;
	item_code: string;
	item_name: string;
	base_uom_id: string;
	base_uom_code: string;
	quantity: string;
	line_idempotency_key: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function parseEnum<T extends string>(
	value: string,
	values: readonly T[],
	field: string,
): T {
	const found = values.find((candidate) => candidate === value);
	if (found === undefined) {
		throw new Error(`Invalid ${field}: ${value}`);
	}
	return found;
}

function parseMovementType(value: string): StockMovementType {
	return parseEnum(value, STOCK_MOVEMENT_TYPES, "stock_movement.movement_type");
}

function parseMovementStatus(value: string): StockMovementStatus {
	return parseEnum(value, STOCK_MOVEMENT_STATUSES, "stock_movement.status");
}

function parseMovementSource(value: string): InventoryMovementSource {
	return parseEnum(value, INVENTORY_MOVEMENT_SOURCES, "stock_movement.source");
}

function parseReservationStatus(value: string): StockReservationStatus {
	return parseEnum(value, STOCK_RESERVATION_STATUSES, "stock_reservation.status");
}

function mapLine(row: LineSqlRow): StockMovementLine {
	return {
		id: row.id,
		organizationId: row.organization_id,
		movementId: row.movement_id,
		lineNo: row.line_no,
		itemId: row.item_id,
		itemCode: row.item_code,
		itemName: row.item_name,
		baseUomId: row.base_uom_id,
		baseUomCode: row.base_uom_code,
		quantity: row.quantity,
		lineIdempotencyKey: row.line_idempotency_key,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapMovement(
	row: MovementSqlRow,
	lines: StockMovementLine[],
): StockMovement {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		movementType: parseMovementType(row.movement_type),
		status: parseMovementStatus(row.status),
		source: parseMovementSource(row.source),
		warehouseId: row.warehouse_id,
		warehouseCode: row.warehouse_code,
		warehouseName: row.warehouse_name,
		fromWarehouseId: row.from_warehouse_id,
		fromWarehouseCode: row.from_warehouse_code,
		fromWarehouseName: row.from_warehouse_name,
		toWarehouseId: row.to_warehouse_id,
		toWarehouseCode: row.to_warehouse_code,
		toWarehouseName: row.to_warehouse_name,
		reservationId: row.reservation_id,
		reversesMovementId: row.reverses_movement_id,
		adjustmentReasonCode: row.adjustment_reason_code,
		adjustmentNote: row.adjustment_note,
		sourceModule: row.source_module,
		sourceAggregateId: row.source_aggregate_id,
		sourceEventId: row.source_event_id,
		sourceEventVersion: row.source_event_version,
		sourceLineId: row.source_line_id,
		createIdempotencyKey: row.create_idempotency_key,
		postIdempotencyKey: row.post_idempotency_key,
		cancelIdempotencyKey: row.cancel_idempotency_key,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		postedAt: row.posted_at,
		postedBy: row.posted_by,
		cancelledAt: row.cancelled_at,
		cancelledBy: row.cancelled_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		lines,
	};
}

function mapHeaderRow(header: typeof stockMovement.$inferSelect): MovementSqlRow {
	return {
		id: header.id,
		organization_id: header.organizationId,
		code: header.code,
		normalized_code: header.normalizedCode,
		movement_type: header.movementType,
		status: header.status,
		source: header.source,
		warehouse_id: header.warehouseId,
		warehouse_code: header.warehouseCode,
		warehouse_name: header.warehouseName,
		from_warehouse_id: header.fromWarehouseId,
		from_warehouse_code: header.fromWarehouseCode,
		from_warehouse_name: header.fromWarehouseName,
		to_warehouse_id: header.toWarehouseId,
		to_warehouse_code: header.toWarehouseCode,
		to_warehouse_name: header.toWarehouseName,
		reservation_id: header.reservationId,
		reverses_movement_id: header.reversesMovementId,
		adjustment_reason_code: header.adjustmentReasonCode,
		adjustment_note: header.adjustmentNote,
		source_module: header.sourceModule,
		source_aggregate_id: header.sourceAggregateId,
		source_event_id: header.sourceEventId,
		source_event_version: header.sourceEventVersion,
		source_line_id: header.sourceLineId,
		create_idempotency_key: header.createIdempotencyKey,
		post_idempotency_key: header.postIdempotencyKey,
		cancel_idempotency_key: header.cancelIdempotencyKey,
		version: header.version,
		created_by: header.createdBy,
		updated_by: header.updatedBy,
		posted_at: header.postedAt,
		posted_by: header.postedBy,
		cancelled_at: header.cancelledAt,
		cancelled_by: header.cancelledBy,
		created_at: header.createdAt,
		updated_at: header.updatedAt,
	};
}

function mapLineFromSelect(
	line: typeof stockMovementLine.$inferSelect,
): StockMovementLine {
	return mapLine({
		id: line.id,
		organization_id: line.organizationId,
		movement_id: line.movementId,
		line_no: line.lineNo,
		item_id: line.itemId,
		item_code: line.itemCode,
		item_name: line.itemName,
		base_uom_id: line.baseUomId,
		base_uom_code: line.baseUomCode,
		quantity: line.quantity,
		line_idempotency_key: line.lineIdempotencyKey,
		version: line.version,
		created_by: line.createdBy,
		updated_by: line.updatedBy,
		created_at: line.createdAt,
		updated_at: line.updatedAt,
	});
}

function mapBalance(row: typeof stockBalance.$inferSelect): StockBalance {
	return {
		id: row.id,
		organizationId: row.organizationId,
		warehouseId: row.warehouseId,
		warehouseCode: row.warehouseCode,
		itemId: row.itemId,
		itemCode: row.itemCode,
		baseUomId: row.baseUomId,
		baseUomCode: row.baseUomCode,
		onHand: row.onHand,
		reserved: row.reserved,
		available: row.available,
		version: row.version,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapReservation(
	row: typeof stockReservation.$inferSelect,
): StockReservation {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		status: parseReservationStatus(row.status),
		warehouseId: row.warehouseId,
		warehouseCode: row.warehouseCode,
		warehouseName: row.warehouseName,
		itemId: row.itemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		baseUomId: row.baseUomId,
		baseUomCode: row.baseUomCode,
		quantity: row.quantity,
		consumedQuantity: row.consumedQuantity,
		createIdempotencyKey: row.createIdempotencyKey,
		releaseIdempotencyKey: row.releaseIdempotencyKey,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		releasedAt: row.releasedAt,
		releasedBy: row.releasedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function json(value: unknown): string {
	return JSON.stringify(value);
}

function writeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isUniqueViolation(error: unknown): boolean {
	return /unique|duplicate/i.test(writeErrorMessage(error));
}

function isCreateMovementIdempotencyConflict(error: unknown): boolean {
	return /stock_movement_org_create_idempotency_uidx|create_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

function isLineIdempotencyConflict(error: unknown): boolean {
	return /stock_movement_line_org_movement_idempotency_uidx|line_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

function isSourceEventConflict(error: unknown): boolean {
	return /stock_movement_org_source_event_uidx|source_event_id/i.test(
		writeErrorMessage(error),
	);
}

function isReservationCreateIdempotencyConflict(error: unknown): boolean {
	return /stock_reservation_org_create_idempotency_uidx|create_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return json([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return json(value);
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

function getReservationRemainingQuantity(reservation: StockReservation): number {
	return (
		parseQuantity(reservation.quantity) - parseQuantity(reservation.consumedQuantity)
	);
}

function isReleasableReservationStatus(
	status: StockReservationStatus,
): status is "active" | "partially_consumed" {
	return status === "active" || status === "partially_consumed";
}

type ConsumptionResult = {
	effects: BalanceEffect[];
	consumedQuantity: number;
};

function applyReservationConsumption(
	effects: BalanceEffect[],
	movement: StockMovement,
	reservation: StockReservation,
): Result<ConsumptionResult> {
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

export class DrizzleInventoryStore implements InventoryStore {
	private async loadMovementByHeader(
		header: typeof stockMovement.$inferSelect,
	): Promise<Result<StockMovement>> {
		try {
			const lines = await db
				.select()
				.from(stockMovementLine)
				.where(
					and(
						eq(stockMovementLine.organizationId, header.organizationId),
						eq(stockMovementLine.movementId, header.id),
					),
				)
				.orderBy(asc(stockMovementLine.lineNo), asc(stockMovementLine.id));
			return ok(
				mapMovement(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock movement lines");
		}
	}

	private async reloadMovement(
		organizationId: string,
		id: string,
		missingMessage: string,
	): Promise<Result<StockMovement>> {
		const reloaded = await this.getMovementById(organizationId, id);
		if (!reloaded.ok) {
			return reloaded;
		}
		if (reloaded.data === null) {
			return fail("INTERNAL_ERROR", missingMessage);
		}
		return ok(reloaded.data);
	}

	private async reloadReservation(
		organizationId: string,
		id: string,
		missingMessage: string,
	): Promise<Result<StockReservation>> {
		const reloaded = await this.getReservationById(organizationId, id);
		if (!reloaded.ok) {
			return reloaded;
		}
		if (reloaded.data === null) {
			return fail("INTERNAL_ERROR", missingMessage);
		}
		return ok(reloaded.data);
	}

	private async getLatestLedgerSequence(
		organizationId: string,
	): Promise<Result<number>> {
		try {
			const [row] = await db
				.select({ ledgerSequence: stockLedgerEntry.ledgerSequence })
				.from(stockLedgerEntry)
				.where(eq(stockLedgerEntry.organizationId, organizationId))
				.orderBy(desc(stockLedgerEntry.ledgerSequence))
				.limit(1);
			return ok(row?.ledgerSequence ?? 0);
		} catch (error) {
			return failFromUnknown(error, "Failed to load inventory ledger sequence");
		}
	}

	private async validateBalanceEffects(
		organizationId: string,
		effects: BalanceEffect[],
	): Promise<Result<void>> {
		for (const effect of effects) {
			const [row] = await db
				.select()
				.from(stockBalance)
				.where(
					and(
						eq(stockBalance.organizationId, organizationId),
						eq(stockBalance.warehouseId, effect.warehouseId),
						eq(stockBalance.itemId, effect.itemId),
					),
				)
				.limit(1);
			const onHand =
				(row === undefined ? 0 : parseQuantity(row.onHand)) + effect.onHandDelta;
			const reserved =
				(row === undefined ? 0 : parseQuantity(row.reserved)) +
				effect.reservedDelta;
			const available =
				(row === undefined ? 0 : parseQuantity(row.available)) +
				effect.availableDelta;
			if (available < 0) {
				return fail(
					"CONFLICT",
					"Insufficient available stock",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (reserved < 0) {
				return fail(
					"CONFLICT",
					"Insufficient reserved stock",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (onHand < 0) {
				return fail(
					"CONFLICT",
					"Stock on-hand would become negative",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_ON_HAND),
				);
			}
		}
		return ok(undefined);
	}

	async createMovement(
		record: MovementCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const snapshotJson = valueSnapshotJson({
			code: record.code,
			status: "draft",
			movementType: record.movementType,
			source: record.source,
		});
		const payloadJson = json({
			organizationId: record.organizationId,
			entityType: "stock_movement",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
			movementType: record.movementType,
			source: record.source,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[MovementSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO stock_movement (
							id, organization_id, code, normalized_code, movement_type, status, source,
							warehouse_id, warehouse_code, warehouse_name,
							from_warehouse_id, from_warehouse_code, from_warehouse_name,
							to_warehouse_id, to_warehouse_code, to_warehouse_name,
							reservation_id, reverses_movement_id,
							adjustment_reason_code, adjustment_note,
							source_module, source_aggregate_id, source_event_id, source_event_version, source_line_id,
							create_idempotency_key, version, created_by, updated_by
						) VALUES (
							${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.movementType}, 'draft', ${record.source},
							${record.warehouseId}, ${record.warehouseCode}, ${record.warehouseName},
							${record.fromWarehouseId}, ${record.fromWarehouseCode}, ${record.fromWarehouseName},
							${record.toWarehouseId}, ${record.toWarehouseCode}, ${record.toWarehouseName},
							${record.reservationId}, ${record.reversesMovementId},
							${record.adjustmentReasonCode}, ${record.adjustmentNote},
							${record.sourceModule}, ${record.sourceAggregateId}, ${record.sourceEventId},
							${record.sourceEventVersion}, ${record.sourceLineId},
							${record.createIdempotencyKey}, 1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'inventory', 'stock_movement', id, 'CREATE',
							${changesJson}::jsonb, ${snapshotJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'inventory.movement.created.v1', 'inventory',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Stock movement create returned no row");
			}
			return ok(mapMovement(row, []));
		} catch (error) {
			if (isCreateMovementIdempotencyConflict(error)) {
				const existing = await this.getMovementByCreateIdempotencyKey(
					record.organizationId,
					record.createIdempotencyKey,
				);
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					return ok(existing.data);
				}
			}
			if (isSourceEventConflict(error)) {
				return fail(
					"CONFLICT",
					"Stock movement source event already exists",
					inventoryErrorDetails(INVENTORY_ERROR_DUPLICATE_SOURCE_EVENT),
				);
			}
			if (isUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Stock movement code already exists",
					inventoryErrorDetails(INVENTORY_ERROR_CODE_CONFLICT),
				);
			}
			return failFromUnknown(error, "Failed to create stock movement");
		}
	}

	async addLine(
		record: MovementLineCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovementLine>> {
		const movementResult = await this.getMovementById(
			record.organizationId,
			record.movementId,
		);
		if (!movementResult.ok) {
			return movementResult;
		}
		if (movementResult.data === null) {
			return movementNotFound();
		}

		const movement = movementResult.data;
		const replay = movement.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return ok(replay);
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

		const lineNo =
			movement.lines.reduce((max, line) => Math.max(max, line.lineNo), 0) + 1;
		const lineId = randomUUID();
		const auditId = randomUUID();
		const changesJson = fieldChangeJson("item_code", null, record.itemCode);
		const snapshotJson = valueSnapshotJson({
			movementId: record.movementId,
			lineNo,
			itemCode: record.itemCode,
			quantity: record.quantity,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[LineSqlRow[]]>((sql) => [
				sql`
					WITH parent AS (
						UPDATE stock_movement
						SET version = version + 1,
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE id = ${record.movementId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
							AND version = ${record.expectedVersion}
						RETURNING id
					),
					mutated AS (
						INSERT INTO stock_movement_line (
							id, organization_id, movement_id, line_no,
							item_id, item_code, item_name, base_uom_id, base_uom_code,
							quantity, line_idempotency_key, version, created_by, updated_by
						)
						SELECT
							${lineId}, ${record.organizationId}, ${record.movementId}, ${lineNo},
							${record.itemId}, ${record.itemCode}, ${record.itemName},
							${record.baseUomId}, ${record.baseUomCode},
							${record.quantity}, ${record.lineIdempotencyKey}, 1,
							${record.createdBy}, ${record.createdBy}
						WHERE EXISTS (SELECT 1 FROM parent)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'inventory', 'stock_movement_line', id, 'CREATE',
							${changesJson}::jsonb, ${snapshotJson}::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"CONFLICT",
					"Stock movement version conflict",
					inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT),
				);
			}
			return ok(mapLine(row));
		} catch (error) {
			if (isLineIdempotencyConflict(error)) {
				const reloaded = await this.getMovementById(
					record.organizationId,
					record.movementId,
				);
				if (!reloaded.ok) {
					return reloaded;
				}
				const line = reloaded.data?.lines.find(
					(row) => row.lineIdempotencyKey === record.lineIdempotencyKey,
				);
				if (line !== undefined) {
					return ok(line);
				}
			}
			if (isUniqueViolation(error)) {
				return fail("CONFLICT", "Stock movement line conflict");
			}
			return failFromUnknown(error, "Failed to add stock movement line");
		}
	}

	async postMovement(
		record: MovementPostRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const movementResult = await this.getMovementById(
			record.organizationId,
			record.movementId,
		);
		if (!movementResult.ok) {
			return movementResult;
		}
		if (movementResult.data === null) {
			return movementNotFound();
		}

		const movement = movementResult.data;
		if (movement.status === "posted") {
			if (movement.postIdempotencyKey === record.postIdempotencyKey) {
				return ok(movement);
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

		let reservation: StockReservation | null = null;
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
			reservation = reservationResult.data;
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
			const adjustedEffects = applyReservationConsumption(
				effects,
				movement,
				reservation,
			);
			if (!adjustedEffects.ok) {
				return adjustedEffects;
			}
			effects = adjustedEffects.data.effects;
			consumedQuantity = adjustedEffects.data.consumedQuantity;
		}

		const balanceCheck = await this.validateBalanceEffects(
			record.organizationId,
			effects,
		);
		if (!balanceCheck.ok) {
			return balanceCheck;
		}

		const nextVersion = movement.version + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("status", "draft", "posted");
		const oldValueJson = valueSnapshotJson({
			status: "draft",
			version: movement.version,
		});
		const newValueJson = valueSnapshotJson({
			status: "posted",
			version: nextVersion,
		});
		const payloadJson = json({
			organizationId: record.organizationId,
			entityType: "stock_movement",
			entityId: movement.id,
			code: movement.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
			movementType: movement.movementType,
		});

		const reservationAuditId = consumedQuantity > 0 ? randomUUID() : null;
		const nextReservationConsumedQuantity =
			reservation === null
				? null
				: parseQuantity(reservation.consumedQuantity) + consumedQuantity;
		const nextReservationStatus =
			reservation === null || nextReservationConsumedQuantity === null
				? null
				: nextReservationConsumedQuantity >= parseQuantity(reservation.quantity)
					? "consumed"
					: "partially_consumed";

		try {
			const resultSets = await runNeonHttpTransaction<unknown[][]>((sql) => {
				const statements = [
					sql`
						WITH mutated AS (
							UPDATE stock_movement
							SET status = 'posted',
								post_idempotency_key = ${record.postIdempotencyKey},
								posted_at = now(),
								posted_by = ${record.actorUserId},
								updated_by = ${record.actorUserId},
								updated_at = now(),
								version = ${nextVersion}
							WHERE id = ${record.movementId}
								AND organization_id = ${record.organizationId}
								AND status = 'draft'
								AND version = ${record.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'inventory', 'stock_movement', id, 'UPDATE',
								${changesJson}::jsonb, ${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'inventory.movement.posted.v1', 'inventory',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.id FROM mutated, audited, outboxed
					`,
				];

				for (const effect of effects) {
					const balanceId = randomUUID();
					const ledgerId = randomUUID();
					const onHandDelta = formatQuantity(effect.onHandDelta);
					const reservedDelta = formatQuantity(effect.reservedDelta);
					const availableDelta = formatQuantity(effect.availableDelta);
					const quantityDelta = formatQuantity(effect.quantityDelta);
					statements.push(sql`
						WITH upserted AS (
							INSERT INTO stock_balance (
								id, organization_id, warehouse_id, warehouse_code, item_id, item_code,
								base_uom_id, base_uom_code,
								on_hand, reserved, available, version, updated_by
							)
							SELECT
								${balanceId}, ${record.organizationId}, ${effect.warehouseId}, ${effect.warehouseCode},
								${effect.itemId}, ${effect.itemCode},
								${effect.baseUomId}, ${effect.baseUomCode},
								CAST(${onHandDelta} AS numeric(24, 12)),
								CAST(${reservedDelta} AS numeric(24, 12)),
								CAST(${availableDelta} AS numeric(24, 12)),
								1, ${record.actorUserId}
							WHERE CAST(${onHandDelta} AS numeric(24, 12)) >= 0
								AND CAST(${reservedDelta} AS numeric(24, 12)) >= 0
								AND CAST(${availableDelta} AS numeric(24, 12)) >= 0
							ON CONFLICT (organization_id, warehouse_id, item_id)
							DO UPDATE SET
								on_hand = stock_balance.on_hand + CAST(${onHandDelta} AS numeric(24, 12)),
								reserved = stock_balance.reserved + CAST(${reservedDelta} AS numeric(24, 12)),
								available = stock_balance.available + CAST(${availableDelta} AS numeric(24, 12)),
								warehouse_code = EXCLUDED.warehouse_code,
								item_code = EXCLUDED.item_code,
								base_uom_id = COALESCE(EXCLUDED.base_uom_id, stock_balance.base_uom_id),
								base_uom_code = COALESCE(EXCLUDED.base_uom_code, stock_balance.base_uom_code),
								version = stock_balance.version + 1,
								updated_by = EXCLUDED.updated_by,
								updated_at = now()
							WHERE stock_balance.on_hand + CAST(${onHandDelta} AS numeric(24, 12)) >= 0
								AND stock_balance.reserved + CAST(${reservedDelta} AS numeric(24, 12)) >= 0
								AND stock_balance.available + CAST(${availableDelta} AS numeric(24, 12)) >= 0
							RETURNING *
						),
						ledgered AS (
							INSERT INTO stock_ledger_entry (
								id, organization_id, movement_id, movement_line_id, movement_code, movement_type,
								warehouse_id, warehouse_code, item_id, item_code,
								quantity_delta, on_hand_after, reserved_after, available_after,
								ledger_sequence, actor_user_id, correlation_id
							)
							SELECT
								${ledgerId}, organization_id, ${record.movementId}, ${effect.movementLineId},
								${movement.code}, ${movement.movementType},
								warehouse_id, warehouse_code, item_id, item_code,
								CAST(${quantityDelta} AS numeric(24, 12)),
								on_hand, reserved, available,
								(
									SELECT COALESCE(MAX(ledger_sequence), 0) + 1
									FROM stock_ledger_entry
									WHERE organization_id = ${record.organizationId}
								),
								${record.actorUserId}, ${meta.correlationId}
							FROM upserted
							RETURNING id
						)
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM upserted)
								THEN (SELECT id FROM upserted LIMIT 1)
							ELSE (SELECT (1 / 0)::uuid)
						END AS id
					`);
				}

				if (
					reservation !== null &&
					consumedQuantity > 0 &&
					reservationAuditId !== null &&
					nextReservationConsumedQuantity !== null &&
					nextReservationStatus !== null
				) {
					const reservationChangesJson = json([
						{
							field: "consumed_quantity",
							oldValue: reservation.consumedQuantity,
							newValue: formatQuantity(nextReservationConsumedQuantity),
						},
						{
							field: "status",
							oldValue: reservation.status,
							newValue: nextReservationStatus,
						},
					]);
					const reservationOldValueJson = valueSnapshotJson({
						status: reservation.status,
						version: reservation.version,
						consumedQuantity: reservation.consumedQuantity,
					});
					const reservationNewValueJson = valueSnapshotJson({
						status: nextReservationStatus,
						version: reservation.version + 1,
						consumedQuantity: formatQuantity(nextReservationConsumedQuantity),
					});
					statements.push(sql`
						WITH mutated AS (
							UPDATE stock_reservation
							SET consumed_quantity = CAST(${formatQuantity(nextReservationConsumedQuantity)} AS numeric(24, 12)),
								status = ${nextReservationStatus},
								updated_by = ${record.actorUserId},
								updated_at = now(),
								version = version + 1
							WHERE id = ${reservation.id}
								AND organization_id = ${record.organizationId}
								AND version = ${reservation.version}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${reservationAuditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'inventory', 'stock_reservation', id, 'UPDATE',
								${reservationChangesJson}::jsonb,
								${reservationOldValueJson}::jsonb,
								${reservationNewValueJson}::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM mutated)
								THEN (SELECT id FROM mutated LIMIT 1)
							ELSE (SELECT (1 / 0)::uuid)
						END AS id
					`);
				}

				return statements;
			});

			const headerRows = resultSets[0];
			if (!Array.isArray(headerRows) || headerRows[0] === undefined) {
				const reloaded = await this.getMovementById(
					record.organizationId,
					record.movementId,
				);
				if (!reloaded.ok) {
					return reloaded;
				}
				if (
					reloaded.data !== null &&
					reloaded.data.status === "posted" &&
					reloaded.data.postIdempotencyKey === record.postIdempotencyKey
				) {
					return ok(reloaded.data);
				}
				return fail(
					"CONFLICT",
					"Stock movement version conflict",
					inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT),
				);
			}

			return this.reloadMovement(
				record.organizationId,
				record.movementId,
				"Posted stock movement missing after write",
			);
		} catch (error) {
			const message = writeErrorMessage(error);
			if (/division by zero/i.test(message)) {
				return fail(
					"CONFLICT",
					"Insufficient available stock for movement post",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (isUniqueViolation(error)) {
				return fail("CONFLICT", "Stock movement post conflict");
			}
			return failFromUnknown(error, "Failed to post stock movement");
		}
	}

	async cancelMovement(
		record: MovementCancelRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const movementResult = await this.getMovementById(
			record.organizationId,
			record.movementId,
		);
		if (!movementResult.ok) {
			return movementResult;
		}
		if (movementResult.data === null) {
			return movementNotFound();
		}

		const movement = movementResult.data;
		if (movement.status === "cancelled") {
			if (movement.cancelIdempotencyKey === record.cancelIdempotencyKey) {
				return ok(movement);
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

		const nextVersion = movement.version + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("status", movement.status, "cancelled");
		const oldValueJson = valueSnapshotJson({
			status: movement.status,
			version: movement.version,
		});
		const newValueJson = valueSnapshotJson({
			status: "cancelled",
			version: nextVersion,
		});
		const payloadJson = json({
			organizationId: record.organizationId,
			entityType: "stock_movement",
			entityId: movement.id,
			code: movement.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
			movementType: movement.movementType,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE stock_movement
						SET status = 'cancelled',
							cancel_idempotency_key = ${record.cancelIdempotencyKey},
							cancelled_at = now(),
							cancelled_by = ${record.actorUserId},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.movementId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
							AND version = ${record.expectedVersion}
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, ${record.organizationId}, ${record.actorUserId}, ${meta.correlationId},
							'inventory', 'stock_movement', ${record.movementId}, 'UPDATE',
							${changesJson}::jsonb, ${oldValueJson}::jsonb, ${newValueJson}::jsonb
						WHERE EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, ${record.organizationId}, 'inventory.movement.cancelled.v1', 'inventory',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						WHERE EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					)
					SELECT id FROM mutated
				`,
			]);
			if (rows[0] === undefined) {
				const reloaded = await this.getMovementById(
					record.organizationId,
					record.movementId,
				);
				if (!reloaded.ok) {
					return reloaded;
				}
				if (
					reloaded.data !== null &&
					reloaded.data.status === "cancelled" &&
					reloaded.data.cancelIdempotencyKey === record.cancelIdempotencyKey
				) {
					return ok(reloaded.data);
				}
				return fail(
					"CONFLICT",
					"Stock movement version conflict",
					inventoryErrorDetails(INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT),
				);
			}
			return this.reloadMovement(
				record.organizationId,
				record.movementId,
				"Cancelled stock movement missing after write",
			);
		} catch (error) {
			if (isUniqueViolation(error)) {
				return fail("CONFLICT", "Stock movement cancel conflict");
			}
			return failFromUnknown(error, "Failed to cancel stock movement");
		}
	}

	async reserveStock(
		record: ReservationCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockReservation>> {
		const existing = await this.getReservationByCreateIdempotencyKey(
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return ok(existing.data);
		}

		const quantity = parseQuantity(record.quantity);
		if (quantity <= 0) {
			return fail("BAD_REQUEST", "Reservation quantity must be positive");
		}

		const effects: BalanceEffect[] = [
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
		];
		const balanceCheck = await this.validateBalanceEffects(
			record.organizationId,
			effects,
		);
		if (!balanceCheck.ok) {
			return balanceCheck;
		}

		const reservationId = randomUUID();
		const balanceId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const reservedDelta = formatQuantity(quantity);
		const availableDelta = formatQuantity(-quantity);
		const snapshotJson = valueSnapshotJson({
			code: record.code,
			status: "active",
			warehouseId: record.warehouseId,
			itemId: record.itemId,
			quantity: record.quantity,
		});
		const changesJson = fieldChangeJson("code", null, record.code);
		const payloadJson = json({
			organizationId: record.organizationId,
			entityType: "stock_reservation",
			entityId: reservationId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
			warehouseId: record.warehouseId,
			itemId: record.itemId,
			quantity: record.quantity,
		});

		try {
			const resultSets = await runNeonHttpTransaction<unknown[][]>((sql) => [
				sql`
					WITH upserted AS (
						INSERT INTO stock_balance (
							id, organization_id, warehouse_id, warehouse_code, item_id, item_code,
							base_uom_id, base_uom_code,
							on_hand, reserved, available, version, updated_by
						)
						SELECT
							${balanceId}, ${record.organizationId}, ${record.warehouseId}, ${record.warehouseCode},
							${record.itemId}, ${record.itemCode},
							${record.baseUomId}, ${record.baseUomCode},
							0, CAST(${reservedDelta} AS numeric(24, 12)), CAST(${availableDelta} AS numeric(24, 12)),
							1, ${record.createdBy}
						WHERE 0 >= 0
							AND CAST(${reservedDelta} AS numeric(24, 12)) >= 0
							AND CAST(${availableDelta} AS numeric(24, 12)) >= 0
						ON CONFLICT (organization_id, warehouse_id, item_id)
						DO UPDATE SET
							reserved = stock_balance.reserved + CAST(${reservedDelta} AS numeric(24, 12)),
							available = stock_balance.available + CAST(${availableDelta} AS numeric(24, 12)),
							warehouse_code = EXCLUDED.warehouse_code,
							item_code = EXCLUDED.item_code,
							base_uom_id = COALESCE(EXCLUDED.base_uom_id, stock_balance.base_uom_id),
							base_uom_code = COALESCE(EXCLUDED.base_uom_code, stock_balance.base_uom_code),
							version = stock_balance.version + 1,
							updated_by = EXCLUDED.updated_by,
							updated_at = now()
						WHERE stock_balance.reserved + CAST(${reservedDelta} AS numeric(24, 12)) >= 0
							AND stock_balance.available + CAST(${availableDelta} AS numeric(24, 12)) >= 0
						RETURNING id
					)
					SELECT CASE
						WHEN EXISTS (SELECT 1 FROM upserted)
							THEN (SELECT id FROM upserted LIMIT 1)
						ELSE (SELECT (1 / 0)::uuid)
					END AS id
				`,
				sql`
					WITH created AS (
						INSERT INTO stock_reservation (
							id, organization_id, code, normalized_code, status,
							warehouse_id, warehouse_code, warehouse_name,
							item_id, item_code, item_name, base_uom_id, base_uom_code,
							quantity, consumed_quantity,
							create_idempotency_key, release_idempotency_key,
							version, created_by, updated_by
						) VALUES (
							${reservationId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode}, 'active',
							${record.warehouseId}, ${record.warehouseCode}, ${record.warehouseName},
							${record.itemId}, ${record.itemCode}, ${record.itemName}, ${record.baseUomId}, ${record.baseUomCode},
							${record.quantity}, 0,
							${record.createIdempotencyKey}, null,
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, ${record.organizationId}, ${record.createdBy}, ${meta.correlationId},
							'inventory', 'stock_reservation', ${reservationId}, 'CREATE',
							${changesJson}::jsonb, ${snapshotJson}::jsonb
						WHERE EXISTS (SELECT 1 FROM created)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, ${record.organizationId}, 'inventory.stock.reserved.v1', 'inventory',
							${meta.correlationId}, ${record.createdBy}, ${payloadJson}::jsonb, 'pending', 0
						WHERE EXISTS (SELECT 1 FROM created)
						RETURNING id
					)
					SELECT id FROM created
				`,
			]);
			const createdRows = resultSets[1];
			if (!Array.isArray(createdRows) || createdRows[0] === undefined) {
				return fail("INTERNAL_ERROR", "Stock reservation create returned no row");
			}
			return this.reloadReservation(
				record.organizationId,
				reservationId,
				"Created stock reservation missing after write",
			);
		} catch (error) {
			if (isReservationCreateIdempotencyConflict(error)) {
				const replay = await this.getReservationByCreateIdempotencyKey(
					record.organizationId,
					record.createIdempotencyKey,
				);
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					return ok(replay.data);
				}
			}
			const message = writeErrorMessage(error);
			if (/division by zero/i.test(message)) {
				return fail(
					"CONFLICT",
					"Insufficient available stock",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (isUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Stock reservation code already exists",
					inventoryErrorDetails(INVENTORY_ERROR_CODE_CONFLICT),
				);
			}
			return failFromUnknown(error, "Failed to reserve stock");
		}
	}

	async releaseReservation(
		record: ReservationReleaseRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockReservation>> {
		const reservationResult = await this.getReservationById(
			record.organizationId,
			record.reservationId,
		);
		if (!reservationResult.ok) {
			return reservationResult;
		}
		if (reservationResult.data === null) {
			return reservationNotFound();
		}

		const reservation = reservationResult.data;
		if (reservation.status === record.terminalStatus) {
			if (reservation.releaseIdempotencyKey === record.releaseIdempotencyKey) {
				return ok(reservation);
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

		const effects: BalanceEffect[] =
			remainingQuantity === 0
				? []
				: [
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
					];
		const balanceCheck = await this.validateBalanceEffects(
			record.organizationId,
			effects,
		);
		if (!balanceCheck.ok) {
			return balanceCheck;
		}

		const nextVersion = reservation.version + 1;
		const balanceId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const releasedDelta = formatQuantity(-remainingQuantity);
		const availableDelta = formatQuantity(remainingQuantity);
		const eventType = reservationTerminalEventType(record.terminalStatus);
		const changesJson = fieldChangeJson(
			"status",
			reservation.status,
			record.terminalStatus,
		);
		const oldValueJson = valueSnapshotJson({
			status: reservation.status,
			version: reservation.version,
		});
		const newValueJson = valueSnapshotJson({
			status: record.terminalStatus,
			version: nextVersion,
		});
		const payloadJson = json({
			organizationId: record.organizationId,
			entityType: "stock_reservation",
			entityId: reservation.id,
			code: reservation.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
			warehouseId: reservation.warehouseId,
			itemId: reservation.itemId,
			quantity: formatQuantity(remainingQuantity),
		});

		try {
			const resultSets = await runNeonHttpTransaction<unknown[][]>((sql) => {
				const statements =
					remainingQuantity > 0
						? [
								sql`
						WITH upserted AS (
							INSERT INTO stock_balance (
								id, organization_id, warehouse_id, warehouse_code, item_id, item_code,
								base_uom_id, base_uom_code,
								on_hand, reserved, available, version, updated_by
							)
							SELECT
								${balanceId}, ${record.organizationId}, ${reservation.warehouseId}, ${reservation.warehouseCode},
								${reservation.itemId}, ${reservation.itemCode},
								${reservation.baseUomId}, ${reservation.baseUomCode},
								0, CAST(${releasedDelta} AS numeric(24, 12)), CAST(${availableDelta} AS numeric(24, 12)),
								1, ${record.actorUserId}
							WHERE 0 >= 0
								AND CAST(${releasedDelta} AS numeric(24, 12)) >= 0
								AND CAST(${availableDelta} AS numeric(24, 12)) >= 0
							ON CONFLICT (organization_id, warehouse_id, item_id)
							DO UPDATE SET
								reserved = stock_balance.reserved + CAST(${releasedDelta} AS numeric(24, 12)),
								available = stock_balance.available + CAST(${availableDelta} AS numeric(24, 12)),
								warehouse_code = EXCLUDED.warehouse_code,
								item_code = EXCLUDED.item_code,
								base_uom_id = COALESCE(EXCLUDED.base_uom_id, stock_balance.base_uom_id),
								base_uom_code = COALESCE(EXCLUDED.base_uom_code, stock_balance.base_uom_code),
								version = stock_balance.version + 1,
								updated_by = EXCLUDED.updated_by,
								updated_at = now()
							WHERE stock_balance.reserved + CAST(${releasedDelta} AS numeric(24, 12)) >= 0
								AND stock_balance.available + CAST(${availableDelta} AS numeric(24, 12)) >= 0
							RETURNING id
						)
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM upserted)
								THEN (SELECT id FROM upserted LIMIT 1)
							ELSE (SELECT (1 / 0)::uuid)
						END AS id
					`,
							]
						: [];
				statements.push(sql`
					WITH mutated AS (
						UPDATE stock_reservation
						SET status = ${record.terminalStatus},
							release_idempotency_key = ${record.releaseIdempotencyKey},
							released_at = now(),
							released_by = ${record.actorUserId},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.reservationId}
							AND organization_id = ${record.organizationId}
							AND status IN ('active', 'partially_consumed')
							AND version = ${record.expectedVersion}
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, ${record.organizationId}, ${record.actorUserId}, ${meta.correlationId},
							'inventory', 'stock_reservation', ${record.reservationId}, 'UPDATE',
							${changesJson}::jsonb, ${oldValueJson}::jsonb, ${newValueJson}::jsonb
						WHERE EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, ${record.organizationId}, ${eventType}, 'inventory',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						WHERE EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					)
					SELECT id FROM mutated
				`);
				return statements;
			});
			const last = resultSets[resultSets.length - 1];
			if (!Array.isArray(last) || last[0] === undefined) {
				const reloaded = await this.getReservationById(
					record.organizationId,
					record.reservationId,
				);
				if (!reloaded.ok) {
					return reloaded;
				}
				if (
					reloaded.data !== null &&
					reloaded.data.status === record.terminalStatus &&
					reloaded.data.releaseIdempotencyKey === record.releaseIdempotencyKey
				) {
					return ok(reloaded.data);
				}
				return fail(
					"CONFLICT",
					"Stock reservation version conflict",
					inventoryErrorDetails(INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT),
				);
			}

			return this.reloadReservation(
				record.organizationId,
				record.reservationId,
				"Terminated stock reservation missing after write",
			);
		} catch (error) {
			const message = writeErrorMessage(error);
			if (/division by zero/i.test(message)) {
				return fail(
					"CONFLICT",
					"Insufficient reserved stock",
					inventoryErrorDetails(INVENTORY_ERROR_INSUFFICIENT_AVAILABLE),
				);
			}
			if (isUniqueViolation(error)) {
				return fail("CONFLICT", "Stock reservation release conflict");
			}
			return failFromUnknown(error, "Failed to release stock reservation");
		}
	}

	async getMovementById(
		organizationId: string,
		id: string,
	): Promise<Result<StockMovement | null>> {
		try {
			const [header] = await db
				.select()
				.from(stockMovement)
				.where(
					and(
						eq(stockMovement.organizationId, organizationId),
						eq(stockMovement.id, id),
					),
				)
				.limit(1);
			if (header === undefined) {
				return ok(null);
			}
			return this.loadMovementByHeader(header);
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock movement");
		}
	}

	async getMovementByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockMovement | null>> {
		try {
			const [header] = await db
				.select()
				.from(stockMovement)
				.where(
					and(
						eq(stockMovement.organizationId, organizationId),
						eq(stockMovement.createIdempotencyKey, createIdempotencyKey),
					),
				)
				.limit(1);
			if (header === undefined) {
				return ok(null);
			}
			return this.loadMovementByHeader(header);
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load stock movement by create idempotency key",
			);
		}
	}

	async listMovements(
		filter: MovementListFilter,
	): Promise<Result<StockMovement[]>> {
		try {
			const conditions = [eq(stockMovement.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(stockMovement.status, filter.status));
			}
			if (filter.movementType !== undefined) {
				conditions.push(eq(stockMovement.movementType, filter.movementType));
			}
			const headers = await db
				.select()
				.from(stockMovement)
				.where(and(...conditions))
				.orderBy(desc(stockMovement.updatedAt), desc(stockMovement.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) {
				return ok([]);
			}

			const movementIds = headers.map((header) => header.id);
			const lines = await db
				.select()
				.from(stockMovementLine)
				.where(
					and(
						eq(stockMovementLine.organizationId, filter.organizationId),
						inArray(stockMovementLine.movementId, movementIds),
					),
				)
				.orderBy(asc(stockMovementLine.lineNo), asc(stockMovementLine.id));

			const linesByMovementId = new Map<string, StockMovementLine[]>();
			for (const line of lines) {
				const mapped = mapLineFromSelect(line);
				const bucket = linesByMovementId.get(line.movementId);
				if (bucket === undefined) {
					linesByMovementId.set(line.movementId, [mapped]);
				} else {
					bucket.push(mapped);
				}
			}

			return ok(
				headers.map((header) =>
					mapMovement(
						mapHeaderRow(header),
						linesByMovementId.get(header.id) ?? [],
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list stock movements");
		}
	}

	async listReservations(
		filter: ReservationListFilter,
	): Promise<Result<StockReservation[]>> {
		try {
			const conditions = [
				eq(stockReservation.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				conditions.push(eq(stockReservation.status, filter.status));
			}
			if (filter.warehouseId !== undefined) {
				conditions.push(eq(stockReservation.warehouseId, filter.warehouseId));
			}
			if (filter.itemId !== undefined) {
				conditions.push(eq(stockReservation.itemId, filter.itemId));
			}
			const rows = await db
				.select()
				.from(stockReservation)
				.where(and(...conditions))
				.orderBy(
					desc(stockReservation.updatedAt),
					desc(stockReservation.id),
				)
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map((row) => mapReservation(row)));
		} catch (error) {
			return failFromUnknown(error, "Failed to list stock reservations");
		}
	}

	async getAvailability(
		filter: AvailabilityFilter,
	): Promise<Result<StockAvailability[]>> {
		try {
			const sequenceResult = await this.getLatestLedgerSequence(filter.organizationId);
			if (!sequenceResult.ok) {
				return sequenceResult;
			}
			const conditions = [eq(stockBalance.organizationId, filter.organizationId)];
			if (filter.warehouseId !== undefined) {
				conditions.push(eq(stockBalance.warehouseId, filter.warehouseId));
			}
			if (filter.itemId !== undefined) {
				conditions.push(eq(stockBalance.itemId, filter.itemId));
			}
			const rows = await db
				.select()
				.from(stockBalance)
				.where(and(...conditions))
				.orderBy(asc(stockBalance.warehouseCode), asc(stockBalance.itemCode));
			return ok(
				rows.map((row) => ({
					organizationId: row.organizationId,
					warehouseId: row.warehouseId,
					warehouseCode: row.warehouseCode,
					itemId: row.itemId,
					itemCode: row.itemCode,
					baseUomId: row.baseUomId,
					baseUomCode: row.baseUomCode,
					onHandQuantity: row.onHand,
					reservedQuantity: row.reserved,
					availableQuantity: row.available,
					asOfLedgerSequence: sequenceResult.data,
					balanceVersion: row.version,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock availability");
		}
	}

	async getReservationById(
		organizationId: string,
		id: string,
	): Promise<Result<StockReservation | null>> {
		try {
			const [row] = await db
				.select()
				.from(stockReservation)
				.where(
					and(
						eq(stockReservation.organizationId, organizationId),
						eq(stockReservation.id, id),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapReservation(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock reservation");
		}
	}

	async getReservationByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<StockReservation | null>> {
		try {
			const [row] = await db
				.select()
				.from(stockReservation)
				.where(
					and(
						eq(stockReservation.organizationId, organizationId),
						eq(stockReservation.createIdempotencyKey, createIdempotencyKey),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapReservation(row));
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load stock reservation by create idempotency key",
			);
		}
	}

	async getLedgerSequence(organizationId: string): Promise<Result<number>> {
		return this.getLatestLedgerSequence(organizationId);
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
		try {
			const rows = await db
				.select()
				.from(stockLedgerEntry)
				.where(eq(stockLedgerEntry.organizationId, organizationId))
				.orderBy(asc(stockLedgerEntry.ledgerSequence), asc(stockLedgerEntry.id));
			return ok(
				rows.map((row) => ({
					warehouseId: row.warehouseId,
					itemId: row.itemId,
					quantityDelta: row.quantityDelta,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list stock ledger entries");
		}
	}

	async listBalances(organizationId: string): Promise<Result<StockBalance[]>> {
		try {
			const rows = await db
				.select()
				.from(stockBalance)
				.where(eq(stockBalance.organizationId, organizationId))
				.orderBy(asc(stockBalance.warehouseCode), asc(stockBalance.itemCode));
			return ok(rows.map((row) => mapBalance(row)));
		} catch (error) {
			return failFromUnknown(error, "Failed to list stock balances");
		}
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
		try {
			const rows = await db
				.select()
				.from(stockReservation)
				.where(eq(stockReservation.organizationId, organizationId))
				.orderBy(
					asc(stockReservation.warehouseCode),
					asc(stockReservation.itemCode),
					asc(stockReservation.id),
				);
			return ok(
				rows
					.map((row) => mapReservation(row))
					.filter((reservation) =>
						isReleasableReservationStatus(reservation.status),
					)
					.map((reservation) => ({
						warehouseId: reservation.warehouseId,
						itemId: reservation.itemId,
						quantity: reservation.quantity,
						consumedQuantity: reservation.consumedQuantity,
					})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list active stock reservations");
		}
	}
}

export function createDrizzleInventoryStore(): DrizzleInventoryStore {
	return new DrizzleInventoryStore();
}
